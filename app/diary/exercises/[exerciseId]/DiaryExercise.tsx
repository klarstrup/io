import { startOfYear, subMonths, subYears } from "date-fns";
import { Fragment, Suspense } from "react";
import { auth } from "../../../../auth";
import { GQWorkout } from "../../../../graphql.generated";
import { ExerciseHistoryTimeframe, PRType } from "../../../../lib";
import { exercisesById } from "../../../../models/exercises";
import { Locations } from "../../../../models/location.server";
import { isClimbingExercise } from "../../../../models/workout";
import {
  getIsSetPR,
  MaterializedWorkoutsView,
  mergeWorkoutsOfExercise,
} from "../../../../models/workout.server";
import WorkoutEntry from "../../WorkoutEntry";
import BoulderingGraph from "./BoulderingGraph";
import DiaryExerciseGraph from "./DiaryExerciseGraph";

export default async function DiaryExercise({
  exerciseId,
  prType,
  mergeWorkouts,
  timeframe = ExerciseHistoryTimeframe.Past3Months,
}: {
  exerciseId: number;
  prType?: PRType;
  mergeWorkouts?: boolean;
  timeframe?: ExerciseHistoryTimeframe;
}) {
  const exercise = exercisesById.get(exerciseId)!;
  const user = (await auth())?.user;

  return (
    <>
      <h1 className="text-2xl font-semibold">
        <span className="text-gray-300">Exercise:</span> {exercise.name}
      </h1>
      <p className="text-gray-500">
        {exercise.instructions.map((instruction, i) => (
          <Fragment key={i}>
            {instruction.value}
            {i < exercise.instructions.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <h2 className="text-xl font-semibold">Workouts</h2>
        <form method="GET" className="flex flex-wrap gap-2">
          <select
            className="rounded-md bg-gray-100 p-1"
            name="prType"
            defaultValue={prType || ""}
          >
            <option value="">All workouts</option>
            <option value={PRType.AllTime}>All Time PR workouts</option>
            <option value={PRType.OneYear}>Year PR workouts</option>
            <option value={PRType.ThreeMonths}>3 Month PR workouts</option>
          </select>
          <select
            className="rounded-md bg-gray-100 p-1"
            name="timeframe"
            defaultValue={timeframe || ""}
          >
            <option value="all-time">All time</option>
            <option value="this-year">This year</option>
            <option value="past-year">Past year</option>
            <option value="past-3-months">Past 3 months</option>
            <option value="past-month">Past month</option>
          </select>
          <label>
            <input
              type="checkbox"
              name="mergeWorkouts"
              value="true"
              defaultChecked={mergeWorkouts}
            />{" "}
            Merge workouts
          </label>
          <button type="submit" className="rounded-md bg-gray-100 px-2">
            Filter
          </button>
        </form>
      </div>
      {user ? (
        <Suspense>
          <DiaryExerciseList
            userId={user.id}
            exerciseId={exerciseId}
            prType={prType}
            timeframe={timeframe}
            mergeWorkouts={mergeWorkouts}
          />
        </Suspense>
      ) : null}
    </>
  );
}

async function DiaryExerciseList({
  userId,
  exerciseId,
  prType,
  mergeWorkouts,
  timeframe,
}: {
  userId: string;
  exerciseId: number;
  prType?: PRType;
  mergeWorkouts?: boolean;
  timeframe?: ExerciseHistoryTimeframe;
}) {
  const now = new Date();
  let workedOutAtFilter: Date | undefined;
  if (timeframe === undefined) {
    workedOutAtFilter = undefined;
  } else if (timeframe === ExerciseHistoryTimeframe.ThisYear) {
    workedOutAtFilter = startOfYear(now);
  } else if (timeframe === ExerciseHistoryTimeframe.PastYear) {
    workedOutAtFilter = subYears(now, 1);
  } else if (timeframe === ExerciseHistoryTimeframe.Past6Months) {
    workedOutAtFilter = subMonths(now, 6);
  } else if (timeframe === ExerciseHistoryTimeframe.Past3Months) {
    workedOutAtFilter = subMonths(now, 3);
  } else if (timeframe === ExerciseHistoryTimeframe.PastMonth) {
    workedOutAtFilter = subMonths(now, 1);
  } else if (timeframe === ExerciseHistoryTimeframe.AllTime) {
    workedOutAtFilter = undefined;
  } else {
    timeframe satisfies never;
  }

  let allWorkoutsOfExercise = userId
    ? (
        await MaterializedWorkoutsView.find(
          {
            userId,
            "exercises.exerciseId": exerciseId,
            deletedAt: { $exists: false },
            ...(workedOutAtFilter
              ? { workedOutAt: { $gte: workedOutAtFilter } }
              : undefined),
          },
          { sort: { workedOutAt: -1 } },
        ).toArray()
      ).map((workout) => ({
        ...workout,
        exercises: workout.exercises.filter((e) => e.exerciseId === exerciseId),
      }))
    : [];
  const locations = userId
    ? await Locations.find({ userId }, { sort: { name: 1 } }).toArray()
    : [];

  if (userId && mergeWorkouts) {
    allWorkoutsOfExercise = [
      mergeWorkoutsOfExercise(allWorkoutsOfExercise, userId, locations),
    ];
  }

  const workoutsExerciseSetPRs: Record<string, Record<PRType, boolean>[][]> =
    {};

  if (!isClimbingExercise(exerciseId) || prType) {
    for (const workout of allWorkoutsOfExercise) {
      if (!workoutsExerciseSetPRs[workout.id]) {
        workoutsExerciseSetPRs[workout.id] = [];
      }

      const precedingWorkouts = allWorkoutsOfExercise.filter(
        (w) => w.workedOutAt < workout.workedOutAt,
      );

      const exerciseSetsPRs: Record<PRType, boolean>[] = [];
      for (const set of workout.exercises.find(
        (e) => e.exerciseId === exerciseId,
      )?.sets ?? []) {
        exerciseSetsPRs.push(
          getIsSetPR(workout, precedingWorkouts, exerciseId, set),
        );
      }
      workoutsExerciseSetPRs[workout.id]!.push(exerciseSetsPRs);
    }
  }
  return (
    <>
      {userId && exerciseId === 2001 ? (
        <Suspense fallback={<DiaryExerciseGraph data={[]} />}>
          <BoulderingGraph
            allWorkoutsOfExercise={allWorkoutsOfExercise}
            userId={userId}
          />
        </Suspense>
      ) : null}
      <ul
        style={{
          display: "grid",
          gap: "8px 4px",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {allWorkoutsOfExercise
          .filter((workout) => {
            if (!prType) return true;

            const PRs = workoutsExerciseSetPRs?.[workout.id];
            if (!PRs) return false;

            return PRs.some((sets) => sets.some((set) => set[prType]));
          })
          .map((workout) => (
            <li key={workout.id} className="min-h-full">
              <WorkoutEntry
                showExerciseName={false}
                exerciseSetPRs={workoutsExerciseSetPRs?.[workout.id]}
                onlyPRs={prType || undefined}
                showDate={!mergeWorkouts}
                workout={workout as unknown as GQWorkout}
              />
            </li>
          ))}
      </ul>
    </>
  );
}
