import {
  eachWeekOfInterval,
  endOfISOWeek,
  endOfWeek,
  subMonths,
} from "date-fns";
import { ObjectId, type WithId } from "mongodb";
import { Fragment } from "react";
import { auth } from "../../../../auth";
import { PRType } from "../../../../lib";
import { exercisesById } from "../../../../models/exercises";
import { Locations } from "../../../../models/location.server";
import {
  getSetGrade,
  isClimbingExercise,
  type WorkoutData,
} from "../../../../models/workout";
import {
  calculate95thSendGradeOn,
  calculateFlashGradeOn,
  getIsSetPR,
  MaterializedWorkoutsView,
} from "../../../../models/workout.server";
import WorkoutEntry from "../../WorkoutEntry";
import DiaryExerciseGraph from "./DiaryExerciseGraph";

export default async function DiaryExercise({
  exerciseId,
  prType,
  mergeWorkouts,
}: {
  exerciseId: number;
  prType?: PRType;
  mergeWorkouts?: boolean;
}) {
  const exercise = exercisesById[exerciseId]!;
  const user = (await auth())?.user;

  let allWorkoutsOfExercise = user
    ? (
        await MaterializedWorkoutsView.find(
          {
            userId: user.id,
            "exercises.exerciseId": exercise.id,
            deletedAt: { $exists: false },
          },
          { sort: { workedOutAt: -1 } },
        ).toArray()
      ).map((workout) => ({
        ...workout,
        exercises: workout.exercises.filter((e) => e.exerciseId === exerciseId),
      }))
    : [];
  const [locations] = user
    ? await Promise.all([
        Locations.find({ userId: user.id }, { sort: { name: 1 } }).toArray(),
      ])
    : [];

  if (user && mergeWorkouts) {
    allWorkoutsOfExercise = [
      allWorkoutsOfExercise.reduce(
        (acc: WithId<WorkoutData>, workout) => {
          const location = workout.locationId
            ? locations?.find((l) => l._id.toString() === workout.locationId)
            : workout.location
              ? locations?.find((l) => l.name === workout.location)
              : undefined;

          for (const exercise of workout.exercises) {
            const existingExercise = acc.exercises.find(
              (e) => e.exerciseId === exercise.exerciseId,
            );

            let reversedSets = [...exercise.sets].reverse();

            if (exercise.exerciseId === 2001) {
              reversedSets = reversedSets.map((set) => ({
                ...set,
                inputs: set.inputs.map((input, index) =>
                  index === 0
                    ? {
                        ...input,
                        value: input.value ?? getSetGrade(set, location),
                      }
                    : input,
                ),
              }));
            }

            if (existingExercise) {
              existingExercise.sets.push(...reversedSets);
            } else {
              acc.exercises.push({ ...exercise, sets: reversedSets });
            }
          }

          return acc;
        },
        {
          _id: new ObjectId(),
          id: new ObjectId().toString(),
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
      {user && exerciseId === 2001 ? (
        <DiaryExerciseGraph
          data={[
            {
              id: "95% Flash Grade",
              data: await Promise.all(
                eachWeekOfInterval(
                  {
                    start: subMonths(new Date(), 14),
                    end: new Date(),
                  },
                  { weekStartsOn: 1 },
                ).map(async (date) => ({
                  x: endOfISOWeek(date),
                  y: await calculateFlashGradeOn(user.id, endOfISOWeek(date)),
                })),
              ),
            },
            {
              id: "95% Send Grade",
              data: await Promise.all(
                eachWeekOfInterval(
                  {
                    start: subMonths(new Date(), 14),
                    end: new Date(),
                  },
                  { weekStartsOn: 1 },
                ).map(async (date) => ({
                  x: endOfISOWeek(date),
                  y: await calculate95thSendGradeOn(
                    user.id,
                    endOfISOWeek(date),
                  ),
                })),
              ),
            },
          ]}
        />
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
                workout={workout}
              />
            </li>
          ))}
      </ul>
    </>
  );
}
