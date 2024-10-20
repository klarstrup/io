import { auth } from "../../../auth";
import { Users } from "../../../models/user.server";
import { fetchTomorrowTimelineIntervals } from "../../../sources/tomorrow";
import { TomorrowIntervals } from "../../../sources/tomorrow.server";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const geohash = user.geohash;
    if (!geohash) return new Response("No geohash", { status: 401 });

    const uniqueGeohash4s = new Set<string>();
    for await (const user of Users.find()) {
      if (user.geohash) uniqueGeohash4s.add(user.geohash.slice(0, 4));
    }
    for (const geohash of uniqueGeohash4s) {
      const intervals = await fetchTomorrowTimelineIntervals({ geohash });

      for (const interval of intervals) {
        const startTime = new Date(interval.startTime);
        const updateResult = await TomorrowIntervals.updateOne(
          { _io_geohash: geohash, startTime },
          {
            $set: {
              ...interval,
              startTime,
              _io_geohash: geohash,
              _io_scrapedAt: new Date(),
            },
          },
          { upsert: true },
        );

        yield [interval.startTime, updateResult] as const;
      }
    }
  });
