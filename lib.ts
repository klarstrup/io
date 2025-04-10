import type { WorkoutData } from "./models/workout";
import type { Grippy } from "./sources/grippy";
import type { MyFitnessPal } from "./sources/myfitnesspal";
import type { VCalendar, VEvent } from "./vendor/ical";

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
  Onsight = "onsight",
}

export type EventEntry =
  | {
      id: string;
      ioId: string;
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
      id: string;
      ioId: string;
      source: EventSource.Onsight;
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

export interface TopLoggerAuthToken {
  token: string;
  expiresAt: string;
  __typename: "AuthToken";
}

export interface TopLoggerAuthTokens {
  access: TopLoggerAuthToken;
  refresh: TopLoggerAuthToken;
  __typename: "AuthTokens";
}

export const isAuthTokens = (obj: unknown): obj is TopLoggerAuthTokens =>
  Boolean(
    obj &&
      typeof obj === "object" &&
      "access" in obj &&
      typeof obj.access === "object" &&
      obj.access &&
      "token" in obj.access &&
      typeof obj.access.token === "string" &&
      "expiresAt" in obj.access &&
      typeof obj.access.expiresAt === "string" &&
      "refresh" in obj &&
      typeof obj.refresh === "object" &&
      obj.refresh &&
      "token" in obj.refresh &&
      typeof obj.refresh.token === "string" &&
      "expiresAt" in obj.refresh &&
      typeof obj.refresh.expiresAt === "string",
  );

export const isGrippyAuthTokens = (obj: unknown): obj is Grippy.AuthTokens =>
  Boolean(
    obj &&
      typeof obj === "object" &&
      "access_token" in obj &&
      typeof obj.access_token === "string" &&
      "expires_in" in obj &&
      typeof obj.expires_in === "number" &&
      "refresh_token" in obj &&
      typeof obj.refresh_token === "string",
  );

export enum PRType {
  AllTime = "allTimePR",
  OneYear = "oneYearPR",
  ThreeMonths = "threeMonthPR",
}

export const isPRType = (value: unknown): value is PRType =>
  typeof value === "string" && Object.values(PRType).includes(value as PRType);
