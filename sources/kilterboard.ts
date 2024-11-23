import type { WithId } from "mongodb";
import { Unit } from "../models/exercises";
import {
  type WorkoutData,
  type WorkoutDataShallow,
  WorkoutSource,
} from "../models/workout";
import { proxyCollection } from "../utils.server";

export namespace KilterBoard {
  export interface Ascent {
    uuid: string;
    wall_uuid: null;
    climb_uuid: string;
    angle: number;
    is_mirror: boolean;
    user_id: number;
    attempt_id: number;
    bid_count: number;
    quality: number;
    difficulty: number;
    grade: number;
    is_benchmark: boolean;
    is_listed: boolean;
    comment: string;
    climbed_at: Date;
    created_at: Date;
    updated_at: Date;
  }
}

export const KilterBoardAscents = proxyCollection<KilterBoard.Ascent>(
  "kilterboard_ascents",
);

export function workoutFromKilterBoardAscents(
  ascents: WithId<KilterBoard.Ascent>[],
): WithId<WorkoutData> {
  const firstAscent = ascents[0];
  if (!firstAscent) throw new Error("No climb users provided");

  return {
    _id: firstAscent._id,
    location: "Kilter Board",
    exercises: [
      {
        exerciseId: 2001,
        sets: ascents.map(({ grade }) => ({
          inputs: [
            // Grade
            { value: grade, unit: Unit.FrenchRounded },
            // Color
            { value: NaN },
            // Sent-ness
            { value: 1 },
          ],
        })),
      },
    ],
    userId: String(firstAscent.user_id),
    createdAt: firstAscent.created_at,
    updatedAt: firstAscent.updated_at,
    workedOutAt: firstAscent.climbed_at,
    source: WorkoutSource.KilterBoard,
  };
}

export function workoutWithoutSetsFromKilterBoardAscents(
  climbUsers: WithId<KilterBoard.Ascent>[],
): WithId<WorkoutDataShallow> {
  const firstAscent = climbUsers[0];
  if (!firstAscent) throw new Error("No climb users provided");

  return {
    _id: firstAscent._id,
    location: "Kilter Board",
    exercises: [{ exerciseId: 2001 }],
    userId: String(firstAscent.user_id),
    createdAt: firstAscent.created_at,
    updatedAt: firstAscent.updated_at,
    workedOutAt: firstAscent.climbed_at,
    source: WorkoutSource.KilterBoard,
  };
}

export const difficulty_grades = [
  { boulder_name: "1a/V0", difficulty: 1 },
  { boulder_name: "1b/V0", difficulty: 2 },
  { boulder_name: "1c/V0", difficulty: 3 },
  { boulder_name: "2a/V0", difficulty: 4 },
  { boulder_name: "2b/V0", difficulty: 5 },
  { boulder_name: "2c/V0", difficulty: 6 },
  { boulder_name: "3a/V0", difficulty: 7 },
  { boulder_name: "3b/V0", difficulty: 8 },
  { boulder_name: "3c/V0", difficulty: 9 },
  { boulder_name: "4a/V0", difficulty: 10 },
  { boulder_name: "4b/V0", difficulty: 11 },
  { boulder_name: "4c/V0", difficulty: 12 },
  { boulder_name: "5a/V1", difficulty: 13 },
  { boulder_name: "5b/V1", difficulty: 14 },
  { boulder_name: "5c/V2", difficulty: 15 },
  { boulder_name: "6a/V3", difficulty: 16 },
  { boulder_name: "6a+/V3", difficulty: 17 },
  { boulder_name: "6b/V4", difficulty: 18 },
  { boulder_name: "6b+/V4", difficulty: 19 },
  { boulder_name: "6c/V5", difficulty: 20 },
  { boulder_name: "6c+/V5", difficulty: 21 },
  { boulder_name: "7a/V6", difficulty: 22 },
  { boulder_name: "7a+/V7", difficulty: 23 },
  { boulder_name: "7b/V8", difficulty: 24 },
  { boulder_name: "7b+/V8", difficulty: 25 },
  { boulder_name: "7c/V9", difficulty: 26 },
  { boulder_name: "7c+/V10", difficulty: 27 },
  { boulder_name: "8a/V11", difficulty: 28 },
  { boulder_name: "8a+/V12", difficulty: 29 },
  { boulder_name: "8b/V13", difficulty: 30 },
  { boulder_name: "8b+/V14", difficulty: 31 },
  { boulder_name: "8c/V15", difficulty: 32 },
  { boulder_name: "8c+/V16", difficulty: 33 },
  { boulder_name: "9a/V17", difficulty: 34 },
  { boulder_name: "9a+/V18", difficulty: 35 },
  { boulder_name: "9b/V19", difficulty: 36 },
  { boulder_name: "9b+/V20", difficulty: 37 },
  { boulder_name: "9c/V21", difficulty: 38 },
  { boulder_name: "9c+/V22", difficulty: 39 },
];
