"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { getDB } from "../../dbConnect";
import { type WorkoutData } from "../../models/workout";

export async function upsertWorkout(
  workout: (WorkoutData & { _id: string }) | WorkoutData,
) {
  const user = (await auth())?.user;
  if (!user || workout.userId !== user.id) throw new Error("Unauthorized");

  const DB = await getDB();
  const workoutsCollection = DB.collection<WorkoutData>("workouts");

  let _id: ObjectId;
  if ("_id" in workout) {
    const { _id: id, ...rest } = workout;
    _id = new ObjectId(id);
    await workoutsCollection.updateOne({ _id }, { $set: rest });
  } else {
    const newWorkout = await workoutsCollection.insertOne(workout);
    _id = newWorkout.insertedId;
  }

  revalidatePath("/diary");
  return String(_id);
}

export async function deleteWorkout(workoutId: string) {
  const user = (await auth())?.user;
  if (!user) throw new Error("Unauthorized");

  const DB = await getDB();
  const workoutsCollection = DB.collection<WorkoutData>("workouts");

  const result = await workoutsCollection.updateOne(
    { _id: new ObjectId(workoutId) },
    { $set: { deletedAt: new Date() } },
  );
  revalidatePath("/diary");

  return result.modifiedCount;
}
