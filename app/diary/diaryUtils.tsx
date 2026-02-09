import {
  addHours,
  endOfDay,
  type Interval,
  isWithinInterval,
  max,
  min,
  startOfDay,
} from "date-fns";
import type {
  Event,
  ExerciseSchedule,
  NextSet,
  Todo,
  Workout,
  WorkoutExercise,
} from "../../graphql.generated";
import type { WorkoutData } from "../../models/workout";
import { dayStartHour } from "../../utils";

export type JournalEntry =
  | Event
  | (Event & { _this_is_the_end_of_a_event: true })
  | Todo
  | NextSet
  | Workout
  | ExerciseSchedule
  | WorkoutExercise
  // These are synthetic entries that don't correspond to models but are used for rendering purposes
  | { __typename: "LocationChange"; id: string; location: string; date: Date }
  | { __typename: "NowDivider"; id: "now-divider"; start: Date; end: Date };

const getWorkoutPrincipalDate = (workout: WorkoutData | Workout): Interval => {
  // Cursed offsetting to get the correct day's start and end when workout is after midnight but before dayStartHour
  const dayInterval: Interval = {
    start: addHours(
      startOfDay(addHours(workout.workedOutAt, -dayStartHour)),
      dayStartHour,
    ),
    end: addHours(
      endOfDay(addHours(workout.workedOutAt, -dayStartHour)),
      dayStartHour,
    ),
  };

  return {
    start: max([
      dayInterval.start,
      workout.createdAt,
      ...workout.exercises
        .flatMap((e) => e.sets.map((s) => s.createdAt))
        .filter(Boolean)
        .filter((date) => isWithinInterval(date, dayInterval)),
    ]),
    end: min([
      dayInterval.end,
      workout.updatedAt,
      ...workout.exercises
        .flatMap((e) => e.sets.map((s) => s.updatedAt))
        .filter(Boolean)
        .filter((date) => isWithinInterval(date, dayInterval)),
    ]),
  };
};

export const getTodoPrincipalDate = (
  todo: Partial<Pick<Todo, "completed" | "due" | "start">>,
): Interval | null => {
  const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
  if (todo.completed)
    return {
      start: todo.start ? min([todo.start, todo.completed]) : todo.completed,
      end: todo.completed,
    };
  if (todo.start)
    return {
      start: max([todo.start, slightlyIntoTheFuture]),
      end: max([todo.start, slightlyIntoTheFuture]),
    };
  return { start: slightlyIntoTheFuture, end: slightlyIntoTheFuture };
};

export const getJournalEntryPrincipalDate = (
  entry: JournalEntry,
): Interval | null => {
  const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
  if ("__typename" in entry && entry.__typename === "Todo") {
    return getTodoPrincipalDate(entry);
  }
  if (
    "_this_is_the_end_of_a_event" in entry &&
    entry._this_is_the_end_of_a_event
  ) {
    if ("end" in entry && entry.end) {
      return {
        start: new Date(entry.end),
        end: new Date(entry.end),
      };
    }
  }
  if ("start" in entry && entry.start) {
    return {
      start: new Date(entry.start),
      end:
        "end" in entry && entry.end
          ? new Date(entry.end)
          : new Date(entry.start),
    };
  }
  if ("scheduleEntry" in entry && entry.scheduleEntry) {
    const nextSet = entry;

    const effectiveDueDate = nextSet.scheduleEntry.snoozedUntil
      ? max([nextSet.scheduleEntry.snoozedUntil, nextSet.dueOn])
      : nextSet.dueOn;

    return {
      start: max([effectiveDueDate, slightlyIntoTheFuture]),
      end: max([effectiveDueDate, slightlyIntoTheFuture]),
    };
  }
  if ("nextSet" in entry && entry.nextSet) {
    const scheduleEntry = entry;
    const nextSet = entry.nextSet;

    const effectiveDueDate = scheduleEntry.snoozedUntil
      ? max([scheduleEntry.snoozedUntil, nextSet.dueOn])
      : nextSet.dueOn;

    return {
      start: max([effectiveDueDate, slightlyIntoTheFuture]),
      end: max([effectiveDueDate, slightlyIntoTheFuture]),
    };
  }
  if ("exercises" in entry) {
    const workout = entry;
    return getWorkoutPrincipalDate(workout);
  }
  if ("sets" in entry) {
    const workoutExercise = entry;

    const sets = workoutExercise.sets;

    if (sets.length === 0) return null;

    const createdAts = sets
      .map((s) => s.createdAt)
      .filter((date): date is Date => Boolean(date));
    const updatedAts = sets
      .map((s) => s.updatedAt)
      .filter((date): date is Date => Boolean(date));

    return {
      start: min([...createdAts, ...updatedAts]),
      end: max([...createdAts, ...updatedAts]),
    };
  }

  return null;
};
