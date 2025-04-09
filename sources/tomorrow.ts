import type { ScrapedAt } from "../lib";
import { TomorrowIntervals } from "./tomorrow.server";

export interface TomorrowIoMeta {
  _io_geohash: string;
}

export interface TomorrowResponseTimelineInterval {
  startTime: string;
  values: {
    cloudCover: number;
    humidity: number;
    precipitationIntensity: number;
    precipitationProbability: number;
    precipitationType: number;
    temperatureApparent: number;
    weatherCode: number;
    windGust: number;
    windSpeed: number;
    sunriseTime: string;
    sunsetTime: string;
  };
}

export interface TomorrowResponse {
  data: {
    timelines: {
      timestep: string;
      endTime: string;
      startTime: string;
      intervals: TomorrowResponseTimelineInterval[];
    }[];
  };
}
export interface MongoTomorrowInterval
  extends Omit<TomorrowResponseTimelineInterval, "startTime">,
    ScrapedAt,
    TomorrowIoMeta {
  startTime: Date;
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

  return (
    await TomorrowIntervals.find({
      _io_geohash: geohash.slice(0, 4),
      startTime: { $gte: start, $lt: end },
    })

      .toArray()
  ).map((document) => ({ ...document, _id: document._id.toString() }));
}
