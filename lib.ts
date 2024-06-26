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

export type EventEntry =
  | {
      id: number;
      ioId: number;
      source: "toplogger";
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
      source: "climbalong";
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
      source: "sportstiming";
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
      source: "songkick";
      type: "performance";
      discipline: "metal";
      event: string;
      subEvent: string | null;
      venue: string | null;
      location: string | null;
      start: Date;
      end: Date;
    };
