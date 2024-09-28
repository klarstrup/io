import { isAfter } from "date-fns";
import type { Session } from "next-auth";
import { getDB } from "../dbConnect";
import {
  exerciseIdsThatICareAbout,
  Fitocracy,
  workoutFromFitocracyWorkout,
} from "../sources/fitocracy";
import { exercises, InputType } from "./exercises";
import type { WorkoutData } from "./workout";

export async function getNextSets({ user }: { user: Session["user"] }) {
  const DB = await getDB();
  const workoutsCollection = DB.collection<WorkoutData>("workouts");
  const fitocracyWorkoutsCollection =
    DB.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  return (
    await Promise.all(
      exerciseIdsThatICareAbout.map(async (id) => {
        const workout = await workoutsCollection.findOne(
          {
            user_id: user.id,
            "exercises.exercise_id": id,
            deleted_at: { $exists: false },
          },
          { sort: { worked_out_at: -1 } }
        );

        const fitWorkout = user.fitocracyUserId
          ? await fitocracyWorkoutsCollection.findOne(
              {
                user_id: user.fitocracyUserId,
                "root_group.children.exercise.exercise_id": id,
              },
              { sort: { workout_timestamp: -1 } }
            )
          : null;
        const fitocracyWorkout =
          fitWorkout && workoutFromFitocracyWorkout(fitWorkout);

        const recentmostWorkout =
          workout && fitocracyWorkout
            ? isAfter(workout.worked_out_at, fitocracyWorkout.worked_out_at)
              ? workout
              : fitocracyWorkout
            : workout ?? fitocracyWorkout ?? null;

        return [id, recentmostWorkout] as const;
      })
    )
  )
    .map(([id, workout]) => {
      if (!workout) return null;

      const exercise = workout.exercises.find(
        ({ exercise_id }) => exercise_id === id
      )!;
      const exerciseDefinition = exercises.find((ex) => ex.id === id)!;
      const exerciseWeightInputIndex = exerciseDefinition.inputs.findIndex(
        ({ type }) => type === InputType.Weight
      );
      const exerciseRepsInputIndex = exerciseDefinition.inputs.findIndex(
        ({ type }) => type === InputType.Reps
      );
      const heaviestSet = exercise.sets.reduce((acc, set) => {
        const setWeight = set.inputs[exerciseWeightInputIndex]!.value;
        const accWeight = acc?.inputs[exerciseWeightInputIndex]!.value;
        return setWeight && accWeight && setWeight > accWeight ? set : acc;
      }, exercise.sets[0]);

      const workingSets = exercise.sets.filter(
        (set) =>
          set.inputs[exerciseWeightInputIndex]!.value ===
          heaviestSet?.inputs[exerciseWeightInputIndex]!.value
      );

      let successful = true;
      if (
        workingSets.length >= 3 ||
        (exercise.exercise_id === 3 && workingSets.length >= 1)
      ) {
        if (
          workingSets.every(
            (sets) => sets.inputs[exerciseRepsInputIndex]!.value < 5
          )
        ) {
          successful = false;
        }
      } else {
        successful = false;
      }

      const nextWorkingSet = successful
        ? ([1, 183, 532].includes(exercise.exercise_id) ? 1.25 : 2.5) +
          (heaviestSet?.inputs[exerciseWeightInputIndex]?.value || 0)
        : 0.9 * (heaviestSet?.inputs[exerciseWeightInputIndex]?.value || 0);

      return {
        workout_timestamp: workout.worked_out_at,
        exercise_id: exercise.exercise_id,
        successful,
        nextWorkingSet:
          String(nextWorkingSet).endsWith(".25") ||
          String(nextWorkingSet).endsWith(".75")
            ? nextWorkingSet - 0.25
            : nextWorkingSet,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => a.workout_timestamp.getTime() - b.workout_timestamp.getTime()
    );
}
