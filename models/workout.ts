import { TZDate } from "@date-fns/tz";
import { type Duration, intervalToDuration, startOfDay } from "date-fns";
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
  exerciseId === 2001 || exerciseId === 2003 || exerciseId === 2004;

const yearsInMs = 365.25 * 24 * 60 * 60 * 1000;
const monthsInMs = 30.44 * 24 * 60 * 60 * 1000;
const weeksInMs = 7 * 24 * 60 * 60 * 1000;
const daysInMs = 24 * 60 * 60 * 1000;
const hoursInMs = 60 * 60 * 1000;
const minutesInMs = 60 * 1000;
const secondsInMs = 1000;
const isDurationGreaterOrEqual = (a: Duration, b: Duration) =>
  (a.years ?? 0) * yearsInMs +
    (a.months ?? 0) * monthsInMs +
    (a.weeks ?? 0) * weeksInMs +
    (a.days ?? 0) * daysInMs +
    (a.hours ?? 0) * hoursInMs +
    (a.minutes ?? 0) * minutesInMs +
    (a.seconds ?? 0) * secondsInMs >=
  (b.years ?? 0) * yearsInMs +
    (b.months ?? 0) * monthsInMs +
    (b.weeks ?? 0) * weeksInMs +
    (b.days ?? 0) * daysInMs +
    (b.hours ?? 0) * hoursInMs +
    (b.minutes ?? 0) * minutesInMs +
    (b.seconds ?? 0) * secondsInMs;

export const isNextSetDue = (
  tzDate: TZDate,
  nextSet: Awaited<ReturnType<typeof getNextSets>>[number],
) =>
  isDurationGreaterOrEqual(
    intervalToDuration({
      start: startOfDay(nextSet.workedOutAt || new Date(0)),
      end: startOfDay(tzDate),
    }),
    nextSet.scheduleEntry.frequency,
  );
