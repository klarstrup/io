import { auth } from "../../../../auth";
import { jsonStreamResponse } from "../../scraper-utils";
import { materializeAllFitocracyWorkouts } from "../materializers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for await (const workoutUpdateResult of materializeAllFitocracyWorkouts({
      user,
    })) {
      yield workoutUpdateResult;
    }
  });
