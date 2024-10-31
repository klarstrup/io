"use server";

import { ObjectId, type WithId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "../../../auth";
import { exercises, InputType } from "../../../models/exercises";
import type { WorkoutData, WorkoutExerciseSet } from "../../../models/workout";
import { Workouts } from "../../../models/workout.server";
import { workoutFromFitocracyWorkout } from "../../../sources/fitocracy";
import { FitocracyWorkouts } from "../../../sources/fitocracy.server";

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

export async function getIsSetPR(
  workout: WorkoutData,
  exerciseId: WorkoutData["exercises"][number]["exerciseId"],
  set: WorkoutExerciseSet,
) {
  const user = (await auth())?.user;
  if (!user) return;

  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) return;

  const ioWorkouts = await Workouts.find({
    userId: user.id,
    "exercises.exerciseId": exerciseId,
    workedOutAt: { $lt: workout.workedOutAt },
  }).toArray();

  const fitocracyWorkouts = user.fitocracyUserId
    ? (
        await FitocracyWorkouts.find({
          user_id: user.fitocracyUserId,
          "root_group.children.exercise.exercise_id": exerciseId,
          workout_timestamp: { $lt: workout.workedOutAt },
        }).toArray()
      ).map((w) => workoutFromFitocracyWorkout(w))
    : [];

  const workouts = [...ioWorkouts, ...fitocracyWorkouts];

  const repsInputIndex = exercise.inputs.findIndex(
    (i) => i.type === InputType.Reps,
  );
  const weightInputIndex = exercise.inputs.findIndex(
    (i) => i.type === InputType.Weight,
  );

  if (repsInputIndex === -1 || weightInputIndex === -1) return;

  const reps = set.inputs[repsInputIndex]?.value || 0;

  const weight = set.inputs[weightInputIndex]?.value || 0;

  function theThing(ws: WithId<WorkoutData>[]) {
    return ws.every((w) =>
      w.exercises
        .find((e) => e.exerciseId === exerciseId)
        ?.sets.every((pastSet) => {
          const pastReps = pastSet.inputs[repsInputIndex]?.value || 0;
          const pastWeight = pastSet.inputs[weightInputIndex]?.value || 0;

          return pastReps < reps || pastWeight < weight;
        }),
    );
  }

  const isAllTimePR = theThing(workouts);

  const isYearPR = theThing(
    workouts.filter(
      (w) => w.workedOutAt > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    ),
  );

  const is3MonthPR = theThing(
    workouts.filter(
      (w) => w.workedOutAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    ),
  );

  return {
    isAllTimePR,
    isYearPR,
    is3MonthPR,
  };
}
