import { TZDate } from "@date-fns/tz";
import { addDays, endOfDay, startOfDay, subSeconds } from "date-fns";
import { dbFetch } from "../fetch";
import type { ScrapedAt, TomorrowIoMeta, TomorrowResponse } from "../lib";
import { decodeGeohash, DEFAULT_TIMEZONE, HOUR_IN_SECONDS } from "../utils";
import { TomorrowIntervals } from "./tomorrow.server";

export async function fetchTomorrowTimelineIntervals({
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

  return (
    (
      await dbFetch<TomorrowResponse>(tomorrowUrl, undefined, {
        maxAge: HOUR_IN_SECONDS,
      })
    ).data?.timelines[0]?.intervals ?? []
  );
}

export async function getTomorrowForecasts({
  geohash,
  start,
  end,
}: {
  geohash?: string | null;
  start: Date;
  end: Date;
}) {
  if (!geohash) return;

  const intervals: (TomorrowResponse &
    ScrapedAt &
    TomorrowIoMeta & { _id: string })[] = [];

  for await (const document of TomorrowIntervals.find({
    _io_geohash: geohash.slice(0, 4),
    startTime: { $gte: start, $lt: end },
  })) {
    intervals.push({ ...document, _id: document._id.toString() });
  }
  return intervals;
}
