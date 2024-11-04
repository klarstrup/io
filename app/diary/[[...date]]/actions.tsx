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
// eslint-disable-next-line @typescript-eslint/require-await
export async function getIsSetPR(
  precedingWorkouts: WithId<WorkoutData>[],
  exerciseId: WorkoutData["exercises"][number]["exerciseId"],
  set: WorkoutExerciseSet,
) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) return noPR;

  const repsInputIndex = exercise.inputs.findIndex(
    (i) => i.type === InputType.Reps,
  );
  const weightInputIndex = exercise.inputs.findIndex(
    (i) => i.type === InputType.Weight,
  );
  if (repsInputIndex === -1 || weightInputIndex === -1) return noPR;

  const getSetReps = (s: WorkoutExerciseSet) =>
    s.inputs[repsInputIndex]?.value || 0;
  const getSetWeight = (s: WorkoutExerciseSet) =>
    s.inputs[weightInputIndex]?.value || 0;

  const reps = getSetReps(set);
  const weight = getSetWeight(set);

  const theThing = (ws: WithId<WorkoutData>[]) =>
    ws.every((w) =>
      w.exercises
        .find((e) => e.exerciseId === exerciseId)
        ?.sets.every(
          (pastSet) =>
            getSetReps(pastSet) < reps || getSetWeight(pastSet) < weight,
        ),
    );

  console.time("getIsSetPR iteration");
  const isAllTimePR = theThing(precedingWorkouts);

  const now1YearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const isYearPR = theThing(
    precedingWorkouts.filter((w) => w.workedOutAt > now1YearAgo),
  );

  const now3MonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const is3MonthPR = theThing(
    precedingWorkouts.filter((w) => w.workedOutAt > now3MonthsAgo),
  );
  console.timeEnd("getIsSetPR iteration");

  return {
    isAllTimePR,
    isYearPR,
    is3MonthPR,
  };
}
