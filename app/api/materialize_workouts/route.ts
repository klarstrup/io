import { auth } from "../../../auth";
import {
  MaterializedWorkoutsView,
  updateExerciseCounts,
  updateLocationCounts,
} from "../../../models/workout.server";
import { jsonStreamResponse } from "../scraper-utils";
import { materializeIoWorkouts, sourceToMaterializer } from "./materializers";

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

    const generators: AsyncGenerator[] = [
      // Always materialize manually entered workouts, this is not a data source per se
      materializeIoWorkouts(user),
    ];

    for (const dataSource of user.dataSources ?? []) {
      const source = dataSource.source;

      if (source in sourceToMaterializer) {
        const materializer =
          sourceToMaterializer[source as keyof typeof sourceToMaterializer];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - some runtimes think this is too complex
        if (materializer) generators.push(materializer(user, dataSource));
      }
    }

    yield* mergeGenerators(generators);

    yield `materializeAllWorkouts: done in ${Date.now() - t}ms`;

    yield {
      "MaterializedWorkoutsView.countDocuments()":
        await MaterializedWorkoutsView.countDocuments(),
    };

    const t2 = Date.now();
    yield "updateExerciseCounts: start";
    await updateExerciseCounts(user.id);
    yield `updateExerciseCounts: done in ${Date.now() - t2}ms`;

    const t3 = Date.now();
    yield "updateLocationCounts: start";
    await updateLocationCounts(user.id);
    yield `updateLocationCounts: done in ${Date.now() - t3}ms`;
  });

async function* mergeGenerators<T>(gens: AsyncGenerator<T>[]) {
  const promises: (Promise<{ r: IteratorResult<T>; i: number }> | null)[] =
    gens.map(async (g, i) => ({ r: await g.next(), i }));

  while (promises.some(Boolean)) {
    const { r, i } = await Promise.race(promises.filter(Boolean));

    if (r.done) {
      promises[i] = null;
    } else {
      yield r.value;
      promises[i] = gens[i]!.next().then((r) => ({ r, i }));
    }
  }
}
