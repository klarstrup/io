"use client";
import { useQuery } from "@apollo/client/react";
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
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { FieldSetY } from "../../components/FieldSet";
import {
  DiaryAgendaDayUserDocument,
  DiaryAgendaDayUserTodosDocument,
  type GQLocation,
} from "../../graphql.generated";
import { useVisibilityAwarePollInterval } from "../../hooks";
import {
  dateMidpoint,
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  emptyArray,
  endOfDayButItRespectsDayStartHour,
  roundToNearestDay,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import { DiaryAgendaDayDay } from "./DiaryAgendaDayDay";
import { DiaryPoller } from "./DiaryPoller";
import { TodoDroppable } from "./TodoDroppable";
import { getJournalEntryPrincipalDate, JournalEntry } from "./diaryUtils";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query DiaryAgendaDayUser {
    user {
      id
      name
      email
      image
      emailVerified
      timeZone
      dataSources {
        id
        name
        paused
        createdAt
        updatedAt
        lastSyncedAt
        lastSuccessfulAt
        lastSuccessfulRuntime
        lastResult
        lastFailedAt
        lastFailedRuntime
        lastAttemptedAt
        lastError
        source
        config
      }
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
      }
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query DiaryAgendaDayUserTodos($interval: IntervalInput!) {
    user {
      id
      locations {
        id
        createdAt
        updatedAt
        name
        userId
        knownAddresses
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
      sleeps(interval: $interval) {
        id
        startedAt
        endedAt
        totalSleepTime
        deviceId
      }
      nextSets {
        id
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
        exerciseSchedule {
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
        url
        order
      }
      workouts(interval: $interval) {
        id
        createdAt
        updatedAt
        workedOutAt
        materializedAt
        locationId
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

export function DiaryAgendaDay({ dayDate }: { dayDate?: Date }) {
  const pollInterval = useVisibilityAwarePollInterval(300000);

  const { data: sessionData, status: sessionStatus } = useSession();
  const sessionDataLoading = sessionStatus === "loading";
  const sessionUser = sessionData?.user;

  const { data: gqlUserData } = useQuery(DiaryAgendaDayUserDocument, {
    pollInterval,
  });
  const gqlUser = gqlUserData?.user;

  const user =
    gqlUser ||
    (sessionUser
      ? {
          ...sessionUser,
          __typename: "User",
          dataSources: sessionUser.dataSources?.map((ds) => ({
            ...ds,
            __typename: "UserDataSource",
          })),
          exerciseSchedules: gqlUserData?.user?.exerciseSchedules?.map(
            (es) => ({
              ...es,
              __typename: "ExerciseSchedule",
            }),
          ),
        }
      : undefined);

  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const timeZoneDate = useMemo(() => TZDate.tz(timeZone), [timeZone]);
  const now = dayDate || timeZoneDate;
  const startOfAgendaDay = useMemo(
    () => startOfDayButItRespectsDayStartHour(now),
    [now],
  );

  const tzDate = useMemo(
    () => new TZDate(startOfAgendaDay, timeZone),
    [startOfAgendaDay, timeZone],
  );

  const fetchingInterval = useMemo(
    () => ({
      start: dayDate
        ? addHours(dayDate, dayStartHour)
        : addHours(addDays(startOfDay(tzDate), -8), dayStartHour),
      end: dayDate
        ? addHours(endOfDay(dayDate), dayStartHour)
        : addDays(endOfDayButItRespectsDayStartHour(tzDate), 14),
    }),
    [dayDate, tzDate],
  );

  const { data } = useQuery(DiaryAgendaDayUserTodosDocument, {
    variables: { interval: fetchingInterval },
    pollInterval,
  });

  const daysOfInterval = useMemo(
    () =>
      eachDayOfInterval(fetchingInterval).filter(
        (date) => addHours(date, dayStartHour) <= fetchingInterval.end,
      ),
    [fetchingInterval],
  );

  const calendarEvents = data?.user?.events || emptyArray;
  const calendarTodos = data?.user?.todos || emptyArray;
  const workouts = data?.user?.workouts || emptyArray;
  const nextSets = data?.user?.nextSets || emptyArray;
  const sleeps = data?.user?.sleeps || emptyArray;
  const userLocations = data?.user?.locations || emptyArray;

  const journalEntriesByDate2 = useMemo(() => {
    const journalEntriesByDate: Record<string, JournalEntry[]> = {};

    for (const dueSet of nextSets) {
      const calName = dateToString(addHours(dueSet.dueOn, -dayStartHour));
      if (!journalEntriesByDate[calName]) journalEntriesByDate[calName] = [];
      journalEntriesByDate[calName].push(dueSet);
    }

    for (const sleep of sleeps) {
      const calName = dateToString(addHours(sleep.endedAt, -dayStartHour));
      if (!journalEntriesByDate[calName]) journalEntriesByDate[calName] = [];
      journalEntriesByDate[calName].push(sleep);

      const calName2 = dateToString(addHours(sleep.startedAt, -dayStartHour));
      if (!journalEntriesByDate[calName2]) journalEntriesByDate[calName2] = [];
      journalEntriesByDate[calName2].push(sleep);
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

      for (const date of eachDayOfInterval(eventInterval, {
        in: tz(timeZone),
      })) {
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

        if (!journalEntriesByDate[calName]) journalEntriesByDate[calName] = [];
        if (
          event.datetype !== "date" &&
          "end" in event &&
          event.end &&
          isBefore(event.end, dayEnd)
        ) {
          // Do not insert event start event if the event started on a previous day, but insert an event end event, so that the event appears as ongoing until the end time, but not as starting at the start time

          if (
            !("start" in event) ||
            !event.start ||
            isAfter(event.start, dayStart)
          ) {
            journalEntriesByDate[calName].push(event);
          }

          // TODO: This is unstable as it creates a new object that rerenders all downstream components
          journalEntriesByDate[calName].push({
            ...event,
            _this_is_the_end_of_a_event: true,
          });
        } else {
          journalEntriesByDate[calName].push(event);
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
          Object.values(journalEntriesByDate)
            .flat()
            .some((e) => e.id === todo.id)
        ) {
          continue;
        }
        if (!journalEntriesByDate[calName]) journalEntriesByDate[calName] = [];
        journalEntriesByDate[calName].push(todo);
      }
    }

    for (const workout of workouts) {
      const calName = dateToString(workout.workedOutAt);

      if (!journalEntriesByDate[calName]) journalEntriesByDate[calName] = [];
      journalEntriesByDate[calName].push(workout);
    }

    return journalEntriesByDate;
  }, [
    calendarEvents,
    calendarTodos,
    fetchingInterval.end,
    fetchingInterval.start,
    nextSets,
    sleeps,
    timeZone,
    workouts,
  ]);

  const daysJournalEntries = useMemo(
    () =>
      daysOfInterval
        .filter((date) => addHours(date, dayStartHour) <= fetchingInterval.end)
        .map((dayDate) => {
          const dayName = dateToString(dayDate);

          const dayJournalEntries = (journalEntriesByDate2[dayName] || [])
            .sort((a, b) =>
              compareAsc(
                getJournalEntryPrincipalDate(b)?.end || new Date(0),
                getJournalEntryPrincipalDate(a)?.end || new Date(0),
              ),
            )
            .sort((a, b) => {
              const aAllDay = a.__typename === "Event" && a.datetype === "date";
              const bAllDay = b.__typename === "Event" && b.datetype === "date";
              if (aAllDay && !bAllDay) return -1;
              if (!aAllDay && bAllDay) return 1;

              return compareAsc(
                getJournalEntryPrincipalDate(a)?.start || new Date(0),
                getJournalEntryPrincipalDate(b)?.start || new Date(0),
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

          return [dayDate, dayJournalEntries] as const;
        }),
    [daysOfInterval, fetchingInterval.end, journalEntriesByDate2],
  );

  const daysJournalEntriesIncludingLocationChanges2 = useMemo(() => {
    let lastLocation: ReturnType<typeof getLocationFromJournalEntry> = null;
    return daysJournalEntries.map(
      (
        [dayDate, dayJournalEntries],
        dayJournalEntriesIndex,
        dayJournalEntriesList,
      ) => {
        const dayStart = addHours(startOfDay(dayDate), dayStartHour);
        const dayEnd = addHours(endOfDay(dayDate), dayStartHour);

        const dayName = dateToString(dayDate);

        const dayJournalEntriesIncludingLocationChanges: typeof dayJournalEntries =
          [];

        for (let i = 0; i < dayJournalEntries.length; i++) {
          const entry = dayJournalEntries[i]!;
          let previousEntry = dayJournalEntries[i - 1];
          if (
            previousEntry &&
            previousEntry.__typename === "Event" &&
            previousEntry.datetype === "date"
          ) {
            previousEntry = undefined;
          }
          if (!previousEntry && dayJournalEntriesIndex > 0) {
            // If there is no previous entry, we look for the last entry of the previous day, as that might be an entry that indicates the location at the start of the day
            previousEntry =
              dayJournalEntriesList[dayJournalEntriesIndex - 1]?.[1].slice(
                -1,
              )?.[0];
          }

          const location = getLocationFromJournalEntry(userLocations, entry);
          const previousLocation = previousEntry
            ? getLocationFromJournalEntry(userLocations, previousEntry)
            : null;

          if (
            location &&
            (!previousLocation || previousLocation.name !== location.name) &&
            (!lastLocation || lastLocation.name !== location.name)
          ) {
            const targetDate = dateMidpoint(
              (previousEntry &&
                getJournalEntryPrincipalDate(previousEntry)?.end) ||
                dayStart,
              getJournalEntryPrincipalDate(entry)?.start || dayEnd,
            );

            // TOOD: This is unstable as it creates a new object that rerenders all downstream components. Fucking figure it out
            dayJournalEntriesIncludingLocationChanges.push({
              __typename: "LocationChange",
              id: `location-change-${dayName}-${i}`,
              location: location.name,
              date: targetDate,
            });

            // eslint-disable-next-line react-hooks/immutability
            lastLocation = location;
          }

          dayJournalEntriesIncludingLocationChanges.push(entry);
        }

        return [dayDate, dayJournalEntriesIncludingLocationChanges] as const;
      },
    );
  }, [daysJournalEntries, userLocations]);

  return (
    <>
      {!sessionUser && !sessionDataLoading ? (
        <div
          className={"fixed inset-0 z-10 flex items-center justify-center p-4"}
        >
          <FieldSetY
            legend={null}
            className="flex max-w-2xl flex-col items-center justify-center border-black/50 bg-black/50 px-[3.2vw] py-[1.6vw] text-center text-white backdrop-blur-sm"
          >
            <span className={"text-4xl"}>
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
              to use io&apos;s journal
            </span>
            <hr className="my-4 w-9/10 border-t-2 border-gray-900/20" />
            <header className="mb-2 text-lg font-bold text-white">
              What is this⁉
            </header>
            <p className="font-medium text-gray-100">
              This is a diary that automatically fills itself with calendar
              events, todos, workouts, sleeps and more from the services that i
              already use.
            </p>
            <p className="mt-2 text-gray-100">
              I use it to get an overview of my day, reflect on how I spend my
              time, and plan my days by dragging and dropping the entries as
              well as setting up workout schedules that automatically populate
              the diary with my workouts based on set progressions and
              frequencies that I define.
            </p>

            <a
              href="https://github.com/klarstrup/io"
              target="_blank"
              rel="noopener noreferrer"
              className={
                "mt-4 block text-yellow-300 underline underline-offset-4 hover:text-yellow-400"
              }
            >
              Learn more and read the source code on GitHub
            </a>
          </FieldSetY>
        </div>
      ) : null}
      <div className="flex flex-col items-stretch justify-start">
        {daysJournalEntriesIncludingLocationChanges2.map(
          ([dayDate, dayJournalEntries]) => (
            <TodoDroppable
              key={dateToString(dayDate)}
              date={setHours(dayDate, dayStartHour)}
            >
              <DiaryAgendaDayDay
                date={dateToString(dayDate)}
                dayDate={dayDate}
                user={user}
                dayLocations={userLocations}
                dayJournalEntries={dayJournalEntries}
              />
            </TodoDroppable>
          ),
        )}
        {user ? <DiaryPoller userId={user.id} /> : null}
      </div>
    </>
  );
}

const getLocationFromJournalEntry = (
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
  return null;
};
