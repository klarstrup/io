import { ObjectId, type WithId } from "mongodb";
import { Fragment } from "react";
import { auth } from "../../../../auth";
import { Modal } from "../../../../components/Modal";
import { isPRType, PRType } from "../../../../lib";
import { exercises } from "../../../../models/exercises";
import type { WorkoutData } from "../../../../models/workout";
import { getIsSetPR, Workouts } from "../../../../models/workout.server";
import { workoutFromFitocracyWorkout } from "../../../../sources/fitocracy";
import { FitocracyWorkouts } from "../../../../sources/fitocracy.server";
import { workoutFromRunDouble } from "../../../../sources/rundouble";
import { RunDoubleRuns } from "../../../../sources/rundouble.server";
import {
  TopLogger,
  workoutFromTopLoggerAscends,
} from "../../../../sources/toplogger";
import {
  TopLoggerAscends,
  TopLoggerClimbs,
  TopLoggerGyms,
  TopLoggerHolds,
} from "../../../../sources/toplogger.server";
import { dateToString } from "../../../../utils";
import WorkoutEntry from "../../WorkoutEntry";

export default async function DiaryExerciseModal(props: {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const exerciseId = Number((await props.params).exerciseId);

  const prTypeRaw = (await props.searchParams).prType;
  const prType = isPRType(prTypeRaw) ? prTypeRaw : null;

  const mergeWorkoutsRaw = (await props.searchParams).mergeWorkouts;
  const mergeWorkouts = mergeWorkoutsRaw === "true";

  const exercise = exercises.find((e) => e.id === exerciseId);
  const user = (await auth())?.user;
  if (!user || !exercise) return null;

  const workoutsWithExercise = await Workouts.find({
    "exercises.exerciseId": exerciseId,
    deletedAt: { $exists: false },
    userId: user.id,
  }).toArray();
  const fitocracyWorkoutsWithExercise = user.fitocracyUserId
    ? (
        await FitocracyWorkouts.find({
          user_id: user.fitocracyUserId,
          "root_group.children.exercise.exercise_id": exerciseId,
        }).toArray()
      ).map((w) => workoutFromFitocracyWorkout(w))
    : [];
  const rundoubleWorkouts =
    user.runDoubleId && exerciseId === 518
      ? (
          await RunDoubleRuns.find({
            userId: user.runDoubleId,
          }).toArray()
        ).map((w) => workoutFromRunDouble(w))
      : [];

  if (!user.topLoggerId) return;

  const toploggerWorkouts: WithId<WorkoutData>[] = [];

  if (exerciseId === 2001 && user.topLoggerId) {
    const [holds, gyms, ascends] = await Promise.all([
      TopLoggerHolds.find().toArray(),
      TopLoggerGyms.find().toArray(),
      TopLoggerAscends.find({ user_id: user.topLoggerId }).toArray(),
    ]);

    const climbs = await TopLoggerClimbs.find({
      id: { $in: ascends.map(({ climb_id }) => climb_id) },
    }).toArray();

    const ascendsByDay = Object.values(
      ascends.reduce(
        (acc, ascend) => {
          if (!ascend.date_logged) return acc;
          const date = dateToString(ascend.date_logged);

          if (!acc[date]) acc[date] = [];

          acc[date].push(ascend);

          return acc;
        },
        {} as Record<string, TopLogger.AscendSingle[]>,
      ),
    );

    for (const dayAscends of ascendsByDay) {
      toploggerWorkouts.push(
        workoutFromTopLoggerAscends(
          dayAscends.map((ascend) => ({
            ...ascend,
            climb: climbs.find(({ id }) => id === ascend.climb_id)!,
          })),
          holds,
          gyms,
        ),
      );
    }
  }

  let allWorkoutsOfExercise = [
    ...workoutsWithExercise,
    ...fitocracyWorkoutsWithExercise,
    ...rundoubleWorkouts,
    ...toploggerWorkouts,
  ]
    .map((workout) => ({
      ...workout,
      exercises: workout.exercises.filter((e) => e.exerciseId === exerciseId),
    }))
    .sort((a, b) => b.workedOutAt.getTime() - a.workedOutAt.getTime());

  if (mergeWorkouts) {
    allWorkoutsOfExercise = [
      allWorkoutsOfExercise.reduce(
        (acc: WithId<WorkoutData>, workout) => {
          for (const exercise of workout.exercises) {
            const existingExercise = acc.exercises.find(
              (e) => e.exerciseId === exercise.exerciseId,
            );

            if (existingExercise) {
              existingExercise.sets.push(...exercise.sets.reverse());
            } else {
              acc.exercises.push({
                ...exercise,
                sets: exercise.sets.reverse(),
              });
            }
          }

          return acc;
        },
        {
          _id: new ObjectId(),
          workedOutAt: new Date(),
          exercises: [],
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ),
    ] as const;
  }

  const workoutsExerciseSetPRs: Record<string, Record<PRType, boolean>[][]> =
    {};

  for (const workout of allWorkoutsOfExercise) {
    if (!workoutsExerciseSetPRs[workout._id.toString()]) {
      workoutsExerciseSetPRs[workout._id.toString()] = [];
    }

    const precedingWorkouts = allWorkoutsOfExercise.filter(
      (w) => w.workedOutAt < workout.workedOutAt,
    );

    const exerciseSetsPRs: Record<PRType, boolean>[] = [];
    for (const set of workout.exercises.find((e) => e.exerciseId === exerciseId)
      ?.sets ?? []) {
      exerciseSetsPRs.push(
        getIsSetPR(
          workout.workedOutAt,
          workout,
          precedingWorkouts,
          exerciseId,
          set,
        ),
      );
    }
    workoutsExerciseSetPRs[workout._id.toString()]!.push(exerciseSetsPRs);
  }

  return (
    <Modal className="w-full">
      <div className="h-full w-full overflow-y-auto overscroll-contain rounded-xl bg-white p-4 shadow-xl shadow-black/50">
        <h1 className="text-2xl font-semibold">{exercise.name}</h1>
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
          <form method="GET" className="flex gap-2">
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
        <ul
          style={{
            display: "grid",
            gap: "8px 4px",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          {allWorkoutsOfExercise
            .filter((workout) => {
              if (!prType) return true;

              const PRs = workoutsExerciseSetPRs?.[workout._id.toString()];
              if (!PRs) return false;

              return PRs.some((sets) => sets.some((set) => set[prType]));
            })
            .map((workout) => (
              <li key={String(workout._id)} className="min-h-full">
                <WorkoutEntry
                  showExerciseName={false}
                  exerciseSetPRs={
                    workoutsExerciseSetPRs?.[workout._id.toString()]
                  }
                  onlyPRs={prType || undefined}
                  showDate={!mergeWorkouts}
                  workout={{ ...workout, _id: String(workout._id) }}
                />
              </li>
            ))}
        </ul>
      </div>
    </Modal>
  );
}
