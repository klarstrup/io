import type { TopLoggerAuthTokens } from "../lib";
import type { Grippy } from "./grippy";

type UserDataSourceConfig =
  | {
      source: DataSource.Fitocracy;
      config: { userId: number };
    }
  | {
      source: DataSource.MyFitnessPal;
      config: { token: string; userName: string; userId: string };
    }
  | {
      source: DataSource.RunDouble;
      config: { id: string };
    }
  | {
      source: DataSource.TopLogger;
      config: {
        id: number; // This only supports the old TopLogger API & is used to render events from the old TopLogger scrapes
        graphQLId: string; // This supports the new TopLogger API & is used to render workouts from the new TopLogger scrapes
        authTokens: TopLoggerAuthTokens;
      };
    }
  | {
      source: DataSource.ICal;
      config: { url: string };
    }
  | {
      source: DataSource.KilterBoard;
      config: { token: string; user_id: string };
    }
  | {
      source: DataSource.Tomorrow;
      config: { geohash: string };
    }
  | {
      source: DataSource.Grippy;
      config: { authTokens: Grippy.AuthTokens };
    }
  | {
      source: DataSource.Crimpd;
      config: { token: string };
    }
    | {
      source: DataSource.ClimbAlong;
      config: { token: string; userId: string };
    }| {
      source: DataSource.Onsight;
      config: { token: string; username: string };
    };

export interface UserDataSourceMeta {
  id: string;
  name: string;
  updatedAt: Date;
  createdAt: Date;
  lastAttemptedAt: Date | null;
  lastSuccessfulAt: Date | null;
  lastSuccessfulRuntime: number | null;
  lastResult: string | null;
  lastFailedAt: Date | null;
  lastFailedRuntime: number | null;
  lastError: string | null;
}

export type UserDataSource = UserDataSourceConfig & UserDataSourceMeta;

export enum DataSource {
  Fitocracy = "fitocracy",
  MyFitnessPal = "myfitnesspal",
  RunDouble = "rundouble",
  TopLogger = "toplogger",
  ICal = "ical",
  KilterBoard = "kilterboard",
  Tomorrow = "tomorrow",
  Grippy = "grippy",
  Crimpd = "crimpd",
  ClimbAlong = "climbalong",
  Onsight = "onsight",
  /* These are special and not configurable to the user for various reasons
  Sportstiming = "sportstiming",
  Songkick = "songkick",
  */
}

export const dataSourceGroups = {
  workouts: [
    DataSource.Fitocracy,
    DataSource.RunDouble,
    DataSource.TopLogger,
    DataSource.KilterBoard,
    DataSource.Grippy,
    DataSource.Crimpd,
    DataSource.ClimbAlong,
    DataSource.Onsight,
  ],
  food: [DataSource.MyFitnessPal],
  events: [DataSource.ICal],
  weather: [DataSource.Tomorrow],
};
