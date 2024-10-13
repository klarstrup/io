import { auth } from "../../../auth";
import { getDB } from "../../../dbConnect";
import type { ScrapedAt } from "../../../lib";
import { getRuns, type RunDouble } from "../../../sources/rundouble";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  const runDoubleId = user.runDoubleId;
  if (!runDoubleId) {
    return new Response("No runDoubleId", { status: 401 });
  }

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  const DB = await getDB();
  const runsCollection = DB.collection<RunDouble.MongoHistoryItem & ScrapedAt>(
    "rundouble_runs",
  );

  (async () => {
    const encoder = new TextEncoder();

    await writer.write(encoder.encode("[\n"));
    let first = true;

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

      if (first) {
        first = false;
      } else {
        await writer.write(encoder.encode(",\n"));
      }
      await writer.write(encoder.encode(JSON.stringify(run.completed)));

      if (!updateResult.upsertedCount) {
        break;
      }
    }

    await writer.write(encoder.encode("\n]"));

    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
