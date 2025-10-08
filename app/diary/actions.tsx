"use server";

import { waitUntil } from "@vercel/functions";
import { addDays } from "date-fns";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import PartySocket from "partysocket";
import { auth } from "../../auth";
import type { MongoVTodo } from "../../lib";
import { LocationData } from "../../models/location";
import { Locations } from "../../models/location.server";
import { Users } from "../../models/user.server";
import { WorkoutSource, type WorkoutData } from "../../models/workout";
import {
  updateExerciseCounts,
  updateLocationCounts,
  Workouts,
} from "../../models/workout.server";
import type { ExerciseSchedule } from "../../sources/fitocracy";
import { IcalEvents } from "../../sources/ical.server";
import type { UserDataSource } from "../../sources/utils";
import { arrayFromAsyncIterable, omit } from "../../utils";
import { materializeIoWorkouts } from "../api/materialize_workouts/materializers";

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

  try {
    new PartySocket({
      id: process.env.VERCEL_DEPLOYMENT_ID,
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
      room: user.id,
    }).send(JSON.stringify({ source: "io", scrapedAt: new Date().valueOf() }));
  } catch (error) {
    console.error(error);
  }

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

export async function snoozeUserExerciseSchedule(
  userId: string,
  exerciseId: number,
  snoozedUntil: Date,
) {
  const user = (await auth())?.user;
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    {
      $set: {
        exerciseSchedules: (user.exerciseSchedules ?? []).map((s) =>
          s.exerciseId === exerciseId ? { ...s, snoozedUntil } : s,
        ),
      },
    },
  );

  return (await Users.findOne({
    _id: new ObjectId(user.id),
  }))!.exerciseSchedules!.find((s) => s.exerciseId === exerciseId);
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

  return { ...omit(newLocation, "_id"), id: newLocation._id.toString() };
}

export async function upsertTodo(
  todo: Partial<MongoVTodo> & { _id?: string; uid?: string },
) {
  const user = (await auth())?.user;
  if (!user) throw new Error("Unauthorized");

  const upsertResult = await IcalEvents.updateOne(
    {
      ...("_id" in todo && todo._id
        ? { _id: new ObjectId(todo._id) }
        : { uid: todo.uid }),
      _io_userId: user.id,
      type: "VTODO",
    },
    {
      $set: {
        type: "VTODO",
        created: new Date(),
        lastmodified: new Date(),
        dtstamp: new Date(),
        params: [],
        _io_source: WorkoutSource.Self,
        _io_userId: user.id,
        uid: todo.uid ?? new ObjectId().toString(),
        ...todo,
      } satisfies MongoVTodo,
    },
    { upsert: true },
  );

  if (!upsertResult.matchedCount && !upsertResult.upsertedId) {
    throw new Error("Failed to upsert todo");
  }

  revalidatePath("/diary");

  return String(upsertResult.matchedCount);
}

export async function doTodo(todoUid: string) {
  return upsertTodo({ uid: todoUid, completed: new Date(), type: "VTODO" });
}

export async function undoTodo(todoUid: string) {
  return upsertTodo({ uid: todoUid, completed: undefined, type: "VTODO" });
}

export async function snoozeTodo(todoUid: string) {
  const user = (await auth())?.user;
  if (!user) throw new Error("Unauthorized");

  const todo = await IcalEvents.findOne<MongoVTodo>({
    uid: todoUid,
    _io_userId: user.id,
    type: "VTODO",
  });

  if (!todo) throw new Error("Todo not found");

  const now = new Date();
  const tomorrow = addDays(todo.start ?? now, 1);

  return upsertTodo({ uid: todoUid, start: tomorrow, type: "VTODO" });
}

export async function deleteTodo(todoUid: string) {
  const user = (await auth())?.user;
  if (!user) throw new Error("Unauthorized");

  const result = await IcalEvents.deleteMany({
    uid: todoUid,
    _io_userId: user.id,
    type: "VTODO",
  });

  if (result.deletedCount === 0) {
    throw new Error("Failed to delete todo");
  }

  revalidatePath("/diary");

  return result.deletedCount;
}
