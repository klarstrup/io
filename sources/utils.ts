import type { TopLoggerAuthTokens } from "../lib";

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
    };

export interface UserDataSourceMeta {
  id: string;
  name: string;
  updatedAt: Date;
  createdAt: Date;
  lastAttemptedAt: Date | null;
  lastSuccessfulAt: Date | null;
  lastSuccesfulRuntime: number | null;
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
  /* These are special and not configurable to the user for various reasons
  KilterBoard = "kilterboard",s
  ClimbAlong = "climbalong",
  Sportstiming = "sportstiming",
  Songkick = "songkick",
  Tomorrow = "tomorrow",
  */
}
