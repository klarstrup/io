import { max } from "date-fns";
import { MongoVEvent, MongoVTodo } from "../../lib";
import { ExerciseSetWithExerciseDataAndLocationsAndWorkouts } from "../../models/workout";
import type { getNextSets } from "../../models/workout.server";

export type JournalEntry =
  | MongoVEvent
  | MongoVTodo
  | Awaited<ReturnType<typeof getNextSets>>[number]
  | ExerciseSetWithExerciseDataAndLocationsAndWorkouts;

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
    return exerciseSet[2][exerciseSet[2].length - 1]?.workedOutAt || null;
  }

  return null;
};
