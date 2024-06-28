import dbConnect from "../../../dbConnect";
import { User } from "../../../models/user";
import {
  Fitocracy,
  getUserWorkout,
  getUserWorkoutIds,
} from "../../../sources/fitocracy";
import { DAY_IN_SECONDS, HOUR_IN_SECONDS } from "../../../utils";
// import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(/* request: NextRequest */) {
  /*
  if (process.env.VERCEL) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }
  }
  */

  await dbConnect();

  // Io is the only user in the database,
  const user = await User.findOne();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const fitocracySessionId = user.fitocracySessionId;
  const fitocracyUserId = user.fitocracyUserId;

  if (!fitocracySessionId || !fitocracyUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  const workouts = (
    await dbConnect()
  ).connection.db.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  (async () => {
    const workoutsSynchronized = {
      skippedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
    };

    const encoder = new TextEncoder();

    await writer.write(encoder.encode("[\n"));
    let first = true;

    const allWorkoutIds = await getUserWorkoutIds(
      fitocracySessionId,
      fitocracyUserId,
      undefined,
      { maxAge: HOUR_IN_SECONDS }
    );

    const workoutsThatAlreadyExist = await workouts
      .find({ id: { $in: allWorkoutIds } })
      .toArray();

    for (const workoutId of allWorkoutIds) {
      if (workoutsThatAlreadyExist.some(({ id }) => id === workoutId)) {
        workoutsSynchronized.skippedCount += 1;
        continue;
      }

      const workout = await getUserWorkout(
        fitocracySessionId,
        fitocracyUserId,
        workoutId,
        { maxAge: DAY_IN_SECONDS }
      );

      const updateResult = await workouts.updateOne(
        { id: workout.id },
        {
          $set: {
            ...workout,
            user_id: fitocracyUserId,
            updated_timestamp: new Date(workout.updated_timestamp),
            workout_timestamp: new Date(workout.workout_timestamp),
          },
        },
        { upsert: true }
      );
      workoutsSynchronized.matchedCount += updateResult.matchedCount;
      workoutsSynchronized.modifiedCount += updateResult.modifiedCount;
      workoutsSynchronized.upsertedCount += updateResult.upsertedCount;

      if (first) {
        first = false;
      } else {
        await writer.write(encoder.encode(",\n"));
      }
      await writer.write(encoder.encode(JSON.stringify(workout)));
    }
    await writer.write(encoder.encode("\n]"));

    console.log(workoutsSynchronized);

    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
