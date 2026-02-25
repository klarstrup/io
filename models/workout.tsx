import { tz, TZDate } from "@date-fns/tz";
import {
  addHours,
  addMilliseconds,
  endOfDay,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import type { WithId } from "mongodb";
import Grade from "../grades";
import type {
  Location,
  NextSet,
  Workout,
  WorkoutSet,
} from "../graphql.generated";
import type { Duration } from "../sources/fitocracy";
import { dayStartHour, DEFAULT_TIMEZONE } from "../utils";
import {
  InputType,
  SendType,
  Unit,
  type AssistType,
  type ExerciseData,
} from "./exercises.types";
import type { LocationData } from "./location";

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

export type SetAndLocationAndWorkout = readonly [
  WorkoutExerciseSet,
  WithId<LocationData> | undefined,
  WithId<WorkoutData>,
];

export type ExerciseSetWithExerciseDataAndLocationsAndWorkouts = readonly [
  ExerciseData,
  SetAndLocationAndWorkout[],
  WithId<WorkoutData>[],
];

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

export const msToDuration = (ms: number): Duration => {
  const years = Math.floor(ms / yearsInMs);
  ms -= years * yearsInMs;

  const months = Math.floor(ms / monthsInMs);
  ms -= months * monthsInMs;

  const weeks = Math.floor(ms / weeksInMs);
  ms -= weeks * weeksInMs;

  const days = Math.floor(ms / daysInMs);
  ms -= days * daysInMs;

  const hours = Math.floor(ms / hoursInMs);
  ms -= hours * hoursInMs;

  const minutes = Math.floor(ms / minutesInMs);
  ms -= minutes * minutesInMs;

  const seconds = Math.floor(ms / secondsInMs);

  return { years, months, weeks, days, hours, minutes, seconds };
};

export const durationToMs = (duration: Duration) =>
  (duration.years ?? 0) * yearsInMs +
  (duration.months ?? 0) * monthsInMs +
  (duration.weeks ?? 0) * weeksInMs +
  (duration.days ?? 0) * daysInMs +
  (duration.hours ?? 0) * hoursInMs +
  (duration.minutes ?? 0) * minutesInMs +
  (duration.seconds ?? 0) * secondsInMs;

export const formatShortDuration = (
  duration: Duration,
  includeSmallestUnit: boolean = false,
) => {
  const parts: string[] = [];
  if (duration.years || (includeSmallestUnit && parts.length))
    parts.push(`${duration.years ?? 0}y`);
  if (duration.months || (includeSmallestUnit && parts.length))
    parts.push(`${duration.months ?? 0}mo`);
  if (duration.weeks || (includeSmallestUnit && parts.length))
    parts.push(`${duration.weeks ?? 0}w`);
  if (duration.days || (includeSmallestUnit && parts.length))
    parts.push(`${duration.days ?? 0}d`);
  if (duration.hours || (includeSmallestUnit && parts.length))
    parts.push(`${duration.hours ?? 0}h`);
  if (duration.minutes || (includeSmallestUnit && parts.length))
    parts.push(`${duration.minutes ?? 0}m`);
  if (duration.seconds || (includeSmallestUnit && parts.length))
    parts.push(`${duration.seconds ?? 0}s`);
  return parts.join("");
};

export const formatDurationAsTimer = (duration: Duration) => {
  const hours = duration.hours ?? 0;
  const minutes = duration.minutes ?? 0;
  const seconds = duration.seconds ?? 0;
  return `${hours > 0 ? `${hours}:` : ""}${hours > 0 ? String(minutes).padStart(2, "0") : minutes}:${String(
    seconds,
  ).padStart(2, "0")}`;
};

export const isDurationGreaterOrEqual = (a: Duration, b: Duration) =>
  durationToMs(a) >= durationToMs(b);

export const isNextSetDue = (tzDate: Date | TZDate, nextSet: NextSet) => {
  const timeZone =
    ("timeZone" in tzDate && tzDate.timeZone) || DEFAULT_TIMEZONE;
  const inn = tz(timeZone);
  const dayStart = addHours(startOfDay(tzDate, { in: inn }), dayStartHour);
  const dayEnd = addHours(endOfDay(tzDate, { in: inn }), dayStartHour);

  const effectiveDueDate =
    nextSet.exerciseSchedule.snoozedUntil &&
    !isAfter(
      dayEnd,
      endOfDay(nextSet.exerciseSchedule.snoozedUntil, { in: inn }),
    )
      ? nextSet.exerciseSchedule.snoozedUntil
      : nextSet.dueOn;

  return (
    isBefore(effectiveDueDate, addMilliseconds(dayEnd, 1)) &&
    isAfter(addMilliseconds(dayStart, -1), effectiveDueDate)
  );
};

// Copy of the exercise 2001 inputs for climbing exercises, to avoid loading all exercises when we just need climbing inputs
export const climbingExerciseInputs = [
  {
    allowed_units: [{ conversion_factor: 1.0, name: Unit.FrenchRounded }],
    bounds: { minimum: 2, maximum: 9.5 },
    display_name: "Grade",
    hidden_by_default: true,
    id: 0,
    input_ordinal: 1,
    imperial_unit: Unit.FrenchRounded,
    metric_unit: Unit.FrenchRounded,
    type: InputType.Grade,
  },
  {
    display_name: "Hold Color",
    hidden_by_default: true,
    id: 1,
    input_ordinal: 2,
    options: [
      // Don't mess with the order of these colors
      { value: "mint" },
      { value: "green" },
      { value: "yellow" },
      { value: "blue" },
      { value: "orange" },
      { value: "red" },
      { value: "black" },
      { value: "pink" },
      { value: "white" },
      { value: "purple" },
    ],
    type: InputType.Options,
  },
  {
    display_name: "Send",
    hidden_by_default: false,
    id: 2,
    input_ordinal: 3,
    default_value: 1,
    // Don't mess with the order of these options
    options: [
      { value: "flash" },
      { value: "top" },
      { value: "zone" },
      { value: "attempt" },
      { value: "repeat" },
    ],
    type: InputType.Options,
  },
] as const;

const colorOptions = climbingExerciseInputs[1].options;
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
    const colorInput = set?.inputs[1];
    if (colorInput) {
      const color = colorOptions[Number(colorInput.value)]?.value;
      if (color) boulderingSetColor = color;
    }
  }

  const boulderingCircuit =
    boulderingSetColor && location
      ? getCircuitByLocationAndColor(boulderingSetColor, location)
      : undefined;

  return boulderingCircuit;
};

const getCircuitByLocationAndColor = (
  color: string,
  location: LocationData | Location,
) =>
  location.boulderCircuits?.find(
    (bC) => bC.holdColor?.toLowerCase() === color.toLowerCase(),
  );

const getGradeOfColorByLocation = (
  color: string,
  location: LocationData | Location,
) => getCircuitByLocationAndColor(color, location)?.gradeEstimate;

// Utility to paint over difference in DB and GraphQL representation of set meta
export const getSetMeta = (
  set: WorkoutSet | WorkoutExerciseSet,
  key: string,
): string | undefined => {
  if (!set.meta) return undefined;

  if (Array.isArray(set.meta)) {
    const metaItem = set.meta.find((m) => m.key === key);
    return metaItem?.value;
  } else {
    if (key in set.meta) return set.meta[key] as string | undefined;
  }

  return undefined;
};

export function getSetGrade(
  set: WorkoutSet | WorkoutExerciseSet,
  location: Location | undefined | null,
) {
  const inputGrade = set.inputs[0]!.value;
  if (inputGrade) return inputGrade;

  if (!location) return null;

  const boulderCircuitId = getSetMeta(set, "boulderCircuitId");

  const boulderingCircuit =
    boulderCircuitId &&
    location.boulderCircuits?.find((c) => c.id === boulderCircuitId);
  if (boulderingCircuit) {
    return boulderingCircuit.gradeEstimate || null;
  }

  const color = colorOptions[set.inputs[1]!.value!]?.value;
  if (!color) return null;

  const colorGrade = getGradeOfColorByLocation(color, location);
  if (colorGrade) return colorGrade;

  return null;
}

export function ClimbingStats({
  setAndLocationPairs,
}: {
  setAndLocationPairs: (readonly [
    set: WorkoutExerciseSet | WorkoutSet,
    location: Location | undefined,
    workout: WorkoutData | Workout | undefined,
  ])[];
}) {
  const successfulSetAndLocationPairs = setAndLocationPairs.filter(
    ([set]) =>
      (set.inputs[2]!.value as SendType) !== SendType.Attempt &&
      (set.inputs[2]!.value as SendType) !== SendType.Zone,
  );
  const problemCount = successfulSetAndLocationPairs.length;
  const gradeSum = successfulSetAndLocationPairs.reduce(
    (sum, [set, location]) => sum + (getSetGrade(set, location) || 0),
    0,
  );
  const gradeTop5Average =
    successfulSetAndLocationPairs
      .map(([set, location]) => getSetGrade(set, location) ?? 0)
      .filter((grade) => grade > 0)
      .sort((a, b) => b - a)
      .slice(0, Math.min(5, successfulSetAndLocationPairs.length))
      .reduce((sum, grade) => sum + grade, 0) /
    Math.min(5, successfulSetAndLocationPairs.length);

  return (
    <small className="text-[10px]">
      {problemCount ? (
        <span className="whitespace-nowrap">PC: {problemCount}</span>
      ) : null}
      {gradeSum ? (
        <span>
          , <span className="whitespace-nowrap">GS: {gradeSum.toFixed(0)}</span>
        </span>
      ) : null}
      {gradeTop5Average ? (
        <span>
          ,{" "}
          <span className="whitespace-nowrap">
            T5A:
            {new Grade(gradeTop5Average).nameFloor}
            {new Grade(gradeTop5Average).subGradePercent ? (
              <small>+{new Grade(gradeTop5Average).subGradePercent}%</small>
            ) : null}
          </span>
        </span>
      ) : null}
    </small>
  );
}
