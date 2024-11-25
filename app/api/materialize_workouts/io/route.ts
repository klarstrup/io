import { auth } from "../../../../auth";
import { jsonStreamResponse } from "../../scraper-utils";
import { materializeAllIoWorkouts, UpdateResultKeeper } from "../materializers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const ioUpdateResult = new UpdateResultKeeper();
    for await (const workoutUpdateResult of materializeAllIoWorkouts({
      user,
    })) {
      ioUpdateResult.addUpdateResult(workoutUpdateResult);
    }
    yield { ioUpdateResult };
  });
