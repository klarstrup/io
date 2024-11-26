import { TZDate } from "@date-fns/tz";
import { differenceInDays, startOfDay } from "date-fns";
import type { AssistType, Unit } from "./exercises";
import type { getNextSets } from "./workout.server";

export enum WorkoutSource {
  Fitocracy = "fitocracy",
  MyFitnessPal = "myfitnesspal",
  RunDouble = "rundouble",
  TopLogger = "toplogger",
  KilterBoard = "kilterboard",
  Self = "self",
}

export interface WorkoutData {
  // String that uniquely and reproducibly identifies this workout
  id: string;
  exercises: WorkoutExercise[];
  // Io ID, not source user ID
  userId: string; // This is a string because it's a MongoDB ObjectId
  createdAt: Date;
  updatedAt: Date;
  workedOutAt: Date;
  deletedAt?: Date;
  source?: WorkoutSource;
  location?: string;
}

export interface WorkoutExercise {
  exerciseId: number;
  sets: WorkoutExerciseSet[];
}

export interface WorkoutExerciseSet {
  createdAt?: Date;
  updatedAt?: Date;
  inputs: WorkoutExerciseSetInput[];
}

export interface WorkoutExerciseSetInput {
  unit?: Unit;
  value: number;
  assistType?: AssistType;
}

// This is a helper function to determine if an exercise is a climbing exercise,
// meaning that its set inputs are a specific shape and can be presented in a
// problem by problem format.
export const isClimbingExercise = (exerciseId: number) =>
  exerciseId === 2001 || exerciseId === 2003;

export const isNextSetDue = (
  tzDate: TZDate,
  nextSet: Awaited<ReturnType<typeof getNextSets>>[number],
) =>
  differenceInDays(startOfDay(tzDate), nextSet.workedOutAt || new Date(0)) >
  (nextSet.exerciseId === 2001 ? 1 : nextSet.exerciseId === 2003 ? 3 : 4);
