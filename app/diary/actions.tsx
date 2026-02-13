"use server";

import { waitUntil } from "@vercel/functions";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import PartySocket from "partysocket";
import { v4 as uuid } from "uuid";
import { auth } from "../../auth";
import { LocationData } from "../../models/location";
import { Locations } from "../../models/location.server";
import { Users } from "../../models/user.server";
import { type WorkoutData } from "../../models/workout";
import {
  updateExerciseCounts,
  updateLocationCounts,
  Workouts,
} from "../../models/workout.server";
import type { ExerciseSchedule } from "../../sources/fitocracy";
import type { UserDataSource } from "../../sources/utils";
import { arrayFromAsyncIterable, omit } from "../../utils";
import { materializeIoWorkouts } from "../api/materialize_workouts/materializers";

const emitIoUpdate = (userId: string) => {
  try {
    const socket = new PartySocket({
      // id: process.env.VERCEL_DEPLOYMENT_ID,
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
      room: userId,
    });

    socket.send(
      JSON.stringify({ source: "io", scrapedAt: new Date().valueOf() }),
    );
    socket.close();
  } catch (error) {
    console.error(error);
  }
};

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

  emitIoUpdate(user.id);

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

  emitIoUpdate(user.id);

  return result.modifiedCount;
}

export async function snoozeUserExerciseSchedule(
  userId: string,
  exerciseScheduleId: string,
  snoozedUntil: Date | null,
  newOrder?: number,
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    {
      $set: {
        exerciseSchedules: (user.exerciseSchedules ?? []).map((s) =>
          s.id === exerciseScheduleId
            ? { ...s, snoozedUntil, order: newOrder }
            : s,
        ),
      },
    },
  );

  revalidatePath("/diary");

  emitIoUpdate(user.id);

  return (await Users.findOne({
    _id: new ObjectId(user.id),
  }))!.exerciseSchedules!.find((s) => s.id === exerciseScheduleId);
}

export async function updateUserExerciseSchedules(
  userId: string,
  schedules: ExerciseSchedule[],
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    {
      $set: {
        exerciseSchedules: schedules.map((s) =>
          s.id ? s : { ...s, id: uuid() },
        ),
      },
    },
  );

  emitIoUpdate(user.id);

  return (await Users.findOne({ _id: new ObjectId(user.id) }))!
    .exerciseSchedules!;
}

export async function updateUserDataSource(
  userId: string,
  dataSourceId: UserDataSource["id"],
  dataSource: UserDataSource,
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    {
      $set: {
        "dataSources.$[source]": {
          ...dataSource,
          updatedAt: new Date(),
          createdAt: dataSource.createdAt && new Date(dataSource.createdAt),
          lastAttemptedAt:
            dataSource.lastAttemptedAt && new Date(dataSource.lastAttemptedAt),
          lastSuccessfulAt:
            dataSource.lastSuccessfulAt &&
            new Date(dataSource.lastSuccessfulAt),
          lastFailedAt:
            dataSource.lastFailedAt && new Date(dataSource.lastFailedAt),
        },
      },
    },
    { arrayFilters: [{ "source.id": dataSourceId }] },
  );

  emitIoUpdate(user.id);

  return (await Users.findOne({
    _id: new ObjectId(user.id),
  }))!.dataSources?.find((source) => source.id === dataSourceId)!;
}

export async function updateLocation(
  userId: string,
  locationId: string,
  location: LocationData,
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Locations.updateOne(
    { _id: new ObjectId(locationId), userId },
    {
      $set: {
        ...omit(location, "updatedAt", "createdAt"),
        updatedAt: new Date(),
      },
    },
  );

  const newLocation = await Locations.findOne({
    _id: new ObjectId(locationId),
    userId,
  });

  if (!newLocation) {
    throw new Error("idk");
  }

  await updateLocationCounts(userId);

  emitIoUpdate(user.id);

  return { ...omit(newLocation, "_id"), id: newLocation._id.toString() };
}
