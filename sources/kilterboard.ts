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
