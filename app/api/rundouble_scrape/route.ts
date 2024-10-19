import { auth } from "../../../auth";
import { getDB } from "../../../dbConnect";
import type { ScrapedAt } from "../../../lib";
import { getRuns, type RunDouble } from "../../../sources/rundouble";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const runDoubleId = user.runDoubleId;
    if (!runDoubleId) return new Response("No runDoubleId", { status: 401 });

    const DB = await getDB();
    const runsCollection = DB.collection<
      RunDouble.MongoHistoryItem & ScrapedAt
    >("rundouble_runs");

    for await (const run of getRuns(runDoubleId, { maxAge: 0 })) {
      const updateResult = await runsCollection.updateOne(
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
