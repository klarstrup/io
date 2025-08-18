import { tz, TZDate } from "@date-fns/tz";
import { intervalToDuration, startOfDay, type Duration } from "date-fns";
import Grade from "../grades";
import { DEFAULT_TIMEZONE } from "../utils";
import {
  exercisesById,
  SendType,
  type AssistType,
  type ExerciseData,
  type Unit,
} from "./exercises";
import type { LocationData } from "./location";
import type { getNextSets } from "./workout.server";

export enum WorkoutSource {
  Fitocracy = "fitocracy",
  MyFitnessPal = "myfitnesspal",
  RunDouble = "rundouble",
  TopLogger = "toplogger",
  KilterBoard = "kilterboard",
  MoonBoard = "moonboard",
  Grippy = "grippy",
  Crimpd = "crimpd",
  ClimbAlong = "climbalong",
  Onsight = "onsight",
  Sportstiming = "sportstiming",
  Self = "self",
}

export interface WorkoutData {
  // String that uniquely and reproducibly identifies this workout
  id: string;
  exercises: WorkoutExercise[];
  // Io ID, not source user ID
  userId: string; // This is a string because it's a MongoDB ObjectId idc
  createdAt: Date;
  updatedAt: Date;
  workedOutAt: Date;
  deletedAt?: Date;
  source?: WorkoutSource;
  /** @deprecated Only used for materialized workouts, TODO: materialize locations with predictable location IDs */
  location?: string;
  // this type is maybe a string or ObjectId depending on if we're clientside or serverside
  locationId?: string;
}

export interface WorkoutExercise {
  exerciseId: number;
  displayName?: string;
  sets: WorkoutExerciseSet[];
  comment?: string;
}

export interface WorkoutExerciseSet {
  createdAt?: Date;
  updatedAt?: Date;
  inputs: WorkoutExerciseSetInput[];
  comment?: string;
  meta?: Record<string, unknown>;
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

export const getCircuitByLocationAndSetColor = (
  exercise: ExerciseData,
  set: Omit<WorkoutExerciseSet, "inputs"> & {
    meta?: Record<string, unknown>;
    inputs: (Omit<WorkoutExerciseSetInput, "value"> & {
      value: number | string;
    })[];
  },
  location: LocationData,
) => {
  let boulderingSetColor: string | undefined;
  if (exercise.id === 2001) {
    const colorOptions = exercise.inputs[1]?.options;
    if (colorOptions) {
      const colorInput = set?.inputs[1];
      if (colorInput) {
        const color = colorOptions[Number(colorInput.value)]?.value;
        if (color) {
          boulderingSetColor = color;
        }
      }
    }
  }

  const boulderingCircuit =
    boulderingSetColor && location
      ? getCircuitByLocationAndColor(boulderingSetColor, location)
      : undefined;

  return boulderingCircuit;
};

export const getCircuitByLocationAndColor = (
  color: string,
  location: LocationData,
) =>
  location.boulderCircuits?.find(
    (bC) => bC.holdColor?.toLowerCase() === color.toLowerCase(),
  );

export const getGradeOfColorByLocation = (
  color: string,
  location: LocationData,
) => getCircuitByLocationAndColor(color, location)?.gradeEstimate;

export function getSetGrade(
  set: WorkoutExerciseSet,
  location: LocationData | undefined | null,
) {
  const exercise = exercisesById[2001]!;

  const inputGrade = set.inputs[0]!.value;
  if (inputGrade) return inputGrade;

  if (!location) return null;

  const boulderingCircuit =
    typeof set.meta?.boulderCircuitId === "string" &&
    location.boulderCircuits?.find((c) => c.id === set.meta?.boulderCircuitId);
  if (boulderingCircuit && boulderingCircuit.gradeEstimate) {
    return boulderingCircuit.gradeEstimate;
  }

  const colorOptions = exercise.inputs[1]?.options;
  if (!colorOptions) return null;

  const color = colorOptions?.[set.inputs[1]!.value]?.value;
  if (!color) return null;

  const colorGrade = getGradeOfColorByLocation(color, location);
  if (colorGrade) return colorGrade;

  return null;
}

export function calculateClimbingStats(
  setAndLocationPairs: (readonly [
    location: LocationData | undefined,
    set: WorkoutExerciseSet,
  ])[],
) {
  const successfulSetAndLocationPairs = setAndLocationPairs.filter(
    ([, set]) =>
      (set.inputs[2]!.value as SendType) !== SendType.Attempt &&
      (set.inputs[2]!.value as SendType) !== SendType.Zone,
  );
  const problemCount = successfulSetAndLocationPairs.length;
  const gradeSum = successfulSetAndLocationPairs.reduce(
    (sum, [location, set]) => sum + (getSetGrade(set, location) || 0),
    0,
  );
  const gradeTop5Average =
    successfulSetAndLocationPairs
      .map(([location, set]) => getSetGrade(set, location) ?? 0)
      .filter((grade) => grade > 0)
      .sort((a, b) => b - a)
      .slice(0, Math.min(5, successfulSetAndLocationPairs.length))
      .reduce((sum, grade) => sum + grade, 0) /
    Math.min(5, successfulSetAndLocationPairs.length);

  return (
    <small className="block text-[10px]">
      {problemCount ? (
        <span className="inline-block">PC: {problemCount}</span>
      ) : null}
      {gradeSum ? (
        <span className="inline-block">, GS: {gradeSum.toFixed(0)}</span>
      ) : null}
      {gradeTop5Average ? (
        <span className="inline-block">
          , T5A: {new Grade(gradeTop5Average).nameFloor}
          {new Grade(gradeTop5Average).subGradePercent ? (
            <small>+{new Grade(gradeTop5Average).subGradePercent}%</small>
          ) : null}
          .
        </span>
      ) : null}
    </small>
  );
}
