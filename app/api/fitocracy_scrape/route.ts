import { User } from "../../../models/user";
import {
  Fitocracy,
  getUserProfileBySessionId,
  getUserWorkouts,
} from "../../../sources/fitocracy";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  (async () => {
    const encoder = new TextEncoder();

    await writer.write(encoder.encode("["));
    let first = true;
    for await (const workout of getUserWorkouts(
      fitocracySessionId!,
      fitocracyUserId!,
      {
        start: new Date(2001, 9, 11),
        end: new Date(2012, 9, 11),
      }
    )) {
      if (first) {
        first = false;
      } else {
        await writer.write(encoder.encode(","));
      }
      await writer.write(encoder.encode(JSON.stringify(workout)));
    }
    await writer.write(encoder.encode("]"));

    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
