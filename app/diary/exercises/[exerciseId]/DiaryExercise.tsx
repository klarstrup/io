import { ObjectId, type WithId } from "mongodb";
import { Fragment } from "react";
import { auth } from "../../../../auth";
import { PRType } from "../../../../lib";
import { exercises } from "../../../../models/exercises";
import type { WorkoutData } from "../../../../models/workout";
import { getAllWorkouts, getIsSetPR } from "../../../../models/workout.server";
import WorkoutEntry from "../../WorkoutEntry";

export default async function DiaryExercise({
  exerciseId,
  prType,
  mergeWorkouts,
}: {
  exerciseId: number;
  prType?: PRType;
  mergeWorkouts?: boolean;
}) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  const user = (await auth())?.user;
  if (!user || !exercise) return null;

  let allWorkoutsOfExercise = (await getAllWorkouts({ user, exerciseId }))
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
    <>
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
    </>
  );
}