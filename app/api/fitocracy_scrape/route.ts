import { UpdateResult } from "mongodb";
import dbConnect from "../../../dbConnect";
import { User } from "../../../models/user";
import { clientPromise } from "../../../mongodb";
import {
  Fitocracy,
  getUserProfileBySessionId,
  getUserWorkouts,
} from "../../../sources/fitocracy";
import { DAY_IN_SECONDS } from "../../../utils";
// import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

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
  const fitocracySessionId = user?.fitocracySessionId;

  let fitocracyProfile: Fitocracy.ProfileData | null = null;
  try {
    fitocracyProfile = user?.fitocracySessionId
      ? await getUserProfileBySessionId(user.fitocracySessionId)
      : null;
  } catch (e) {
    /* */
  }
  const fitocracyUserId = fitocracyProfile?.id;

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  const workouts = (await clientPromise)
    .db("test")
    .collection<Fitocracy.WorkoutData>("fitocracy_workouts");

  (async () => {
    const workoutsSynchronized: Pick<
      UpdateResult,
      "matchedCount" | "modifiedCount" | "upsertedCount"
    > = {
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
    };

    const encoder = new TextEncoder();

    await writer.write(encoder.encode("["));
    let first = true;
    for await (const workout of getUserWorkouts(
      fitocracySessionId!,
      fitocracyUserId!,
      undefined,
      { maxAge: DAY_IN_SECONDS }
    )) {
      const updateResult = await workouts.updateOne(
        { id: workout.id },
        { $set: workout },
        { upsert: true }
      );
      workoutsSynchronized.matchedCount += updateResult.matchedCount;
      workoutsSynchronized.modifiedCount += updateResult.modifiedCount;
      workoutsSynchronized.upsertedCount += updateResult.upsertedCount;

      if (first) {
        first = false;
      } else {
        await writer.write(encoder.encode(","));
      }
      await writer.write(encoder.encode(JSON.stringify(workout)));
    }
    await writer.write(encoder.encode("]"));

    console.log(workoutsSynchronized);

    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
