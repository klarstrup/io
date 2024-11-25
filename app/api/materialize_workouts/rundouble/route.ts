import { auth } from "../../../../auth";
import { jsonStreamResponse } from "../../scraper-utils";
import {
  materializeAllRunDoubleWorkouts,
  UpdateResultKeeper,
} from "../materializers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* (flushJSON) {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const runDoubleUpdateResult = new UpdateResultKeeper();
    for await (const workoutUpdateResult of materializeAllRunDoubleWorkouts({
      user,
    })) {
      runDoubleUpdateResult.addUpdateResult(workoutUpdateResult);
    }
    yield { runDoubleUpdateResult };
  });
