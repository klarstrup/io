import { TypePolicies } from "@apollo/client";
import { isDate } from "date-fns";

const readDate = (d: unknown) =>
  typeof d === "string" || typeof d === "number"
    ? new Date(d)
    : isDate(d)
      ? d
      : null;

export const typePolicies: TypePolicies = {
  Todo: {
    fields: {
      created: { read: readDate },
      start: { read: readDate },
      due: { read: readDate },
      completed: { read: readDate },
    },
  },
  Event: {
    fields: {
      created: { read: readDate },
      start: { read: readDate },
      end: { read: readDate },
      due: { read: readDate },
    },
  },
  Workout: {
    fields: {
      workedOutAt: { read: readDate },
      createdAt: { read: readDate },
      updatedAt: { read: readDate },
      materializedAt: { read: readDate },
    },
  },
  WorkoutSet: {
    fields: {
      createdAt: { read: readDate },
      updatedAt: { read: readDate },
    },
  },
  Location: {
    fields: {
      createdAt: { read: readDate },
      updatedAt: { read: readDate },
    },
  },
  BoulderCircuit: {
    fields: {
      createdAt: { read: readDate },
      updatedAt: { read: readDate },
    },
  },
  ExerciseSchedule: {
    fields: {
      snoozedUntil: { read: readDate },
    },
  },
  NextSet: {
    fields: {
      workedOutAt: { read: readDate },
      dueOn: { read: readDate },
    },
  },
  Sleep: {
    fields: {
      startedAt: { read: readDate },
      endedAt: { read: readDate },
    },
  },
  FloatTimeSeriesEntry: {
    fields: { timestamp: { read: readDate } },
  },
};
