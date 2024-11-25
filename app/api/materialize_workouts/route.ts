import { ObjectId, UpdateResult } from "mongodb";
import { auth } from "../../../auth";
import { MaterializedWorkoutsView } from "../../../models/workout.server";
import { jsonStreamResponse } from "../scraper-utils";
import {
  materializeAllFitocracyWorkouts,
  materializeAllIoWorkouts,
  materializeAllKilterBoardWorkouts,
  materializeAllRunDoubleWorkouts,
  materializeAllToploggerWorkouts,
} from "./materializers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

class UpdateResultKeeper {
  matchedCount = 0;
  modifiedCount = 0;
  upsertedCount = 0;
  upsertedIds: ObjectId[] = [];

  addUpdateResult(updateResult: UpdateResult) {
    this.matchedCount += updateResult.matchedCount;
    this.modifiedCount += updateResult.modifiedCount;
    this.upsertedCount += updateResult.upsertedCount;
    if (updateResult.upsertedId) {
      this.upsertedIds.push(updateResult.upsertedId);
    }
  }
  toJSON() {
    return {
      matchedCount: this.matchedCount,
      modifiedCount: this.modifiedCount,
      upsertedCount: this.upsertedCount,
      upsertedIds: this.upsertedIds,
    };
  }
}

export const GET = () =>
  // eslint-disable-next-line require-yield
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

    const toploggerUpdateResult = new UpdateResultKeeper();
    for await (const workoutUpdateResult of materializeAllToploggerWorkouts({
      user,
    })) {
      toploggerUpdateResult.addUpdateResult(workoutUpdateResult);
    }
    yield { toploggerUpdateResult };

    const fitocracyUpdateResult = new UpdateResultKeeper();
    for await (const workoutUpdateResult of materializeAllFitocracyWorkouts({
      user,
    })) {
      fitocracyUpdateResult.addUpdateResult(workoutUpdateResult);
    }
    yield { fitocracyUpdateResult };

    const runDoubleUpdateResult = new UpdateResultKeeper();
    for await (const workoutUpdateResult of materializeAllRunDoubleWorkouts({
      user,
    })) {
      runDoubleUpdateResult.addUpdateResult(workoutUpdateResult);
    }
    yield { runDoubleUpdateResult };

    const kilterBoardUpdateResult = new UpdateResultKeeper();
    for await (const workoutUpdateResult of materializeAllKilterBoardWorkouts({
      user,
    })) {
      kilterBoardUpdateResult.addUpdateResult(workoutUpdateResult);
    }
    yield { kilterBoardUpdateResult };

    yield {
      "MaterializedWorkoutsView.countDocuments()":
        await MaterializedWorkoutsView.countDocuments(),
    };
  });
