import { auth } from "../../../auth";
import { RunDouble } from "../../../sources/rundouble";
import { RunDoubleRuns } from "../../../sources/rundouble.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function* getRuns(userId: string) {
  let cursor: string | undefined = undefined;
  do {
    const url = new URL("https://www.rundouble.com/rundoublesite/history");
    url.searchParams.set("user", userId);
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url).then(
      (r) => r.json() as Promise<RunDouble.HistoryResponse>,
    );
    cursor = response.cursor;
    yield* response.history;
  } while (cursor);
}

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.RunDouble) continue;

      yield* wrapSource(dataSource, user, async function* ({ id }, setUpdated) {
        for await (const run of getRuns(id)) {
          const { modifiedCount, upsertedCount } =
            await RunDoubleRuns.updateOne(
              { key: run.key },
              {
                $set: {
                  ...run,
                  userId: id,
                  completedAt: new Date(run.completedLong),
                },
                $setOnInsert: { _io_scrapedAt: new Date() },
              },
              { upsert: true },
            );

          yield run.completed;
          setUpdated(modifiedCount > 0 || upsertedCount > 0);

          if (!upsertedCount) break;
        }
      });
    }
  });
