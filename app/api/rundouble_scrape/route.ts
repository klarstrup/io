import { auth } from "../../../auth";
import { getRuns } from "../../../sources/rundouble";
import { RunDoubleRuns } from "../../../sources/rundouble.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { materializeAllRunDoubleWorkouts } from "../materialize_workouts/materializers";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.RunDouble) continue;

      yield* wrapSource(dataSource, user, async function* () {
        const runDoubleId = dataSource.config.id;

        for await (const run of getRuns(runDoubleId, { maxAge: 0 })) {
          const updateResult = await RunDoubleRuns.updateOne(
            { key: run.key },
            {
              $set: {
                ...run,
                userId: runDoubleId,
                completedAt: new Date(run.completedLong),
                _io_scrapedAt: new Date(),
              },
            },
            { upsert: true },
          );

          yield run.completed;

          if (!updateResult.upsertedCount) break;
        }
      });
    }

    yield* materializeAllRunDoubleWorkouts({ user });
  });
