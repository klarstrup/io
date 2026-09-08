import type { TypePolicies } from "@apollo/client";
import { isDate, max, min } from "date-fns";
import type { GQJournalEntriesConnection } from "./graphql.generated/graphql";
import { dateToString, stringToDate, uniqueBy } from "./utils";

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
      due: { read: readDate },
      completed: { read: readDate },
    },
  },
  Trip: {
    fields: {
      start: { read: readDate },
      end: { read: readDate },
    },
  },
  TripLeg: {
    fields: {
      start: { read: readDate },
      end: { read: readDate },
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
      lastWorkedOutAt: { read: readDate },
      dueOn: { read: readDate },
    },
  },
  Sleep: {
    fields: {
      startedAt: { read: readDate },
      endedAt: { read: readDate },
    },
  },
  Meal: {
    fields: {
      datetime: { read: readDate },
    },
  },
  Delivery: {
    fields: {
      timestamp: { read: readDate },
    },
  },
  FoodEntry: {
    fields: {
      datetime: { read: readDate },
    },
  },
  FloatTimeSeriesEntry: {
    fields: { timestamp: { read: readDate } },
  },
  UserDataSource: {
    fields: {
      config: {
        read: (v: unknown) =>
          typeof v === "string" ? (JSON.parse(v) as unknown) : null,
      },
    },
  },
  User: {
    fields: {
      journalEntries: {
        keyArgs: ["on"],
        merge(
          existing: GQJournalEntriesConnection | undefined,
          incoming: GQJournalEntriesConnection | undefined,
        ) {
          if (!existing) return incoming;
          if (!incoming) return existing;

          const mergedNodes = uniqueBy(
            [...existing.nodes, ...incoming.nodes],
            (node) => "__ref" in node && node.__ref,
          );

          return {
            ...incoming,
            pageInfo: {
              ...incoming.pageInfo,
              hasPreviousPage:
                existing.pageInfo.hasPreviousPage &&
                incoming.pageInfo.hasPreviousPage,
              hasNextPage:
                existing.pageInfo.hasNextPage && incoming.pageInfo.hasNextPage,
              startCursor:
                existing.pageInfo.startCursor || incoming.pageInfo.startCursor
                  ? dateToString(
                      min(
                        [
                          existing.pageInfo.startCursor &&
                            stringToDate(existing.pageInfo.startCursor),
                          incoming.pageInfo.startCursor &&
                            stringToDate(incoming.pageInfo.startCursor),
                        ].filter(Boolean),
                      ),
                    )
                  : existing.pageInfo.startCursor ||
                    incoming.pageInfo.startCursor,
              endCursor:
                existing.pageInfo.endCursor || incoming.pageInfo.endCursor
                  ? dateToString(
                      max(
                        [
                          existing.pageInfo.endCursor &&
                            stringToDate(existing.pageInfo.endCursor),
                          incoming.pageInfo.endCursor &&
                            stringToDate(incoming.pageInfo.endCursor),
                        ].filter(Boolean),
                      ),
                    )
                  : existing.pageInfo.endCursor || incoming.pageInfo.endCursor,
            },
            nodes: mergedNodes,
          } satisfies GQJournalEntriesConnection;
        },
      },
    },
  },
};
