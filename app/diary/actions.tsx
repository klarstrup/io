"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { Workout, type WorkoutData } from "../../models/workout";

export async function upsertWorkout(
  workout: (WorkoutData & { _id: string }) | WorkoutData
) {
  let _id: ObjectId;
  if ("_id" in workout) {
    const { _id: id, ...rest } = workout;
    _id = new ObjectId(id);
    await Workout.updateOne({ _id }, { $set: rest });
  } else {
    const newWorkout = await new Workout(workout).save();
    _id = newWorkout._id;
  }

  revalidatePath("/diary");
  return String(_id);
}

export async function deleteWorkout(workoutId: string) {
  const result = await Workout.deleteOne({ _id: new ObjectId(workoutId) });
  revalidatePath("/diary");

  return result.deletedCount;
}
