"use server";

import { waitUntil } from "@vercel/functions";
import { max } from "date-fns";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { Users } from "../../models/user.server";
import type { WorkoutData } from "../../models/workout";
import {
  MaterializedWorkoutsView,
  updateExerciseCounts,
  updateLocationCounts,
  Workouts,
} from "../../models/workout.server";
import type { ExerciseSchedule } from "../../sources/fitocracy";
import type { UserDataSource } from "../../sources/utils";
import { arrayFromAsyncIterable } from "../../utils";
import { materializeIoWorkouts } from "../api/materialize_workouts/materializers";
import { Locations } from "../../models/location.server";

export async function upsertWorkout(
  workout:
    | (Omit<WorkoutData, "id"> & { _id: string })
    | Omit<WorkoutData, "id">,
) {
  const user = (await auth())?.user;
  if (!user || workout.userId !== user.id) throw new Error("Unauthorized");
  console.time("upsertWorkout");

  console.time("upsertWorkout:upsertWorkout");

  // Check if locationId is provided and if no such location exists with that
  // locationId as its name or its _id, create it with that as the name and
  // use it as the locationId in the workout document
  if (workout.locationId && !workout.location) {
    const newLocationName = workout.locationId.trim();
    const location = await Locations.findOne(
      ObjectId.isValid(workout.locationId)
        ? { _id: new ObjectId(workout.locationId) }
        : { name: newLocationName },
    );
    if (!location) {
      const now = new Date();
      const newLocation = await Locations.insertOne({
        name: workout.locationId,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });
      workout.locationId = newLocation.insertedId.toString();
    } else {
      workout.locationId = location._id.toString();
    }
  }

  let _id: ObjectId;
  if ("_id" in workout) {
    const { _id: id, ...rest } = workout;
    _id = new ObjectId(id);
    await Workouts.updateOne({ _id }, { $set: rest });
  } else {
    const newWorkout = await Workouts.insertOne(workout);
    _id = newWorkout.insertedId;
  }
  console.timeEnd("upsertWorkout:upsertWorkout");

  waitUntil(updateLocationCounts(user.id));
  waitUntil(updateExerciseCounts(user.id));

  console.time("upsertWorkout:materializeAllIoWorkouts");
  await arrayFromAsyncIterable(materializeIoWorkouts(user));
  console.timeEnd("upsertWorkout:materializeAllIoWorkouts");

  revalidatePath("/diary");

  console.timeEnd("upsertWorkout");

  return String(_id);
}

export async function deleteWorkout(workoutId: string) {
  const user = (await auth())?.user;
  if (!user) throw new Error("Unauthorized");

  const result = await Workouts.updateOne(
    { _id: new ObjectId(workoutId) },
    { $set: { deletedAt: new Date() } },
  );

  waitUntil(updateLocationCounts(user.id));
  waitUntil(updateExerciseCounts(user.id));

  await arrayFromAsyncIterable(materializeIoWorkouts(user));

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

export async function updateUserDataSources(
  userId: string,
  dataSources: UserDataSource[],
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    { $set: { dataSources } },
  );

  return (await Users.findOne({ _id: new ObjectId(user.id) }))!.dataSources;
}

export async function mostRecentlyScrapedAt(userId: string) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const workout = await MaterializedWorkoutsView.findOne(
    { userId: user.id },
    { sort: { updatedAt: -1, deletedAt: -1 } },
  );
  const dataSourceRuns: (Date | null)[] = [];
  for (const dataSource of user.dataSources ?? []) {
    dataSourceRuns.push(
      dataSource.createdAt,
      dataSource.updatedAt,
      dataSource.lastAttemptedAt,
      dataSource.lastSuccessfulAt,
      dataSource.lastFailedAt,
    );
  }
  return max(
    [
      ...dataSourceRuns,
      workout?.deletedAt,
      workout?.updatedAt,
      new Date(0),
    ].filter(Boolean),
  );
}
