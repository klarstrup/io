import { TZDate } from "@date-fns/tz";
import { addDays, endOfDay, startOfDay, subSeconds } from "date-fns";
import { auth } from "../../../auth";
import type { TomorrowResponse } from "../../../sources/tomorrow";
import { TomorrowIntervals } from "../../../sources/tomorrow.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { decodeGeohash, DEFAULT_TIMEZONE } from "../../../utils";
import { fetchJson, jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

async function fetchTomorrowTimelineIntervals({
  geohash,
}: {
  geohash: string | null;
}) {
  if (!process.env.TOMORROW_API_KEY) {
    throw new Error("Missing TOMORROW_API_KEY");
  }
  const tomorrowUrl = new URL("https://api.tomorrow.io/v4/timelines");

  // Dump precision to 4 characters(+/- 20-40km(lat-lng)), it's the fucking weather.
  const location = geohash && decodeGeohash(geohash.slice(0, 4));
  tomorrowUrl.searchParams.set(
    "location",
    location
      ? `${location.latitude},${location.longitude}`
      : `55.658693,12.489322`,
  );
  tomorrowUrl.searchParams.set(
    "startTime",
    subSeconds(startOfDay(TZDate.tz(DEFAULT_TIMEZONE)), 1).toISOString(),
  );
  tomorrowUrl.searchParams.set(
    "endTime",
    subSeconds(
      endOfDay(addDays(TZDate.tz(DEFAULT_TIMEZONE), 4)),
      1,
    ).toISOString(),
  );
  tomorrowUrl.searchParams.set("timezone", DEFAULT_TIMEZONE);
  tomorrowUrl.searchParams.set(
    "fields",
    "temperatureApparent,humidity,windSpeed,windDirection,windGust,precipitationIntensity,precipitationProbability,precipitationType,cloudCover,weatherCode",
  );
  tomorrowUrl.searchParams.set("timesteps", "1h");
  tomorrowUrl.searchParams.set("units", "metric");
  tomorrowUrl.searchParams.set("apikey", process.env.TOMORROW_API_KEY);

  const tomorrowResponse = await fetchJson<TomorrowResponse>(tomorrowUrl);

  return tomorrowResponse.data?.timelines[0]?.intervals ?? [];
}

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    await TomorrowIntervals.createIndexes([
      { key: { _io_geohash: 1, startTime: 1 } },
    ]);

    yield* wrapSources(
      user,
      DataSource.Tomorrow,
      async function* ({ config: { geohash } }, setUpdated) {
        setUpdated(false);

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
              },
              $setOnInsert: { _io_scrapedAt: new Date() },
            },
            { upsert: true },
          );
          setUpdated(updateResult);

          yield [interval.startTime, updateResult] as const;
        }
      },
    );
  });
