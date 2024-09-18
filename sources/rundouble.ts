import { dbFetch } from "../fetch";
import { InputType, Unit } from "../models/exercises";
import { WorkoutData, WorkoutSource } from "../models/workout";
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
    auth: string;
    completed: string;
    completedLong: number;
    stageName: string;
    shortCode: string;
    /** Run distance in meters */
    runDistance: number;
    /** Run duration in milliseconds */
    runTime: number;
    polyline: string;
    runPace: number;
  }

  export interface User {
    bestName: string;
    gravatarHash: string;
    points: number;
    referalPoints: number;
    totalPoints: number;
  }
}

const fetchRunDouble = async <T>(
  input: string | URL,
  init?: RequestInit,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  dbFetch<T>(
    `https://www.rundouble.com/rundoublesite${String(input)}`,
    init,
    dbFetchOptions
  );

export const getRuns = async (
  userId: string,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) => {
  let cursor: string | undefined = undefined;
  const runs: RunDouble.HistoryItem[] = [];
  do {
    const url = new RelativeURL("/history");
    url.searchParams.set("user", userId);
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetchRunDouble<RunDouble.HistoryResponse>(
      url,
      undefined,
      dbFetchOptions
    );
    cursor = response.cursor;
    runs.push(...response.history);
  } while (cursor);
  return runs;
};
export const getRunDoubleUser = async (
  userId: string,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new RelativeURL("/history");
  url.searchParams.set("user", userId);

  return (
    await fetchRunDouble<RunDouble.HistoryResponse>(
      url,
      undefined,
      dbFetchOptions
    )
  ).user;
};

export function workoutFromRunDouble(
  run: RunDouble.HistoryItem
): WorkoutData & { _id: string } {
  return {
    _id: `rundouble-${run.key}`,
    exercises: [
      {
        exercise_id: 518,
        sets: [
          {
            inputs: [
              {
                id: 0,
                type: InputType.Time,
                unit: Unit.SEC,
                value: run.runTime / 1000,
              },
              {
                id: 1,
                type: InputType.Distance,
                unit: Unit.M,
                value: run.runDistance,
              },
              {
                id: 2,
                type: InputType.Pace,
                unit: Unit.MinKM,
                value: 0.6215 / run.runPace,
              },
            ],
          },
        ],
      },
    ],
    user_id: "rundouble",
    created_at: new Date(run.completedLong),
    updated_at: new Date(run.completedLong),
    worked_out_at: new Date(run.completedLong),
    source: WorkoutSource.RunDouble,
  };
}
