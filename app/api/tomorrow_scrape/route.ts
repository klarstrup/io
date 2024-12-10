import { auth } from "../../../auth";
import { fetchTomorrowTimelineIntervals } from "../../../sources/tomorrow";
import { TomorrowIntervals } from "../../../sources/tomorrow.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    await TomorrowIntervals.createIndexes([
      { key: { _io_geohash: 1 } },
      { key: { startTime: 1 } },
      { key: { _io_geohash: 1, startTime: 1 } },
    ]);

    for (const dataSources of user.dataSources ?? []) {
      if (dataSources.source !== DataSource.Tomorrow) continue;

      yield* wrapSource(dataSources, user, async function* ({ geohash }) {
        const truncatedGeohash = geohash.slice(0, 4);
        const intervals = await fetchTomorrowTimelineIntervals({
          geohash: truncatedGeohash,
        });

        for (const interval of intervals) {
          const startTime = new Date(interval.startTime);
          const updateResult = await TomorrowIntervals.updateOne(
            { _io_geohash: truncatedGeohash, startTime },
            {
              $set: {
                ...interval,
                startTime,
                _io_geohash: truncatedGeohash,
                _io_scrapedAt: new Date(),
              },
            },
            { upsert: true },
          );

          yield [interval.startTime, updateResult] as const;
        }
      });
    }
  });
