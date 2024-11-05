import type { WithId } from "mongodb";
import { dbFetch } from "../fetch";
import { Unit } from "../models/exercises";
import { type WorkoutData, WorkoutSource } from "../models/workout";
import { RelativeURL } from "../utils";

export namespace RunDouble {
  export interface HistoryResponse {
    history: HistoryItem[];
    recruits: unknown[];
    user: User;
    cursor?: string;
    loggedInUser: boolean;
    metric: boolean;
  }

  export interface HistoryItem {
    key: number;
    auth?: string;
    completed: string;
    /** Milliseconds since 1970 */
    completedLong: number;
    stageName: string;
    shortCode: string;
    /** Meters */
    runDistance: number;
    /** Milliseconds */
    runTime: number;
    polyline: string;
    /** Kilometers per minute */
    runPace: number;
  }

  export interface MongoHistoryItem extends HistoryItem {
    userId: string;
    completedAt: Date;
  }

  export interface User {
    bestName: string;
    gravatarHash: string;
    points: number;
    referalPoints: number;
    totalPoints: number;
  }

  export interface PlanResponse {
    plan: Plan;
    code: string;
    owner: boolean;
    metric: boolean;
    UID: string;
    authedStrava: boolean;
  }

  export interface Plan {
    id: number;
    instanceid: string;
    planid: string;
    auth: string;
    completed: string;
    mapdata?: Mapdata;
    dataRecord: DataRecord;
    userAuth?: string;
    userNickname: string;
    userGravatar: string;
    stageName: string;
    notes: string;
    planPrivacy: string;
    mapPrivacy: string;
    /** Meters */
    runDistance: number;
    /** Milliseconds */
    runTime: number;
    /** Kilometers per minute */
    runPaceInv: number;
    /** Meters */
    totalDistance: number;
    /** Milliseconds */
    totalTime: number;
    /** Kilometers per minute */
    totalPaceInv: number;
    stages: Stage[];
    /** Milliseconds since 1970 */
    completedLong: number;
    calories: Calories;
    polyline: string;
  }

  export interface Calories {
    totalCals: number;
    runCals: number;
  }

  export interface DataRecord {
    dataPoints: DataPoint[];
    hrPresent: boolean;
    pacePresent: boolean;
  }

  export interface DataPoint {
    /** Milliseconds */
    time: number;
    /** Meters */
    distance: number;
    /** Minutes per mile (wtf) */
    pace: number;
    /** BPM */
    heartRate: number;
    stageIndicator: string;
  }

  export interface Mapdata {
    locations: MapdataLocation[];
    maxLat: number;
    minLat: number;
    maxLng: number;
    minLng: number;
  }

  export interface MapdataLocation {
    stageIndicator: string;
    locations: LocationLocation[];
  }

  export interface LocationLocation {
    lat: number;
    lng: number;
    /** Meters */
    altitude: number;
    /** Milliseconds */
    time: number;
    stageIndicator: string;
  }

  export interface Stage {
    /** Meters */
    accumDistance: number;
    /** Milliseconds */
    accumTime: number;
    stageindicator: string;
    /** Kilometers per minute */
    paceInv: number;
  }
}

const fetchRunDouble = async <T>(
  input: string | URL,
  init?: RequestInit,
  dbFetchOptions?: Parameters<typeof dbFetch>[2],
) =>
  dbFetch<T>(
    `https://www.rundouble.com/rundoublesite${String(input)}`,
    init,
    dbFetchOptions,
  );

export async function* getRuns(
  userId: string,
  dbFetchOptions?: Parameters<typeof dbFetch>[2],
) {
  let cursor: string | undefined = undefined;
  do {
    const url = new RelativeURL("/history");
    url.searchParams.set("user", userId);
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetchRunDouble<RunDouble.HistoryResponse>(
      url,
      undefined,
      dbFetchOptions,
    );
    cursor = response.cursor;
    yield* response.history;
  } while (cursor);
}

export const getRunDoubleUser = async (
  userId: string,
  dbFetchOptions?: Parameters<typeof dbFetch>[2],
) => {
  const url = new RelativeURL("/history");
  url.searchParams.set("user", userId);

  return (
    await fetchRunDouble<RunDouble.HistoryResponse>(
      url,
      undefined,
      dbFetchOptions,
    )
  ).user;
};

export function workoutFromRunDouble(
  run: WithId<RunDouble.MongoHistoryItem>,
): WithId<WorkoutData> {
  return {
    _id: run._id,
    exercises: [
      {
        exerciseId: 518,
        sets: [
          {
            inputs: [
              { unit: Unit.SEC, value: run.runTime / 1000 },
              { unit: Unit.M, value: run.runDistance },
              { unit: Unit.MinKM, value: 0.6215 / run.runPace },
            ],
          },
        ],
      },
    ],
    userId: "rundouble",
    createdAt: new Date(run.completedLong),
    updatedAt: new Date(run.completedLong),
    workedOutAt: new Date(run.completedLong),
    source: WorkoutSource.RunDouble,
  };
}
