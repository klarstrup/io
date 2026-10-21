import {
  type ContextFn,
  getMilliseconds,
  getMinutes,
  getSeconds,
  type Interval,
  isEqual,
  isWithinInterval,
  max,
  min,
} from "date-fns";
import type {
  GQAchievement,
  GQDelivery,
  GQEvent,
  GQLocation,
  GQMeal,
  GQNextSet,
  GQSleep,
  GQTodo,
  GQTrip,
  GQWorkout,
  GQWorkoutExercise,
  GQWorkoutSet,
} from "../../graphql.generated/graphql";
import type {
  WorkoutData,
  WorkoutExercise,
  WorkoutExerciseSet,
} from "../../models/workout";
import {
  endOfDayButItRespectsDayStartHour,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";

export type SeparatedEnd = { _is_separated_end: true };
export type WithSeparatedEnd<T> = T & SeparatedEnd;
export type WithOrWithoutSeparatedEnd<T> = T | WithSeparatedEnd<T>;

export interface NowDividerEntry {
  __typename: "NowDivider";
  id: "now-divider";
  start: Date;
  end: Date;
}

export type JournalEntry =
  | WithOrWithoutSeparatedEnd<GQEvent>
  | GQTodo
  | GQNextSet
  | GQWorkout
  | WithOrWithoutSeparatedEnd<GQSleep>
  | GQMeal
  | WithOrWithoutSeparatedEnd<GQTrip>
  | GQAchievement
  | GQDelivery
  // These are synthetic entries that don't correspond to models but are used for rendering purposes
  | LocationChange
  | NowDividerEntry
  | DateChange

export type JournalEntryType = Exclude<
  JournalEntry["__typename"],
  "NowDivider" | "LocationChange" | "DateChange"
>;

export const journalEntryTypes = [
  "Todo",
  "Event",
  "Workout",
  "Sleep",
  "NextSet",
  "Trip",
  "Meal",
  "Delivery",
  "Achievement",
] satisfies JournalEntryType[];

export const isValidJournalEntryType = (
  type: string,
): type is JournalEntryType =>
  journalEntryTypes.includes(type as JournalEntryType);

export const isEntryThatCanHaveSeparatedEnd = (
  entry: JournalEntry,
): entry is WithOrWithoutSeparatedEnd<GQEvent | GQTrip | GQSleep> =>
  entry.__typename === "Event" ||
  entry.__typename === "Trip" ||
  entry.__typename === "Sleep";

export const isSeparatedEnd = <T extends JournalEntry>(
  entry: T,
): entry is WithSeparatedEnd<T> =>
  "_is_separated_end" in entry && entry._is_separated_end;
export const omitSeparatedEnd = <
  T extends JournalEntry | (JournalEntry & SeparatedEnd),
>(
  entry: T,
): T => {
  const { _is_separated_end, ...rest } = entry as T & SeparatedEnd;
  return rest as T;
};

const getWorkoutPrincipalDate = (
  workout: WorkoutData | GQWorkout,
): Interval<Date, Date> => {
  // Cursed offsetting to get the correct day's start and end when workout is after midnight but before dayStartHour
  const dayInterval: Interval = {
    start: startOfDayButItRespectsDayStartHour(workout.workedOutAt),
    end: endOfDayButItRespectsDayStartHour(workout.workedOutAt),
  };

  const start = max([
    dayInterval.start,
    workout.createdAt,
    ...workout.exercises
      .flatMap((e: GQWorkoutExercise | WorkoutExercise) =>
        e.sets.map((s: GQWorkoutSet | WorkoutExerciseSet) => s.createdAt),
      )
      .filter(Boolean)
      .filter((date) => isWithinInterval(date, dayInterval)),
    ...workout.exercises
      .flatMap((e: GQWorkoutExercise | WorkoutExercise) =>
        e.sets.map((s: GQWorkoutSet | WorkoutExerciseSet) => s.updatedAt),
      )
      .filter(Boolean)
      .filter((date) => isWithinInterval(date, dayInterval)),
  ]);

  const end = max([
    min([
      dayInterval.end,
      workout.updatedAt,
      ...workout.exercises
        .flatMap((e: GQWorkoutExercise | WorkoutExercise) =>
          e.sets.map((s: GQWorkoutSet | WorkoutExerciseSet) => s.createdAt),
        )
        .filter(Boolean)
        .filter((date) => isWithinInterval(date, dayInterval)),
      ...workout.exercises
        .flatMap((e: GQWorkoutExercise | WorkoutExercise) =>
          e.sets.map((s: GQWorkoutSet | WorkoutExerciseSet) => s.updatedAt),
        )
        .filter(Boolean)
        .filter((date) => isWithinInterval(date, dayInterval)),
    ]),
    start,
  ]);

  return { start, end };
};

// Fake client-only type for location changes, which are not stored in the database but are generated on the fly when rendering the diary agenda
export interface LocationChange {
  __typename: "LocationChange";
  id: string;
  location: string;
  locationId: string | null;
  /** Represents halfway between the precending and following entries */
  start: Date;
  /** Represents immediately before the entry this is location change for */
  end: Date;
}

// Fake client-only type for date changes, which are not stored in the database but are generated on the fly when rendering the diary agenda
export interface DateChange {
  __typename: "DateChange";
  id: string;
  date: Date;
  start: Date;
  end: Date;
}

export function hasStartDate<T extends JournalEntry>(
  entry: T,
): entry is T & { start: Date } {
  return "start" in entry && entry.start instanceof Date;
}
export function hasEndDate<T extends JournalEntry>(
  entry: T,
): entry is T & { end: Date } {
  return "end" in entry && entry.end instanceof Date;
}

export const isEqualInterval = (
  intervalA: Interval<Date, Date>,
  intervalB: Interval<Date, Date>,
): boolean =>
  isEqual(intervalA.start, intervalB.start) &&
  isEqual(intervalA.end, intervalB.end);

export const doEntriesOverlapExactly = (
  entryA: JournalEntry,
  entryB: JournalEntry,
): boolean =>
  isEqualInterval(
    getJournalEntryPrincipalDate(entryA),
    getJournalEntryPrincipalDate(entryB),
  );

export const getJournalEntryPrincipalDate = (
  entry: JournalEntry,
): Interval<Date, Date> => {
  const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
  if (isSeparatedEnd(entry)) {
    const principalDate = getJournalEntryPrincipalDate(omitSeparatedEnd(entry));

    return { start: principalDate.end, end: principalDate.end };
  }
  if (entry.__typename === "Todo") {
    const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
    if (entry.completed)
      return { start: entry.completed, end: entry.completed };
    if (entry.due) {
      return {
        start: max([entry.due, slightlyIntoTheFuture]),
        end: max([entry.due, slightlyIntoTheFuture]),
      };
    }
    return { start: slightlyIntoTheFuture, end: slightlyIntoTheFuture };
  }
  if (entry.__typename === "Sleep") {
    return { start: entry.startedAt, end: entry.endedAt };
  }
  if (entry.__typename === "NextSet") {
    const nextSet = entry;

    const effectiveDueDate = nextSet.exerciseSchedule.snoozedUntil
      ? max([nextSet.exerciseSchedule.snoozedUntil, nextSet.dueOn])
      : nextSet.dueOn;

    return {
      start: max([effectiveDueDate, slightlyIntoTheFuture]),
      end: max([effectiveDueDate, slightlyIntoTheFuture]),
    };
  }
  if ("exercises" in entry) {
    const workout = entry;

    // If the workout is exactly at midnight and the workout's principal date would be the previous day, we want to consider it as part of the next day instead, since that's likely what the user intends
    if (
      getMilliseconds(workout.workedOutAt) === 0 &&
      getSeconds(workout.workedOutAt) === 0 &&
      getMinutes(workout.workedOutAt) === 0
    ) {
      return getWorkoutPrincipalDate(workout);
    }

    return {
      start: workout.workedOutAt,
      end: workout.workedOutAt,
    };
  }

  if (entry.__typename === "Meal") {
    return { start: entry.datetime, end: entry.datetime };
  }

  if (entry.__typename === "Delivery") {
    return { start: entry.timestamp, end: entry.timestamp };
  }

  if (hasStartDate(entry)) {
    if (hasEndDate(entry)) {
      return { start: entry.start, end: entry.end };
    }
  }

  if (entry.__typename === "Achievement") {
    return { start: entry.unlockedAt, end: entry.unlockedAt };
  }

  throw new Error(
    `Unknown entry type: ${JSON.stringify(entry satisfies never)}`,
  );
};

export const isEventEntireDay = <DateType extends Date>(
  event: GQEvent,
  dayDate: Date,
  _inTZ?: ContextFn<DateType>,
): boolean => {
  const dayStart = startOfDayButItRespectsDayStartHour(dayDate);
  const dayEnd = endOfDayButItRespectsDayStartHour(dayDate);
  return event.start <= dayStart && event.end >= dayEnd;
};

export const getLocationFromJournalEntry = (
  locations: GQLocation[],
  entry: JournalEntry,
): { id: string; name: string } | null => {
  if (entry.__typename === "Workout" && entry.location) return entry.location;

  if (entry.__typename === "Workout" && entry.locationId) {
    for (const location of locations) {
      if (location.id === entry.locationId) return location;
    }

    return { id: entry.locationId, name: entry.locationId };
  }
  if (
    entry.__typename === "Sleep" &&
    "deviceId" in entry &&
    entry.deviceId &&
    typeof entry.deviceId === "string"
  ) {
    if (entry.deviceId.trim() === "a5805286bee9039cd23c4e59200b776eba02c6f7") {
      return locations.find((l) => l.name === "Home") || null;
    }
  }
  if (
    entry.__typename === "Event" &&
    "location" in entry &&
    entry.location &&
    entry.datetype === "date-time"
  ) {
    for (const location of locations) {
      for (const knownAddress of location.knownAddresses || []) {
        if (entry.location.includes(knownAddress)) {
          return location;
        }
      }
    }

    if (entry.location.trim() === "") return null;
    if (entry.location === "Microsoft Teams-møde") return null; // Fake location added by some calendar integrations for online meetings, we don't want to show it
    if (entry.location === "Microsoft Teams Meeting") return null; // Fake location added by some calendar integrations for online meetings, we don't want to show it

    return { id: entry.location, name: entry.location };
  }

  if (entry.__typename === "Meal") {
    // TODO: Determine the actual location for meals, currently hardcoded to Proprty.ai Office
    // It should be configurable per source
    return {
      id: "699cc5ce2f64a165113fc529",
      name: "Proprty.ai Office",
    };
  }

  return null;
};

export function isVisuallyIdenticalEvent(a: JournalEntry, b: JournalEntry) {
  if (a.__typename !== "Event" || b.__typename !== "Event") return false;
  if (a.summary !== b.summary) return false;
  if (a.datetype !== b.datetype) return false;
  if (a.location !== b.location) return false;
  if (a.start.getTime() !== b.start.getTime()) return false;
  if (a.end.getTime() !== b.end.getTime()) return false;
  if (isSeparatedEnd(a) !== isSeparatedEnd(b)) return false;

  return true;
}
