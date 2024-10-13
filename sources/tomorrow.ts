import { TZDate } from "@date-fns/tz";
import {
  addDays,
  addHours,
  addWeeks,
  endOfDay,
  isWithinInterval,
  startOfDay,
  subSeconds,
} from "date-fns";
import { dbFetch } from "../fetch";
import { TomorrowResponse } from "../lib";
import { decodeGeohash, HOUR_IN_SECONDS } from "../utils";

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
  const userLocation = geohash && decodeGeohash(geohash.slice(0, 4));
  tomorrowUrl.searchParams.set(
    "location",
    userLocation
      ? `${userLocation.latitude},${userLocation.longitude}`
      : `55.658693,12.489322`,
  );
  tomorrowUrl.searchParams.set(
    "startTime",
    subSeconds(startOfDay(TZDate.tz("Europe/Copenhagen")), 1).toISOString(),
  );
  tomorrowUrl.searchParams.set(
    "endTime",
    subSeconds(
      endOfDay(addDays(TZDate.tz("Europe/Copenhagen"), 4)),
      1,
    ).toISOString(),
  );
  tomorrowUrl.searchParams.set("timezone", "Europe/Copenhagen");
  tomorrowUrl.searchParams.set(
    "fields",
    "temperatureApparent,humidity,windSpeed,windDirection,windGust,precipitationIntensity,precipitationProbability,precipitationType,cloudCover,weatherCode",
  );
  tomorrowUrl.searchParams.set("timesteps", "1h");
  tomorrowUrl.searchParams.set("units", "metric");
  tomorrowUrl.searchParams.set("apikey", process.env.TOMORROW_API_KEY);
  return (
    await dbFetch<TomorrowResponse>(tomorrowUrl, undefined, {
      maxAge: HOUR_IN_SECONDS,
    })
  ).data?.timelines[0]?.intervals!;
}
