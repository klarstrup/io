import * as z from "zod";
import type { TopLoggerAuthTokens } from "../lib";
import type { ExerciseData } from "../models/exercises.types";
import type { DSB } from "./dsb";
import type { Grippy } from "./grippy";
import type { SnapCalorie } from "./snapcalorie";

import { ReactElement } from "react";
import {
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { UserStuffGeohashInput } from "../components/UserStuffGeohashInput";
import type { Withings } from "./withings";

type UserDataSourceConfig =
  | {
      source: DataSource.Fitocracy;
      config: z.infer<
        (typeof dataSources)[DataSource.Fitocracy]["configSchema"]
      >;
    }
  | {
      source: DataSource.MyFitnessPal;
      config: { token: string; userName: string; userId: string };
    }
  | {
      source: DataSource.SnapCalorie;
      config: { authTokens: SnapCalorie.Auth };
    }
  | {
      source: DataSource.Meyers;
      config: Record<string, never>;
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
      config: { url: string; startDate?: Date; endDate?: Date };
    }
  | {
      source: DataSource.KilterBoard;
      config: { token: string; user_id: string };
    }
  | {
      source: DataSource.MoonBoard;
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
    }
  | {
      source: DataSource.Onsight;
      config: { token: string; username: string };
    }
  | {
      source: DataSource.Sportstiming;
      config: { name: string };
    }
  | {
      source: DataSource.Songkick;
      config: { artistId: number; startDate?: Date; endDate?: Date };
    }
  | {
      source: DataSource.Withings;
      config: {
        accessTokenResponse: Withings.AccessTokenResponse;
        backfilledSleepSummaries?: boolean;
        backfilledMeasureGroups?: boolean;
      };
    }
  | {
      source: DataSource.Spiir;
      config: {
        SessionKey: string;
        balanceCutoff?: number | null;
        balanceDisplayCeiling?: number | null;
      };
    }
  | {
      source: DataSource.DSB;
      config: { authTokens: DSB.AuthTokens };
    }
  | { source: DataSource.PostNord; config: {} };

export interface UserDataSourceMeta {
  id: string;
  name: string;
  paused?: boolean;
  updatedAt: Date;
  createdAt: Date;
  lastMaterializedAt: Date | null;
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
  Meyers = "meyers",
  RunDouble = "rundouble",
  TopLogger = "toplogger",
  ICal = "ical",
  KilterBoard = "kilterboard",
  MoonBoard = "moonboard",
  Tomorrow = "tomorrow",
  Grippy = "grippy",
  Crimpd = "crimpd",
  ClimbAlong = "climbalong",
  Onsight = "onsight",
  Sportstiming = "sportstiming",
  Songkick = "songkick",
  Withings = "withings",
  Spiir = "spiir",
  SnapCalorie = "snapcalorie",
  DSB = "dsb",
  PostNord = "postnord",
}

export const exerciseIdToDataSourceMapping: Partial<
  Record<ExerciseData["id"], DataSource[]>
> = {
  518: [DataSource.RunDouble, DataSource.Sportstiming],
  1434: [DataSource.Grippy],
  2001: [DataSource.TopLogger, DataSource.ClimbAlong, DataSource.Onsight],
  2003: [DataSource.KilterBoard, DataSource.MoonBoard],
  2006: [DataSource.Grippy],
};

export const dataSources = {
  [DataSource.Fitocracy]: {
    source: DataSource.Fitocracy,
    isDeprecated: true,
    configSchema: z.object({ userId: z.number().default(NaN) }),
    getFormElements: ({ register }) => (
      <label className="flex flex-col gap-1">
        User ID:
        <input
          type="number"
          {...register("config.userId", {
            required: true,
            valueAsNumber: true,
          })}
          placeholder="User ID"
          className="w-full"
        />
      </label>
    ),
  },
  [DataSource.MyFitnessPal]: {
    source: DataSource.MyFitnessPal,
    isDeprecated: false,
    configSchema: z.object({
      token: z.string().default(""),
      userName: z.string().default(""),
      userId: z.string().default(""),
    }),
    getFormElements: ({ register }) => (
      <>
        <label className="flex flex-col gap-1">
          Token:
          <input
            type="text"
            {...register("config.token", { required: true })}
            placeholder="Token"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          Username:
          <input
            type="text"
            {...register("config.userName", { required: true })}
            placeholder="User Name"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          User ID:
          <input
            type="text"
            {...register("config.userId", { required: true })}
            placeholder="User ID"
            className="w-full"
          />
        </label>
      </>
    ),
  },
  [DataSource.SnapCalorie]: {
    source: DataSource.SnapCalorie,
    isDeprecated: false,
    configSchema: z.object({
      authTokens: z.object({
        accessToken: z.string().default(""),
        refreshToken: z.string().default(""),
      }),
    }),
    getFormElements: ({ register, watch, setValue }) => (
      <label className="flex flex-col gap-1">
        Auth Tokens:
        <input
          type="text"
          // eslint-disable-next-line react-hooks/incompatible-library
          value={JSON.stringify(watch("config.authTokens"))}
          onChange={(e) => {
            const value = e.target.value;
            const authTokens = JSON.parse(value) as unknown as z.infer<
              (typeof dataSources)[DataSource.SnapCalorie]["configSchema"]
            >["authTokens"];

            setValue("config.authTokens", authTokens, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          className="w-full font-mono"
        />
      </label>
    ),
  },
  [DataSource.Meyers]: {
    source: DataSource.Meyers,
    isDeprecated: false,
    configSchema: z.object({}),
    getFormElements: () => (
      <div>Meyers does not require any configuration.</div>
    ),
  },
  [DataSource.RunDouble]: {
    source: DataSource.RunDouble,
    isDeprecated: false,
    configSchema: z.object({ id: z.string().default("") }),
    getFormElements: ({ register }) => (
      <label className="flex flex-col gap-1">
        ID:
        <input
          type="text"
          {...register("config.id", { required: true })}
          placeholder="ID"
          className="w-full"
        />
      </label>
    ),
  },
  [DataSource.TopLogger]: {
    source: DataSource.TopLogger,
    isDeprecated: false,
    configSchema: z.object({
      id: z.number().default(NaN),
      graphQLId: z.string().default(""),
      authTokens: z.object({
        access: z.object({
          token: z.string().default(""),
          expiresAt: z.number().default(NaN),
          __typename: z.literal("AuthToken"),
        }),
        refresh: z.object({
          token: z.string().default(""),
          expiresAt: z.number().default(NaN),
          __typename: z.literal("AuthToken"),
        }),
        __typename: z.literal("AuthTokens"),
      }),
    }),
    getFormElements: ({ register, watch, setValue }) => (
      <>
        <label className="flex flex-col gap-1">
          ID:
          <input
            type="number"
            {...register("config.id", { required: true })}
            placeholder="ID"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          GraphQL ID:
          <input
            type="text"
            {...register("config.graphQLId", { required: true })}
            placeholder="GraphQL ID"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          Auth Tokens:
          <input
            type="text"
            value={JSON.stringify(watch("config.authTokens"))}
            onChange={(e) => {
              const value = e.target.value;
              const authTokens = JSON.parse(
                value,
              ) as unknown as TopLoggerAuthTokens;

              setValue("config.authTokens", authTokens, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            className="w-full font-mono"
          />
        </label>
      </>
    ),
  },
  [DataSource.ICal]: {
    source: DataSource.ICal,
    isDeprecated: false,
    configSchema: z.object({
      url: z.string().default(""),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }),
    getFormElements: ({ register }) => (
      <>
        <label className="flex flex-col gap-1">
          iCal URL:{" "}
          <input
            type="text"
            {...register("config.url", { required: true })}
            placeholder="URL"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          Start Date (optional):{" "}
          <input
            type="datetime-local"
            {...register("config.startDate", { valueAsDate: true })}
            placeholder="Start Date"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          End Date (optional):{" "}
          <input
            type="datetime-local"
            {...register("config.endDate", { valueAsDate: true })}
            placeholder="End Date"
            className="w-full"
          />
        </label>
      </>
    ),
  },
  [DataSource.KilterBoard]: {
    source: DataSource.KilterBoard,
    isDeprecated: false,
    configSchema: z.object({
      token: z.string().default(""),
      user_id: z.string().default(""),
    }),
    getFormElements: ({ register }) => (
      <>
        <label className="flex flex-col gap-1">
          Token:
          <input
            type="text"
            {...register("config.token", { required: true })}
            placeholder="Token"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          User ID:
          <input
            type="text"
            {...register("config.user_id", { required: true })}
            placeholder="User ID"
            className="w-full"
          />
        </label>
      </>
    ),
  },
  [DataSource.MoonBoard]: {
    source: DataSource.MoonBoard,
    isDeprecated: false,
    configSchema: z.object({
      token: z.string().default(""),
      user_id: z.string().default(""),
    }),
    getFormElements: ({ register }) => (
      <>
        <label className="flex flex-col gap-1">
          Token:
          <input
            type="text"
            {...register("config.token", { required: true })}
            placeholder="Token"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          User ID:
          <input
            type="text"
            {...register("config.user_id", { required: true })}
            placeholder="User ID"
            className="w-full"
          />
        </label>
      </>
    ),
  },
  [DataSource.Grippy]: {
    source: DataSource.Grippy,
    isDeprecated: false,
    configSchema: z.object({
      authTokens: z.object({
        access_token: z.string().default(""),
        expires_in: z.number().default(NaN),
        scope: z.string().default(""),
        token_type: z.string().default(""),
        refresh_token: z.string().default(""),
      }),
    }),
    getFormElements: ({ watch, setValue }) => (
      <>
        <label className="flex flex-col gap-1">
          Auth Tokens:
          <input
            type="text"
            value={JSON.stringify(watch("config.authTokens"))}
            onChange={(e) => {
              const value = e.target.value;
              const authTokens = JSON.parse(value) as unknown as z.infer<
                (typeof dataSources)[DataSource.Grippy]["configSchema"]
              >["authTokens"];

              setValue("config.authTokens", authTokens, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            className="w-full font-mono"
          />
        </label>
      </>
    ),
  },
  [DataSource.Crimpd]: {
    source: DataSource.Crimpd,
    isDeprecated: false,
    configSchema: z.object({
      token: z.string().default(""),
    }),
    getFormElements: ({ register }) => (
      <label className="flex flex-col gap-1">
        Token:
        <input
          type="text"
          {...register("config.token", { required: true })}
          placeholder="Token"
          className="w-full"
        />
      </label>
    ),
  },
  [DataSource.ClimbAlong]: {
    source: DataSource.ClimbAlong,
    isDeprecated: false,
    configSchema: z.object({
      token: z.string().default(""),
      userId: z.string().default(""),
    }),
    getFormElements: ({ register }) => (
      <>
        <label className="flex flex-col gap-1">
          Token:
          <input
            type="text"
            {...register("config.token", { required: true })}
            placeholder="Token"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          User ID:
          <input
            type="text"
            {...register("config.userId", { required: true })}
            placeholder="User ID"
            className="w-full"
          />
        </label>
      </>
    ),
  },
  [DataSource.Tomorrow]: {
    source: DataSource.Tomorrow,
    isDeprecated: false,
    configSchema: z.object({
      geohash: z.string().default(""),
    }),
    getFormElements: ({ watch, setValue }) => (
      <label className="flex flex-col gap-1">
        Geohash:{" "}
        <UserStuffGeohashInput
          geohash={watch("config.geohash")}
          onGeohashChange={(geohash) => {
            setValue("config.geohash", geohash, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
      </label>
    ),
  },
  [DataSource.Onsight]: {
    source: DataSource.Onsight,
    isDeprecated: false,
    configSchema: z.object({
      token: z.string().default(""),
      username: z.string().default(""),
    }),
    getFormElements: ({ register }) => (
      <>
        <label className="flex flex-col gap-1">
          Token:{" "}
          <input
            type="text"
            {...register("config.token")}
            placeholder="Token"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          Username (Email):{" "}
          <input
            type="text"
            {...register("config.username")}
            placeholder="Username (Email)"
            className="w-full"
          />
        </label>
      </>
    ),
  },
  [DataSource.Sportstiming]: {
    source: DataSource.Sportstiming,
    isDeprecated: false,
    configSchema: z.object({
      name: z.string().default(""),
    }),
    getFormElements: ({ register }) => (
      <label className="flex flex-col gap-1">
        Name:
        <input
          type="text"
          {...register("config.name", { required: true })}
          placeholder="Name"
          className="w-full"
        />
      </label>
    ),
  },
  [DataSource.Songkick]: {
    source: DataSource.Songkick,
    isDeprecated: false,
    configSchema: z.object({
      artistId: z.number().default(NaN),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }),
    getFormElements: ({ register }) => (
      <>
        <label className="flex flex-col gap-1">
          Artist ID:
          <input
            type="number"
            {...register("config.artistId", {
              required: true,
              valueAsNumber: true,
            })}
            placeholder="Artist ID"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          Start Date (optional):{" "}
          <input
            type="datetime-local"
            {...register("config.startDate", { valueAsDate: true })}
            placeholder="Start Date"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          End Date (optional):{" "}
          <input
            type="datetime-local"
            {...register("config.endDate", { valueAsDate: true })}
            placeholder="End Date"
            className="w-full"
          />
        </label>
      </>
    ),
  },
  [DataSource.Withings]: {
    source: DataSource.Withings,
    isDeprecated: false,
    configSchema: z.object({
      accessTokenResponse: z.object({
        userid: z.number().default(NaN),
        access_token: z.string().default(""),
        refresh_token: z.string().default(""),
        expires_in: z.number().default(0),
        scope: z.string().default(""),
        csrf_token: z.string().default(""),
        token_type: z.string().default(""),
      }),
      backfilledSleepSummaries: z.boolean().optional(),
      backfilledMeasureGroups: z.boolean().optional(),
    }),
    getFormElements: ({ watch }) => (
      <label className="flex flex-col gap-1">
        Access Token Response:
        <code>
          {JSON.stringify(watch("config.accessTokenResponse"), null, 2)}
        </code>
      </label>
    ),
  },
  [DataSource.Spiir]: {
    source: DataSource.Spiir,
    isDeprecated: true,
    configSchema: z.object({
      SessionKey: z.string().default(""),
      balanceCutoff: z.number().nullable().optional(),
      balanceDisplayCeiling: z.number().nullable().optional(),
    }),
    getFormElements: ({ register }) => (
      <>
        <label className="flex flex-col gap-1">
          Session Key:
          <input
            type="text"
            {...register("config.SessionKey")}
            placeholder="Session Key"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          Balance Cutoff (optional):
          <input
            type="number"
            {...register("config.balanceCutoff", { valueAsNumber: true })}
            placeholder="Balance Cutoff"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          Balance Display Ceiling (optional):
          <input
            type="number"
            {...register("config.balanceDisplayCeiling", {
              valueAsNumber: true,
            })}
            placeholder="Balance Display Ceiling"
            className="w-full"
          />
        </label>
      </>
    ),
  },
  [DataSource.DSB]: {
    source: DataSource.DSB,
    isDeprecated: false,
    configSchema: z.object({
      authTokens: z.object({
        access_token: z.string().default(""),
        refresh_token: z.string().default(""),
        expires_in: z.number().default(0),
        token_type: z.string().default(""),
        scope: z.string().default(""),
      }),
    }),
    getFormElements: ({ watch, setValue }) => (
      <label className="flex flex-col gap-1">
        Auth Tokens:
        <input
          type="text"
          value={JSON.stringify(watch("config.authTokens"))}
          onChange={(e) => {
            const value = e.target.value;
            const authTokens = JSON.parse(value) as unknown as z.infer<
              (typeof dataSources)[DataSource.DSB]["configSchema"]
            >["authTokens"];
            setValue("config.authTokens", authTokens);
          }}
          placeholder="Auth Tokens"
          className="w-full"
        />
      </label>
    ),
  },
  [DataSource.PostNord]: {
    source: DataSource.PostNord,
    isDeprecated: false,
    configSchema: z.object({}),
    getFormElements: () => null,
  },
} satisfies DataSourceMap;

type DataSourceMap = {
  [key in DataSource]: {
    source: key;
    isDeprecated?: boolean;
    configSchema: z.Schema<any>;
    getFormElements: (props: {
      register: UseFormRegister<UserDataSource>;
      watch: UseFormWatch<UserDataSource>;
      setValue: UseFormSetValue<UserDataSource>;
    }) => ReactElement | null;
  };
};
