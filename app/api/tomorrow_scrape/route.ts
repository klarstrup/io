import { auth } from "../../../auth";
import { getDB } from "../../../dbConnect";
import type { ScrapedAt, TomorrowIoMeta, TomorrowResponse } from "../../../lib";
import { IUser } from "../../../models/user";
import { fetchTomorrowTimelineIntervals } from "../../../sources/tomorrow";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  const geohash = user.geohash;
  if (!geohash) {
    return new Response("No geohash", { status: 401 });
  }

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  const DB = await getDB();
  const forecastsCollection = DB.collection<
    TomorrowResponse & ScrapedAt & TomorrowIoMeta
  >("tomorrow_intervals");

  (async () => {
    const encoder = new TextEncoder();

    await writer.write(encoder.encode("[\n"));
    let first = true;

    const uniqueGeohash4s = new Set<string>();
    for await (const user of DB.collection<IUser>("users").find()) {
      if (user.geohash) {
        uniqueGeohash4s.add(user.geohash.slice(0, 4));
      }
    }
    for (const geohash of uniqueGeohash4s) {
      const intervals = await fetchTomorrowTimelineIntervals({ geohash });

      for (const interval of intervals) {
        const updateResult = await forecastsCollection.updateOne(
          { _io_geohash: geohash, startTime: interval.startTime },
          {
            $set: {
              ...interval,
              startTime: new Date(interval.startTime),
              _io_geohash: geohash,
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
        await writer.write(
          encoder.encode(JSON.stringify([interval.startTime, updateResult])),
        );
      }
    }

    await writer.write(encoder.encode("\n]"));

    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
