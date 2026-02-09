"use client";
import { skipToken, useQuery } from "@apollo/client/react";
import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
  addHours,
  compareAsc,
  eachDayOfInterval,
  endOfDay,
  isAfter,
  isBefore,
  isPast,
  max,
  min,
  setHours,
  startOfDay,
  subHours,
} from "date-fns";
import { gql } from "graphql-tag";
import type { Session } from "next-auth";
import { FieldSetY } from "../../components/FieldSet";
import {
  DiaryAgendaDayUserTodosDocument,
  type NextSet,
  type Todo,
} from "../../graphql.generated";
import { useVisibilityAwarePollInterval } from "../../hooks";
import { WorkoutSource } from "../../models/workout";
import {
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  roundToNearestDay,
  uniqueBy,
} from "../../utils";
import { DiaryAgendaDayDay } from "./DiaryAgendaDayDay";
import { DiaryPoller } from "./DiaryPoller";
import { TodoDroppable } from "./TodoDroppable";
import { getJournalEntryPrincipalDate, JournalEntry } from "./diaryUtils";

gql`
  query DiaryAgendaDayUserTodos($interval: IntervalInput!) {
    user {
      id
      exerciseSchedules {
        id
        exerciseId
        enabled
        frequency {
          years
          months
          weeks
          days
          hours
          minutes
          seconds
        }
        increment
        workingSets
        workingReps
        deloadFactor
        baseWeight
        snoozedUntil
        order
        nextSet {
          workedOutAt
          dueOn
          exerciseId
          successful
          nextWorkingSets
          nextWorkingSetInputs {
            unit
            value
            assistType
          }
          scheduleEntry {
            id
            exerciseId
            exerciseInfo {
              id
              aliases
              name
              isHidden
              inputs {
                type
              }
              instructions {
                value
              }
              tags {
                name
                type
              }
            }
            enabled
            frequency {
              years
              months
              weeks
              days
              hours
              minutes
              seconds
            }
            increment
            workingSets
            workingReps
            deloadFactor
            baseWeight
            snoozedUntil
            order
          }
        }
      }
      todos(interval: $interval) {
        id
        created
        summary
        start
        due
        completed
        order
      }
      events(interval: $interval) {
        id
        created
        summary
        start
        end
        datetype
        location
        order
      }
      workouts(interval: $interval) {
        id
        createdAt
        updatedAt
        workedOutAt
        materializedAt
        locationId
        location {
          id
          createdAt
          updatedAt
          name
          userId
          boulderCircuits {
            id
            holdColor
            gradeEstimate
            gradeRange
            name
            labelColor
            hasZones
            description
            createdAt
            updatedAt
          }
        }
        source
        exercises {
          exerciseId
          displayName
          comment
          exerciseInfo {
            id
            aliases
            name
            isHidden
            inputs {
              type
            }
            instructions {
              value
            }
            tags {
              name
              type
            }
          }
          sets {
            comment
            createdAt
            updatedAt
            inputs {
              unit
              value
              assistType
            }
            meta {
              key
              value
            }
          }
        }
      }
    }
  }
`;

export function DiaryAgendaDay({ user }: { user?: Session["user"] }) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const date = dateToString(subHours(now, 5));
  const tzDate = new TZDate(date, timeZone);

  const fetchingInterval = {
    start: addHours(addDays(startOfDay(tzDate), -8), dayStartHour),
    end: addHours(addDays(endOfDay(tzDate), 10), dayStartHour),
  };
  const pollInterval = useVisibilityAwarePollInterval(300000);

  const { data, dataState } = useQuery(
    DiaryAgendaDayUserTodosDocument,
    user
      ? { variables: { interval: fetchingInterval }, pollInterval }
      : skipToken,
  );

  if (!user) {
    return (
      <FieldSetY
        legend={null}
        className="mx-auto max-w-2xl self-stretch border-black/50 bg-gray-500/25 px-2"
      >
        <center className="text-white">
          Please{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/auth/signin"
            className={
              "text-yellow-300 underline underline-offset-4 hover:text-yellow-400"
            }
          >
            log in
          </a>{" "}
          to see your journal
        </center>
      </FieldSetY>
    );
  }

  if (dataState !== "complete") {
    return (
      <FieldSetY
        legend={null}
        className="mx-auto max-w-2xl self-stretch border-black/50 bg-gray-500/25 px-2"
      >
        <center className="text-white">Loading journal...</center>
      </FieldSetY>
    );
  }

  const userData = {
    calendarTodos: data?.user?.todos || [],
    calendarEvents: data?.user?.events || [],
    workouts: data?.user?.workouts || [],
    nextSets: data?.user?.exerciseSchedules
      ? data.user.exerciseSchedules
          .map((schedule) => schedule.nextSet)
          .filter(Boolean)
      : [],
  };

  const {
    calendarEvents = [],
    calendarTodos = [],
    workouts = [],
    nextSets = [],
  } = userData || {};

  const eventsByDate: Record<string, JournalEntry[]> = {
    [dateToString(addHours(startOfDay(tzDate), dayStartHour))]: [
      { __typename: "NowDivider", id: "now-divider", start: now, end: now },
    ],
  };
  const todosByDate: Record<string, Todo[]> = {};
  const dueSetsByDate: Record<string, NextSet[]> = {};

  const daysOfInterval = eachDayOfInterval(fetchingInterval).filter(
    (date) => addHours(date, dayStartHour) <= fetchingInterval.end,
  );
  for (const dueSet of nextSets) {
    const calName = dateToString(addHours(dueSet.dueOn, -dayStartHour));
    if (!dueSetsByDate[calName]) dueSetsByDate[calName] = [];
    dueSetsByDate[calName].push(dueSet);
  }

  for (const event of calendarEvents) {
    const eventInterval = {
      start: max(
        [
          subHours(
            max(
              [
                "datetype" in event && event.datetype === "date"
                  ? roundToNearestDay(event.start, {
                      in: tz(DEFAULT_TIMEZONE),
                    })
                  : null,

                "completed" in event ? event.completed : null,
                "due" in event ? event.due : null,
                "start" in event ? event.start : null,
                fetchingInterval.start,
              ].filter(Boolean),
            ),
            dayStartHour,
          ),
          fetchingInterval.start,
        ].filter(Boolean),
      ),
      end: min(
        [
          subHours(
            min(
              [
                "datetype" in event && event.datetype === "date"
                  ? roundToNearestDay(event.end, {
                      in: tz(DEFAULT_TIMEZONE),
                    })
                  : null,
                "completed" in event ? event.completed : null,
                "due" in event ? event.due : null,
                "end" in event ? event.end : null,
                fetchingInterval.end,
              ].filter(Boolean),
            ),
            dayStartHour,
          ),
          fetchingInterval.end,
        ].filter(Boolean),
      ),
    };

    for (const date of eachDayOfInterval(eventInterval, { in: tz(timeZone) })) {
      const dayStart = addHours(startOfDay(date), dayStartHour);
      const dayEnd = addHours(endOfDay(date), dayStartHour);

      const calName = dateToString(addHours(date, dayStartHour));

      if (event.datetype === "date") {
        if (
          isBefore(dayEnd, addHours(event.start, dayStartHour)) ||
          isAfter(dayStart, addHours(event.end, dayStartHour))
        ) {
          continue;
        }
      }

      if (!eventsByDate[calName]) eventsByDate[calName] = [];
      eventsByDate[calName].push(event);
      if (
        event.datetype !== "date" &&
        "end" in event &&
        event.end &&
        isBefore(event.end, dayEnd)
      ) {
        eventsByDate[calName].push({
          ...event,
          _this_is_the_end_of_a_event: true,
        });
      }
    }
  }

  for (const todo of calendarTodos) {
    for (const date of eachDayOfInterval(
      {
        start: subHours(
          max(
            [
              todo.completed || todo.due,
              todo.completed || todo.start,
              fetchingInterval.start,
            ].filter(Boolean),
          ),
          dayStartHour,
        ),
        end: subHours(fetchingInterval.end, dayStartHour),
      },
      { in: tz(timeZone) },
    )) {
      const dayEnd = addHours(endOfDay(date), dayStartHour);

      const calName = dateToString(addHours(date, dayStartHour));
      if (!todo.start && !todo.due && !todo.completed) {
        // If not done and no start or due date, this is a backlog item
        // we don't show in the diary
        continue;
      }
      if (
        (isPast(dayEnd) && !todo.completed) ||
        Object.values(todosByDate)
          .flat()
          .some((e) => e.id === todo.id)
      ) {
        continue;
      }
      if (!todosByDate[calName]) todosByDate[calName] = [];
      todosByDate[calName].push(todo);
    }
  }

  return (
    <div className="flex flex-col items-stretch justify-start">
      {daysOfInterval.map((dayDate, dayI) => {
        const dayStart = addHours(startOfDay(dayDate), dayStartHour);
        const dayEnd = addHours(endOfDay(dayDate), dayStartHour);

        const dayEvents = eventsByDate[dateToString(dayDate)] || [];
        const dayName = dateToString(dayDate);
        const dayWorkouts = workouts
          .filter((workout) =>
            workout.source === WorkoutSource.Self
              ? workout.workedOutAt >= startOfDay(dayDate) &&
                workout.workedOutAt <= endOfDay(dayDate)
              : workout.workedOutAt >= dayStart &&
                workout.workedOutAt <= dayEnd,
          )
          .flatMap((workout) =>
            workout.exercises.map((exercise) => ({
              ...workout,
              exercises: [exercise],
            })),
          );

        const dayLocations = uniqueBy(
          dayWorkouts.map((workout) => workout.location).filter(Boolean),
          (location) => location.id,
        );
        const dayDueSets = dueSetsByDate[dayName] || [];
        const dayTodos = todosByDate[dayName] || [];

        const dayJournalEntries = [
          ...dayEvents,
          ...dayDueSets,
          ...dayTodos,
          ...dayWorkouts,
        ]
          .sort((a, b) =>
            compareAsc(
              getJournalEntryPrincipalDate(
                b.__typename === "Workout" ? b.exercises[0]! : b,
              )?.end || new Date(0),
              getJournalEntryPrincipalDate(
                a.__typename === "Workout" ? a.exercises[0]! : a,
              )?.end || new Date(0),
            ),
          )
          .sort((a, b) => {
            const aAllDay = a.__typename === "Event" && a.datetype === "date";
            const bAllDay = b.__typename === "Event" && b.datetype === "date";
            if (aAllDay && !bAllDay) return -1;
            if (!aAllDay && bAllDay) return 1;

            return compareAsc(
              getJournalEntryPrincipalDate(
                a.__typename === "Workout" ? a.exercises[0]! : a,
              )?.start || new Date(0),
              getJournalEntryPrincipalDate(
                b.__typename === "Workout" ? b.exercises[0]! : b,
              )?.start || new Date(0),
            );
          })
          .filter((entry, i, entries) => {
            const isEventEndEntry =
              entry.__typename === "Event" &&
              "_this_is_the_end_of_a_event" in entry &&
              entry._this_is_the_end_of_a_event;

            if (isEventEndEntry) {
              const eventId = entry.id;
              const previousEntry = entries[i - 1];
              if (
                previousEntry &&
                previousEntry.__typename === "Event" &&
                previousEntry.id === eventId
              ) {
                // If the previous entry is the same event, we skip the end entry
                return false;
              }
            }

            return true;
          });

        const dayJournalEntriesIncludingLocationChanges: typeof dayJournalEntries =
          [];

        let lastLocation: ReturnType<
          typeof getLocationFromJournalEntry
        > | null = null;
        for (let i = 0; i < dayJournalEntries.length; i++) {
          const entry = dayJournalEntries[i]!;
          const location = getLocationFromJournalEntry(entry);
          const previousLocation =
            i > 0
              ? getLocationFromJournalEntry(dayJournalEntries[i - 1]!)
              : null;

          if (
            location &&
            (!previousLocation || previousLocation.id !== location.id) &&
            (!lastLocation || lastLocation.id !== location.id)
          ) {
            dayJournalEntriesIncludingLocationChanges.push({
              __typename: "LocationChange",
              id: `location-change-${i}`,
              location: location.name,
              date: new Date(
                getJournalEntryPrincipalDate(
                  entry.__typename === "Workout" ? entry.exercises[0]! : entry,
                )?.start || new Date(),
              ),
            });
            lastLocation = location;
          }

          dayJournalEntriesIncludingLocationChanges.push(entry);
        }

        return (
          <TodoDroppable key={dayI} date={setHours(dayDate, dayStartHour)}>
            <DiaryAgendaDayDay
              date={dayName}
              dayDate={dayDate}
              user={user}
              dayLocations={dayLocations}
              dayJournalEntries={dayJournalEntriesIncludingLocationChanges}
            />
          </TodoDroppable>
        );
      })}
      {user ? <DiaryPoller userId={user.id} /> : null}
    </div>
  );
}

const getLocationFromJournalEntry = (
  entry: JournalEntry,
): { id: string; name: string } | null => {
  if (entry.__typename === "Workout" && entry.location) {
    return { id: entry.location.id, name: entry.location.name };
  }
  if (entry.__typename === "Workout" && entry.locationId) {
    return { id: entry.locationId, name: entry.locationId };
  }
  if (entry.__typename === "Event" && "location" in entry && entry.location) {
    if (entry.location.trim() === "") return null;
    if (entry.location === "Microsoft Teams-møde") return null; // Fake location added by some calendar integrations for online meetings, we don't want to show it

    return { id: entry.location, name: entry.location };
  }
  return null;
};
