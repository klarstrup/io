"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { Users } from "../../models/user.server";
import type { WorkoutData } from "../../models/workout";
import {
  updateExerciseCounts,
  updateLocationCounts,
  Workouts,
} from "../../models/workout.server";
import type { ExerciseSchedule } from "../../sources/fitocracy";
import { arrayFromAsyncIterable } from "../../utils";
import { materializeAllIoWorkouts } from "../api/materialize_workouts/materializers";

export async function upsertWorkout(
  workout:
    | (Omit<WorkoutData, "id"> & { _id: string })
    | Omit<WorkoutData, "id">,
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

  void updateLocationCounts(user.id);
  void updateExerciseCounts(user.id);

  await arrayFromAsyncIterable(materializeAllIoWorkouts({ user }));

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

export async function updateUserExerciseSchedules(
  userId: string,
  schedules: ExerciseSchedule[],
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    { $set: { exerciseSchedules: schedules } },
  );

  return (await Users.findOne({ _id: new ObjectId(user.id) }))!
    .exerciseSchedules;
}
