import type { LocationData } from "./models/location";
import type { WorkoutData, WorkoutSource } from "./models/workout";
import type { Grippy } from "./sources/grippy";
import type { MyFitnessPal } from "./sources/myfitnesspal";
import type { DataSource } from "./sources/utils";
import type { VCalendar, VEvent, VTodo } from "./vendor/ical";

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

export interface EventEntry {
  id: string | number;
  ioId?: string | number;
  source: EventSource;
  type: "competition" | "performance";
  discipline: "bouldering" | "running" | "metal";
  eventName: string;
  subEventName?: string | null;
  venue: string | null;
  location?: string | null;
  start: Date;
  end: Date;
}

export interface EventDetails extends EventEntry {
  url: string;
  team?: string | null;
  rounds?: EventRound[];
}

export interface EventRound {
  id?: string | number;
  venue?: string | null;
  location?: string | null;
  start?: Date;
  end?: Date;
  roundName?: string;
  category?: string | null;
  noParticipants?: number;
  problems?: number;
  problemByProblem?: PP[] | null;
  scores?: Score[];
}

export interface PP {
  number: string | number;
  color: string | undefined;
  grade: number | undefined;
  attempt: boolean;
  zone: boolean;
  top: boolean;
  flash: boolean;
  repeat: boolean;
  name?: string;
  angle?: number;
  circuit?: NonNullable<LocationData["boulderCircuits"]>[number];
  attemptCount?: number | null;
  estGrade?: number | null;
}

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
  _io_icalUrlHash?: string;
  _io_source: DataSource.ICal | WorkoutSource.Self;
}
export interface MongoVEventWithVCalendar
  extends Omit<VEventWithVCalendar, "recurrences">,
    ScrapedAt,
    IcalIoMeta {
  recurrences?: Omit<VEvent, "recurrences">[];
}
export interface MongoVEvent
  extends Omit<VEvent, "recurrences">,
    ScrapedAt,
    IcalIoMeta {
  recurrences?: Omit<VEvent, "recurrences">[];
}
export interface MongoVTodo
  extends Omit<VTodo, "recurrences">,
    ScrapedAt,
    IcalIoMeta {
  recurrences?: Omit<VTodo, "recurrences">[];
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

export enum ExerciseHistoryTimeframe {
  AllTime = "all-time",
  ThisYear = "this-year",
  PastYear = "past-year",
  Past6Months = "past-6-months",
  Past3Months = "past-3-months",
  PastMonth = "past-month",
}
export const isExerciseHistoryTimeframe = (
  value: unknown,
): value is ExerciseHistoryTimeframe =>
  typeof value === "string" &&
  Object.values(ExerciseHistoryTimeframe).includes(
    value as ExerciseHistoryTimeframe,
  );
