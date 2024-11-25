import { auth } from "../../../../auth";
import { jsonStreamResponse } from "../../scraper-utils";
import {
  materializeAllKilterBoardWorkouts,
  UpdateResultKeeper,
} from "../materializers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const kilterBoardUpdateResult = new UpdateResultKeeper();
    for await (const workoutUpdateResult of materializeAllKilterBoardWorkouts({
      user,
    })) {
      kilterBoardUpdateResult.addUpdateResult(workoutUpdateResult);
    }
    yield { kilterBoardUpdateResult };
  });
