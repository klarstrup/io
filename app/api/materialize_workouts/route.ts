import { auth } from "../../../auth";
import { MaterializedWorkoutsView } from "../../../models/workout.server";
import { jsonStreamResponse } from "../scraper-utils";
import {
  materializeAllFitocracyWorkouts,
  materializeAllIoWorkouts,
  materializeAllKilterBoardWorkouts,
  materializeAllRunDoubleWorkouts,
  materializeAllToploggerWorkouts,
  UpdateResultKeeper,
} from "./materializers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    await MaterializedWorkoutsView.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { userId: 1 } },
      { key: { userId: -1 } },
      { key: { workedOutAt: 1 } },
      { key: { workedOutAt: -1 } },
      { key: { location: 1 } },
      { key: { location: -1 } },
      { key: { "exercises.exerciseId": 1 } },
      { key: { "exercises.exerciseId": -1 } },
    ]);

    yield "materializeAllWorkouts: start";
    const t = Date.now();

    yield* materializeAllIoWorkouts({ user });

    yield* materializeAllToploggerWorkouts({ user });

    yield* materializeAllFitocracyWorkouts({ user });

    yield* materializeAllRunDoubleWorkouts({ user });

    yield* materializeAllKilterBoardWorkouts({ user });

    yield `materializeAllWorkouts: done in ${Date.now() - t}ms`;

    yield {
      "MaterializedWorkoutsView.countDocuments()":
        await MaterializedWorkoutsView.countDocuments(),
    };
  });
