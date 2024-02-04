import { User } from "../../../models/user";
import {
  Fitocracy,
  getUserProfileBySessionId,
  getUserWorkouts,
} from "../../../sources/fitocracy";
import { jsonReadableStreamFromAsyncIterable } from "../../../utils";

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

  return new Response(
    jsonReadableStreamFromAsyncIterable(
      getUserWorkouts(fitocracySessionId!, fitocracyUserId!, {
        start: new Date(2001, 9, 11),
        end: new Date(2012, 9, 11),
      })
    ),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
