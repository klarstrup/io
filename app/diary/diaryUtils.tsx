import {
  addHours,
  endOfDay,
  type Interval,
  isWithinInterval,
  max,
  startOfDay,
} from "date-fns";
import type { WithId } from "mongodb";
import type { Todo } from "../../graphql.generated";
import type { MongoVEvent, MongoVTodo } from "../../lib";
import type { WorkoutData } from "../../models/workout";
import type { getNextSets } from "../../models/workout.server";
import { dayStartHour } from "../../utils";

export type JournalEntry =
  | MongoVEvent
  | Todo
  | Awaited<ReturnType<typeof getNextSets>>[number]
  | WithId<WorkoutData & { materializedAt?: Date }>;

const getWorkoutPrincipalDate = (workout: WorkoutData): Date | null => {
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

  return max([
    dayInterval.start,
    workout.createdAt,
    ...workout.exercises
      .flatMap((e) => e.sets.map((s) => s.updatedAt))
      .filter(Boolean)
      .filter((date) => isWithinInterval(date, dayInterval)),
  ]);
};

export const getVTodoPrincipalDate = (
  todo: Partial<Pick<MongoVTodo, "completed" | "due" | "start">>,
): Date | null => {
  const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
  if (todo.completed) return todo.completed;
  if (todo.due) return max([todo.due, slightlyIntoTheFuture]);
  if (todo.start) return max([todo.start, slightlyIntoTheFuture]);
  return slightlyIntoTheFuture;
};

export const getJournalEntryPrincipalDate = (
  entry: JournalEntry,
): Date | null => {
  const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
  if ("__typename" in entry && entry.__typename === "Todo") {
    return getVTodoPrincipalDate(entry);
  }
  if ("start" in entry && entry.start) return entry.start;
  if ("scheduleEntry" in entry && entry.scheduleEntry) {
    const nextSet = entry;

    const effectiveDueDate = nextSet.scheduleEntry.snoozedUntil
      ? max([nextSet.scheduleEntry.snoozedUntil, nextSet.dueOn])
      : nextSet.dueOn;

    return max([effectiveDueDate, slightlyIntoTheFuture]);
  }
  if ("exercises" in entry) {
    const workout = entry;
    return getWorkoutPrincipalDate(workout);
  }

  return null;
};
