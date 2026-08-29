import type { ScrapedAt } from "../lib";

export interface TomorrowIoMeta {
  _io_geohash: string;
  _io_point?: {
    type: "Point";
    coordinates: [longitude: number, latitude: number];
  };
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
  extends
    Omit<TomorrowResponseTimelineInterval, "startTime">,
    ScrapedAt,
    TomorrowIoMeta {
  startTime: Date;
}
