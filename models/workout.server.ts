import { isAfter } from "date-fns";
import type { Session } from "next-auth";
import {
  exerciseIdsThatICareAbout,
  workoutFromFitocracyWorkout,
} from "../sources/fitocracy";
import { FitocracyWorkouts } from "../sources/fitocracy.server";
import { proxyCollection } from "../utils.server";
import { exercises, InputType } from "./exercises";
import type { WorkoutData } from "./workout";

export const Workouts = proxyCollection<WorkoutData>("workouts");

const DEADLIFT_ID = 3;
const WORKING_SET_REPS = 5;
const WORKING_SETS = 3;
const WORKING_SETS_FOR_DEADLIFT = 1;
const WEIGHT_INCREMENT = 1.25;
const WEIGHT_INCREMENT_FOR_LEGS = 2.5;
const FAILURE_DELOAD_FACTOR = 0.9;

export async function getNextSets({
  user,
  to,
}: {
  user: Session["user"];
  to: Date;
}) {
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
          ? await FitocracyWorkouts.findOne(
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
      const weightInputIndex = exerciseDefinition.inputs.findIndex(
        ({ type }) => type === InputType.Weight,
      );
      const repsInputIndex = exerciseDefinition.inputs.findIndex(
        ({ type }) => type === InputType.Reps,
      );
      const heaviestSet = exercise.sets.reduce((acc, set) => {
        const setReps = set.inputs[repsInputIndex]!.value;
        const setWeight = set.inputs[weightInputIndex]!.value;
        const accWeight = acc?.inputs[weightInputIndex]!.value;
        return setWeight &&
          accWeight &&
          setWeight > accWeight &&
          setReps >= WORKING_SET_REPS
          ? set
          : acc;
      }, exercise.sets[0]);

      const workingSets = exercise.sets.filter(
        (set) =>
          set.inputs[weightInputIndex]!.value ===
          heaviestSet?.inputs[weightInputIndex]!.value,
      );

      const successful =
        (workingSets.length >= WORKING_SETS ||
          (exercise.exerciseId === DEADLIFT_ID &&
            workingSets.length >= WORKING_SETS_FOR_DEADLIFT)) &&
        workingSets.every(
          (sets) => sets.inputs[repsInputIndex]!.value >= WORKING_SET_REPS,
        );
      const goalWeight = successful
        ? ([1, 183, 532].includes(exercise.exerciseId)
            ? WEIGHT_INCREMENT
            : WEIGHT_INCREMENT_FOR_LEGS) +
          (heaviestSet?.inputs[weightInputIndex]?.value || 0)
        : FAILURE_DELOAD_FACTOR *
          (heaviestSet?.inputs[weightInputIndex]?.value || 0);

      return {
        workedOutAt: workout.workedOutAt,
        exerciseId: exercise.exerciseId,
        successful,
        nextWorkingSets: exercise.exerciseId === DEADLIFT_ID ? 1 : 3,
        nextWorkingSetsReps: WORKING_SET_REPS,
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
