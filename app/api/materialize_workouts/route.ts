import { auth } from "../../../auth";
import { MaterializedWorkoutsView } from "../../../models/workout.server";
import { jsonStreamResponse } from "../scraper-utils";
import {
  materializeAllClimbalongWorkouts,
  materializeAllCrimpdWorkouts,
  materializeAllFitocracyWorkouts,
  materializeAllGrippyWorkouts,
  materializeAllIoWorkouts,
  materializeAllKilterBoardWorkouts,
  materializeAllOnsightWorkouts,
  materializeAllRunDoubleWorkouts,
  materializeAllSportstimingWorkouts,
  materializeAllToploggerWorkouts,
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

    yield {
      "MaterializedWorkoutsView.countDocuments()":
        await MaterializedWorkoutsView.countDocuments(),
    };

    yield "materializeAllWorkouts: start";
    const t = Date.now();

    yield* materializeAllIoWorkouts({ user });

    yield* materializeAllToploggerWorkouts({ user });

    yield* materializeAllFitocracyWorkouts({ user });

    yield* materializeAllRunDoubleWorkouts({ user });

    yield* materializeAllKilterBoardWorkouts({ user });

    yield* materializeAllGrippyWorkouts({ user });

    yield* materializeAllCrimpdWorkouts({ user });

    yield* materializeAllClimbalongWorkouts({ user });

    yield* materializeAllOnsightWorkouts({ user });

    yield* materializeAllSportstimingWorkouts({ user });

    yield `materializeAllWorkouts: done in ${Date.now() - t}ms`;

    yield {
      "MaterializedWorkoutsView.countDocuments()":
        await MaterializedWorkoutsView.countDocuments(),
    };
  });
