import { tz, TZDate } from "@date-fns/tz";
import { intervalToDuration, startOfDay, type Duration } from "date-fns";
import Grade from "../grades";
import { DEFAULT_TIMEZONE } from "../utils";
import { exercises, type AssistType, type Unit } from "./exercises";
import type { getNextSets } from "./workout.server";

export enum WorkoutSource {
  Fitocracy = "fitocracy",
  MyFitnessPal = "myfitnesspal",
  RunDouble = "rundouble",
  TopLogger = "toplogger",
  KilterBoard = "kilterboard",
  Grippy = "grippy",
  Crimpd = "crimpd",
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
  displayName?: string;
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
  exerciseId === 2001 ||
  exerciseId === 2003 ||
  exerciseId === 2004 ||
  exerciseId === 2008;

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
      start: startOfDay(nextSet.workedOutAt || new Date(0), {
        in: tz(tzDate.timeZone || DEFAULT_TIMEZONE),
      }),
      end: startOfDay(tzDate),
    }),
    nextSet.scheduleEntry.frequency,
  );

const bouldersColorGradeMap = {
  green: 3,
  yellow: 4.33,
  orange: 5.33,
  blue: 5.67,
  purple: 6.33,
  red: 6.67,
  black: 7,
} as const;
const getGradeOfColorByLocation = (
  color: string,
  location: string | undefined,
) => {
  if (location?.startsWith("Boulders ")) {
    if (color in bouldersColorGradeMap && bouldersColorGradeMap[color]) {
      return bouldersColorGradeMap[color] as number;
    }
  }
};

export function getSetGrade(
  set: WorkoutExerciseSet,
  location: string | undefined,
) {
  const exercise = exercises.find(({ id }) => 2001 === id)!;

  const inputGrade = set.inputs[0]!.value;
  if (inputGrade) return inputGrade;

  if (!location) return null;

  const colorOptions =
    exercise.inputs[1] &&
    "options" in exercise.inputs[1] &&
    exercise.inputs[1].options;

  if (!colorOptions) return null;

  const color = colorOptions?.[set.inputs[1]!.value]?.value;

  if (!color) return null;

  const colorGrade = getGradeOfColorByLocation(color, location);

  if (colorGrade) return colorGrade;

  return null;
}

export function calculateClimbingStats(
  setAndLocationPairs: (readonly [
    location: string | undefined,
    set: WorkoutExerciseSet,
  ])[],
) {
  const problemCount = setAndLocationPairs.length;
  const gradeSum = setAndLocationPairs.reduce(
    (sum, [location, set]) => sum + (getSetGrade(set, location) || 0),
    0,
  );
  const gradeTop5Average =
    setAndLocationPairs
      .map(([location, set]) => getSetGrade(set, location) ?? 0)
      .sort((a, b) => b - a)
      .slice(0, Math.min(5, setAndLocationPairs.length))
      .reduce((sum, grade) => sum + grade, 0) /
    Math.min(5, setAndLocationPairs.length);

  return (
    <small className="block text-[10px]">
      <span className="inline-block">PC: {problemCount},</span>{" "}
      <span className="inline-block">GS: {gradeSum.toFixed(0)},</span>{" "}
      <span className="inline-block">
        T5A: {new Grade(gradeTop5Average).nameFloor}
        <small>+{new Grade(gradeTop5Average).subGradePercent}%</small>.
      </span>{" "}
    </small>
  );
}
