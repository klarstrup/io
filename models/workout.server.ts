import { isAfter } from "date-fns";
import type { Session } from "next-auth";
import { getDB } from "../dbConnect";
import {
  exerciseIdsThatICareAbout,
  Fitocracy,
  workoutFromFitocracyWorkout,
} from "../sources/fitocracy";
import { proxyCollection } from "../utils.server";
import { exercises, InputType } from "./exercises";
import type { WorkoutData } from "./workout";

export const Workouts = proxyCollection<WorkoutData>("workouts");

export async function getNextSets({
  user,
  to,
}: {
  user: Session["user"];
  to: Date;
}) {
  const DB = await getDB();
  const fitocracyWorkoutsCollection =
    DB.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  return (
    await Promise.all(
      exerciseIdsThatICareAbout.map(async (id) => {
        const workout = await Workouts.findOne(
          {
            userId: user.id,
            "exercises.exerciseId": id,
            deletedAt: { $exists: false },
            workedOutAt: { $lte: to },
          },
          { sort: { workedOutAt: -1 } },
        );

        const fitWorkout = user.fitocracyUserId
          ? await fitocracyWorkoutsCollection.findOne(
              {
                user_id: user.fitocracyUserId,
                "root_group.children.exercise.exercise_id": id,
                workout_timestamp: { $lte: to },
              },
              { sort: { workout_timestamp: -1 } },
            )
          : null;
        const fitocracyWorkout =
          fitWorkout && workoutFromFitocracyWorkout(fitWorkout);

        const recentmostWorkout =
          workout && fitocracyWorkout
            ? isAfter(workout.workedOutAt, fitocracyWorkout.workedOutAt)
              ? workout
              : fitocracyWorkout
            : (workout ?? fitocracyWorkout ?? null);

        return [id, recentmostWorkout] as const;
      }),
    )
  )
    .map(([id, workout]) => {
      if (!workout) return null;

      const exercise = workout.exercises.find(
        ({ exerciseId }) => exerciseId === id,
      )!;
      const exerciseDefinition = exercises.find((ex) => ex.id === id)!;
      const exerciseWeightInputIndex = exerciseDefinition.inputs.findIndex(
        ({ type }) => type === InputType.Weight,
      );
      const exerciseRepsInputIndex = exerciseDefinition.inputs.findIndex(
        ({ type }) => type === InputType.Reps,
      );
      const heaviestSet = exercise.sets.reduce((acc, set) => {
        const setWeight = set.inputs[exerciseWeightInputIndex]!.value;
        const accWeight = acc?.inputs[exerciseWeightInputIndex]!.value;
        return setWeight && accWeight && setWeight > accWeight ? set : acc;
      }, exercise.sets[0]);

      const workingSets = exercise.sets.filter(
        (set) =>
          set.inputs[exerciseWeightInputIndex]!.value ===
          heaviestSet?.inputs[exerciseWeightInputIndex]!.value,
      );

      let successful = true;
      if (
        workingSets.length >= 3 ||
        (exercise.exerciseId === 3 && workingSets.length >= 1)
      ) {
        if (
          workingSets.every(
            (sets) => sets.inputs[exerciseRepsInputIndex]!.value < 5,
          )
        ) {
          successful = false;
        }
      } else {
        successful = false;
      }

      const goalWeight = successful
        ? ([1, 183, 532].includes(exercise.exerciseId) ? 1.25 : 2.5) +
          (heaviestSet?.inputs[exerciseWeightInputIndex]?.value || 0)
        : 0.9 * (heaviestSet?.inputs[exerciseWeightInputIndex]?.value || 0);

      return {
        workedOutAt: workout.workedOutAt,
        exerciseId: exercise.exerciseId,
        successful,
        nextWorkingSets: exercise.exerciseId === 3 ? 1 : 3,
        nextWorkingSetsReps: 5,
        nextWorkingSetsWeight:
          String(goalWeight).endsWith(".25") ||
          String(goalWeight).endsWith(".75")
            ? String(goalWeight).endsWith("2.25") ||
              String(goalWeight).endsWith("4.75")
              ? goalWeight + 0.25
              : goalWeight - 0.25
            : goalWeight,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.workedOutAt.getTime() - b.workedOutAt.getTime());
}
