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
  materializeAllMoonBoardWorkouts,
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

    yield* mergeGenerators([
      materializeAllIoWorkouts({ user }),
      materializeAllToploggerWorkouts({ user }),
      materializeAllFitocracyWorkouts({ user }),
      materializeAllRunDoubleWorkouts({ user }),
      materializeAllKilterBoardWorkouts({ user }),
      materializeAllMoonBoardWorkouts({ user }),
      materializeAllGrippyWorkouts({ user }),
      materializeAllCrimpdWorkouts({ user }),
      materializeAllClimbalongWorkouts({ user }),
      materializeAllOnsightWorkouts({ user }),
      materializeAllSportstimingWorkouts({ user }),
    ]);

    yield `materializeAllWorkouts: done in ${Date.now() - t}ms`;

    yield {
      "MaterializedWorkoutsView.countDocuments()":
        await MaterializedWorkoutsView.countDocuments(),
    };
  });

async function* mergeGenerators<T>(gens: AsyncGenerator<T>[]) {
  const promises: (Promise<{ r: IteratorResult<T>; i: number }> | null)[] =
    gens.map(async (g, i) => ({ r: await g.next(), i }));

  while (promises.some(Boolean)) {
    const { r, i } = await Promise.race(promises.filter(Boolean));

    if (r.done) {
      promises[i] = null;
      continue;
    }

    yield r.value;
    promises[i] = gens[i]!.next().then((r) => ({ r, i }));
  }
}
