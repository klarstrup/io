"use server";

import { waitUntil } from "@vercel/functions";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import PartySocket from "partysocket";
import { v4 as uuid } from "uuid";
import { auth } from "../../auth";
import type { LocationData } from "../../models/location";
import { Locations } from "../../models/location.server";
import type { ITodoScheduleWithExerciseProgram } from "../../models/user";
import { Users } from "../../models/user.server";
import {
  updateExerciseCounts,
  updateLocationCounts,
  Workouts,
} from "../../models/workout.server";
import type { DataSource, UserDataSource } from "../../sources/utils";
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
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    {
      $set: {
        todoSchedules: (user.todoSchedules ?? []).map((s) =>
          s.id === exerciseScheduleId ? { ...s, snoozedUntil } : s,
        ),
      },
    },
  );

  revalidatePath("/diary");

  emitIoUpdate(user.id);

  return (await Users.findOne({
    _id: new ObjectId(user.id),
  }))!.todoSchedules!.find((s) => s.id === exerciseScheduleId);
}

export async function updateUserExerciseSchedule(
  userId: string,
  exerciseScheduleId: ITodoScheduleWithExerciseProgram["id"],
  exerciseSchedule: ITodoScheduleWithExerciseProgram,
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  console.log(
    await Users.updateOne(
      { _id: new ObjectId(user.id) },
      { $set: { "todoSchedules.$[todoSchedule]": exerciseSchedule } },
      { arrayFilters: [{ "todoSchedule.id": exerciseScheduleId }] },
    ),
  );

  emitIoUpdate(user.id);

  return (await Users.findOne({
    _id: new ObjectId(user.id),
  }))!.todoSchedules!.find((s) => s.id === exerciseScheduleId)!;
}

export async function updateUserExerciseSchedules(
  userId: string,
  schedules: ITodoScheduleWithExerciseProgram[],
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    {
      $set: {
        todoSchedules: schedules.map((s) => (s.id ? s : { ...s, id: uuid() })),
      },
    },
  );

  emitIoUpdate(user.id);

  return (await Users.findOne({ _id: new ObjectId(user.id) }))!.todoSchedules!;
}

export async function createUserDataSource<
  S extends DataSource,
  DS extends Extract<UserDataSource, { source: S }>,
>(
  userId: string,
  source: S,
  dataSource: Pick<DS, "config" | "name" | "source">,
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const newDataSource = {
    ...dataSource,
    id: uuid(),
    updatedAt: new Date(),
    createdAt: new Date(),
    lastAttemptedAt: null,
    lastSuccessfulAt: null,
    lastSuccessfulRuntime: null,
    lastResult: null,
    lastFailedAt: null,
    lastFailedRuntime: null,
    lastError: null,
  };

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    { $push: { dataSources: newDataSource as UserDataSource } },
  );

  emitIoUpdate(user.id);

  return newDataSource;
}

export async function updateUserDataSource<
  DS extends Extract<UserDataSource, { source: DataSource }>,
>(userId: string, dataSourceId: DS["id"], dataSource: DS) {
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
  }))!.dataSources!.find((source) => source.id === dataSourceId)!;
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
