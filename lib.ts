import type { WorkoutData } from "./models/workout";
import type { MyFitnessPal } from "./sources/myfitnesspal";
import { VCalendar, VEvent } from "./vendor/ical";

export interface DateInterval {
  start: Date;
  end: Date;
}

export enum SCORING_SYSTEM {
  TOPS_AND_ZONES = "TOPS_AND_ZONES",
  THOUSAND_DIVIDE_BY = "THOUSAND_DIVIDE_BY",
  POINTS = "POINTS",
  DISTANCE_RACE = "DISTANCE_RACE",
}

export enum SCORING_SOURCE {
  DERIVED = "DERIVED",
  OFFICIAL = "OFFICIAL",
}

export interface BaseScore {
  system: SCORING_SYSTEM;
  source: SCORING_SOURCE;
  rank: number;
  percentile: string;
}

export interface DistanceRaceScore extends BaseScore {
  system: SCORING_SYSTEM.DISTANCE_RACE;
  duration: number;
  distance: number;
}
export interface PointsScore extends BaseScore {
  system: SCORING_SYSTEM.POINTS;
  points: number;
}
export interface ThousandDivideByScore extends BaseScore {
  system: SCORING_SYSTEM.THOUSAND_DIVIDE_BY;
  points: number;
}
export interface TopsAndZonesScore extends BaseScore {
  system: SCORING_SYSTEM.TOPS_AND_ZONES;
  tops: number;
  zones: number;
  topsAttempts: number;
  zonesAttempts: number;
}

export type Score =
  | DistanceRaceScore
  | PointsScore
  | TopsAndZonesScore
  | ThousandDivideByScore;

export enum EventSource {
  TopLogger = "toplogger",
  ClimbAlong = "climbalong",
  Sportstiming = "sportstiming",
  Songkick = "songkick",
}

export type EventEntry =
  | {
      id: number;
      ioId: number;
      source: EventSource.TopLogger;
      type: "competition";
      discipline: "bouldering";
      event: string;
      subEvent: string | null;
      venue: string | null;
      location: string | null;
      start: Date;
      end: Date;
    }
  | {
      id: number;
      ioId: number;
      source: EventSource.ClimbAlong;
      type: "competition";
      discipline: "bouldering";
      event: string;
      subEvent: string | null;
      venue: string | null;
      location: string | null;
      start: Date;
      end: Date;
    }
  | {
      id: number;
      ioId: number;
      source: EventSource.Sportstiming;
      type: "competition";
      discipline: "running";
      event: string;
      subEvent: string | null;
      venue: string | null;
      location: string | null;
      start: Date;
      end: Date;
    }
  | {
      id: number;
      source: EventSource.Songkick;
      type: "performance";
      discipline: "metal";
      event: string;
      subEvent: string | null;
      venue: string | null;
      location: string | null;
      start: Date;
      end: Date;
    };

export interface DiaryEntry {
  workouts?: (WorkoutData & { _id: string })[];
  food?: (MyFitnessPal.FoodEntry & { _id: string })[];
}

export interface ScrapedAt {
  _io_scrapedAt?: Date;
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

export interface VEventWithVCalendar extends VEvent {
  calendar: VCalendar;
}

export interface IcalIoMeta {
  _io_userId: string;
  /** This is a hash of the iCal URL and the user ID */
  _io_icalUrlHash: string;
}
export interface MongoVEventWithVCalendar
  extends Omit<VEventWithVCalendar, "recurrences">,
    ScrapedAt,
    IcalIoMeta {
  recurrences?: Omit<VEvent, "recurrences">[];
}

export interface TomorrowIoMeta {
  _io_geohash: string;
}

export interface MongoTomorrowInterval
  extends Omit<TomorrowResponseTimelineInterval, "startTime">,
    ScrapedAt,
    TomorrowIoMeta {
  startTime: Date;
}

export enum PRType {
  AllTime = "allTimePR",
  OneYear = "oneYearPR",
  ThreeMonths = "threeMonthPR",
}

export function isPRType(value: unknown): value is PRType {
  return (
    typeof value === "string" && Object.values(PRType).includes(value as PRType)
  );
}
