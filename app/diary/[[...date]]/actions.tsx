"use server";

import { ObjectId, type WithId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "../../../auth";
import { exercises, InputType } from "../../../models/exercises";
import type { WorkoutData, WorkoutExerciseSet } from "../../../models/workout";
import { Workouts } from "../../../models/workout.server";

export async function upsertWorkout(
  workout: (WorkoutData & { _id: string }) | WorkoutData,
) {
  const user = (await auth())?.user;
  if (!user || workout.userId !== user.id) throw new Error("Unauthorized");

  let _id: ObjectId;
  if ("_id" in workout) {
    const { _id: id, ...rest } = workout;
    _id = new ObjectId(id);
    await Workouts.updateOne({ _id }, { $set: rest });
  } else {
    const newWorkout = await Workouts.insertOne(workout);
    _id = newWorkout.insertedId;
  }

  revalidatePath("/diary");
  return String(_id);
}

export async function deleteWorkout(workoutId: string) {
  const user = (await auth())?.user;
  if (!user) throw new Error("Unauthorized");

  const result = await Workouts.updateOne(
    { _id: new ObjectId(workoutId) },
    { $set: { deletedAt: new Date() } },
  );
  revalidatePath("/diary");

  return result.modifiedCount;
}

const noPR = {
  isAllTimePR: false,
  isYearPR: false,
  is3MonthPR: false,
};
// eslint-disable-next-line @typescript-eslint/require-await -- server actions need to be async
export async function getIsSetPR(
  workout: WorkoutData,
  precedingWorkouts: WithId<WorkoutData>[],
  exerciseId: WorkoutData["exercises"][number]["exerciseId"],
  set: WorkoutExerciseSet,
) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) return noPR;

  const inputValues = set.inputs.map((input) => input.value || 0);
  const inputTypes = exercise.inputs.map((input) => input.type);
  const now1YearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const now3MonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let isAllTimePR = true;
  let isYearPR = true;
  let is3MonthPR = true;
  for (const precedingWorkout of precedingWorkouts) {
    for (const workoutExercise of precedingWorkout.exercises) {
      if (workoutExercise.exerciseId !== exerciseId) continue;

      setLoop: for (const { inputs } of workoutExercise.sets) {
        for (const [index, { value }] of inputs.entries()) {
          const inputType = inputTypes[index]!;
          const inputValue = inputValues[index]!;

          if (
            inputType === InputType.Pace || inputType === InputType.Time
              ? value > inputValue
              : value < inputValue
          ) {
            continue setLoop;
          }
        }

        isAllTimePR = false;

        if (precedingWorkout.workedOutAt > now1YearAgo) {
          isYearPR = false;
        }

        if (precedingWorkout.workedOutAt > now3MonthsAgo) {
          is3MonthPR = false;
        }
      }
    }
  }

  for (const workoutExercise of workout.exercises) {
    if (workoutExercise.exerciseId !== exerciseId) continue;

    setLoop: for (const exerciseSet of workoutExercise.sets) {
      // Optimistic identity check
      if (exerciseSet === set) break;

      for (const [index, { value }] of exerciseSet.inputs.entries()) {
        const inputType = inputTypes[index]!;
        const inputValue = inputValues[index]!;

        if (
          inputType === InputType.Pace || inputType === InputType.Time
            ? value > inputValue
            : value < inputValue
        ) {
          continue setLoop;
        }
      }

      isAllTimePR = false;

      if (workout.workedOutAt > now1YearAgo) {
        isYearPR = false;
      }

      if (workout.workedOutAt > now3MonthsAgo) {
        is3MonthPR = false;
      }
    }
  }

  return {
    isAllTimePR,
    isYearPR,
    is3MonthPR,
  };
}
