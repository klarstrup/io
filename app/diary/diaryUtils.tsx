import {
  type ContextFn,
  getMilliseconds,
  getMinutes,
  getSeconds,
  type Interval,
  isWithinInterval,
  max,
  min,
} from "date-fns";
import type {
  GQDelivery,
  GQEvent,
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

export type JournalEntry =
  | GQEvent
  | (GQEvent & { _is_separated_end: true })
  | GQTodo
  | GQNextSet
  | GQWorkout
  | GQSleep
  | (GQSleep & { _is_separated_end: true })
  | GQMeal
  | GQTrip
  | GQDelivery
  // These are synthetic entries that don't correspond to models but are used for rendering purposes
  | LocationChange
  | { __typename: "NowDivider"; id: "now-divider"; start: Date; end: Date };

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

export const getTodoPrincipalDate = (
  todo: Partial<Pick<GQTodo, "completed" | "due">>,
): Interval<Date, Date> | null => {
  const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
  if (todo.completed)
    return {
      start: todo.completed,
      end: todo.completed,
    };
  if (todo.due) {
    return {
      start: max([todo.due, slightlyIntoTheFuture]),
      end: max([todo.due, slightlyIntoTheFuture]),
    };
  }
  return { start: slightlyIntoTheFuture, end: slightlyIntoTheFuture };
};

// Fake client-only type for location changes, which are not stored in the database but are generated on the fly when rendering the diary agenda
export interface LocationChange {
  __typename: "LocationChange";
  id: string;
  location: string;
  /** Represents halfway between the precending and following entries */
  start: Date;
  /** Represents immediately before the entry this is location change for */
  end: Date;
}

export const getJournalEntryPrincipalDate = (
  entry: JournalEntry,
): Interval<Date, Date> | null => {
  const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
  if (entry.__typename === "Todo") {
    return getTodoPrincipalDate(entry);
  }
  if (entry.__typename === "Sleep") {
    return { start: entry.startedAt, end: entry.endedAt };
  }
  if ("_is_separated_end" in entry && entry._is_separated_end) {
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
  if ("exerciseSchedule" in entry && entry.exerciseSchedule) {
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

  if (entry.__typename === "LocationChange") {
    return { start: entry.start, end: entry.end };
  }

  if (entry.__typename === "Meal") {
    return { start: entry.datetime, end: entry.datetime };
  }

  if (entry.__typename === "Delivery") {
    return { start: entry.timestamp, end: entry.timestamp };
  }

  //entry satisfies never;

  return null;
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
