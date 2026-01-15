import {
  addHours,
  endOfDay,
  Interval,
  isWithinInterval,
  max,
  min,
  startOfDay,
} from "date-fns";
import { MongoVEvent, MongoVTodo } from "../../lib";
import {
  ExerciseSetWithExerciseDataAndLocationsAndWorkouts,
  WorkoutData,
} from "../../models/workout";
import type { getNextSets } from "../../models/workout.server";
import { dayStartHour } from "../../utils";

export type JournalEntry =
  | MongoVEvent
  | MongoVTodo
  | Awaited<ReturnType<typeof getNextSets>>[number]
  | ExerciseSetWithExerciseDataAndLocationsAndWorkouts;

const getWorkoutPrincipalDate = (workout: WorkoutData): Date | null => {
  const dayInterval: Interval = {
    start: addHours(startOfDay(workout.workedOutAt), dayStartHour),
    end: addHours(endOfDay(workout.workedOutAt), dayStartHour),
  };
  return max([
    dayInterval.start,
    min([
      ...workout.exercises
        .flatMap((e) => e.sets.map((s) => s.updatedAt))
        .filter(Boolean)
        .filter((date) => isWithinInterval(date, dayInterval)),
    ]),
  ]);
};

export const getJournalEntryPrincipalDate = (
  entry: JournalEntry,
): Date | null => {
  const slightlyIntoTheFuture = new Date(Date.now() + 5 * 60 * 1000);
  if ("type" in entry && entry.type === "VTODO") {
    if ("completed" in entry && entry.completed) return entry.completed;
    if ("due" in entry && entry.due)
      return max([entry.due, slightlyIntoTheFuture]);
    if ("start" in entry && entry.start)
      return max([entry.start, slightlyIntoTheFuture]);
    return slightlyIntoTheFuture;
  }
  if ("start" in entry && entry.start) return entry.start;
  if ("scheduleEntry" in entry && entry.scheduleEntry) {
    const nextSet = entry;

    const effectiveDueDate = nextSet.scheduleEntry.snoozedUntil
      ? max([nextSet.scheduleEntry.snoozedUntil, nextSet.dueOn])
      : nextSet.dueOn;

    return max([effectiveDueDate, slightlyIntoTheFuture]);
  }
  if (Array.isArray(entry) && entry.length === 3 && "id" in entry[0]) {
    const exerciseSet =
      entry as ExerciseSetWithExerciseDataAndLocationsAndWorkouts;
    return (
      getWorkoutPrincipalDate(exerciseSet[2][exerciseSet[2].length - 1]!) ||
      null
    );
  }

  return null;
};
