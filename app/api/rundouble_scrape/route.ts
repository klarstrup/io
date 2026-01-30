import { auth } from "../../../auth";
import { RunDouble } from "../../../sources/rundouble";
import { RunDoubleRuns } from "../../../sources/rundouble.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchJson, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

async function* getRuns(userId: string) {
  let cursor: string | undefined = undefined;
  do {
    const url = new URL("https://www.rundouble.com/rundoublesite/history");
    url.searchParams.set("user", userId);
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetchJson<RunDouble.HistoryResponse>(url);

    cursor = response.cursor;
    yield* response.history;
  } while (cursor);
}

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.RunDouble,
      async function* ({ config: { id } }, setUpdated) {
        setUpdated(false);

        for await (const run of getRuns(id)) {
          const updateResult = await RunDoubleRuns.updateOne(
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
          setUpdated(updateResult);

          if (!updateResult.upsertedCount) break;
        }
      },
    );
  });
