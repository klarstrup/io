"use client";
import { useQuery } from "@apollo/client/react";
import { tz } from "@date-fns/tz";
import {
  addDays,
  addHours,
  compareAsc,
  eachDayOfInterval,
  endOfDay,
  isAfter,
  isBefore,
  isEqual,
  isPast,
  max,
  min,
  startOfDay,
  subDays,
  subHours,
  subMilliseconds,
} from "date-fns";
import { gql } from "graphql-tag";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FieldSetY } from "../../components/FieldSet";
import { ShyGuy } from "../../components/ShyGuy";
import {
  DiaryAgendaDayUserTodosDocument,
  type GQLocation,
} from "../../graphql.generated/graphql";
import { useNow, useVisibilityAwarePollInterval } from "../../hooks";
import { useIdle } from "../../hooks/useIdle";
import useInterval from "../../hooks/useInterval";
import { useIsSSR } from "../../hooks/useIsSSR";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { WorkoutSource } from "../../models/workout";
import {
  cotemporality,
  dateMidpoint,
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  emptyArray,
  endOfDayButItRespectsDayStartHour,
  isUTCMidnight,
  roundToNearestDay,
  startOfDayButItRespectsDayStartHour,
  stringToDate,
} from "../../utils";
import { DiaryAgendaDayDay } from "./DiaryAgendaDayDay";
import { DiaryPoller } from "./DiaryPoller";
import { TodoDroppable } from "./TodoDroppable";
import {
  getJournalEntryPrincipalDate,
  isEventEntireDay,
  type JournalEntry,
} from "./diaryUtils";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query DiaryAgendaDayUserTodos($after: String!, $before: String!) {
    user {
      id
      name
      email
      image
      emailVerified
      timeZone
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
      journalEntries(after: $after, before: $before) {
        __typename
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          __typename
          ... on Delivery {
            id
            timestamp
            status
            from
            url
          }
          ... on Meal {
            id
            datetime
            url
            foodEntries {
              id
              datetime
              food {
                id
                description
              }
            }
          }
          ... on Sleep {
            id
            startedAt
            endedAt
            totalSleepTime
            deviceId
          }
          ... on NextSet {
            id
            lastWorkedOutAt
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
            }
          }
          ... on Todo {
            id
            created
            summary
            due
            completed
          }
          ... on Trip {
            id
            start
            end
            legs {
              start
              end
              from
              to
              mode
            }
          }
          ... on Event {
            id
            created
            summary
            start
            end
            datetype
            location
            url
          }
          ... on Workout {
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
                  options {
                    value
                  }
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
    }
  }
`;

export function DiaryAgendaDay({
  selectedDayStart,
}: {
  selectedDayStart?: Date;
}) {
  const pollInterval = useVisibilityAwarePollInterval(300000);

  const { data: sessionData, status: sessionStatus } = useSession();
  const sessionDataLoading = sessionStatus === "loading";
  const sessionUser = sessionData?.user;

  const variables = useMemo(
    () => ({
      after: dateToString(
        startOfDay(
          selectedDayStart ? selectedDayStart : subDays(new Date(), 3),
        ),
      ),
      before: dateToString(
        endOfDayButItRespectsDayStartHour(
          selectedDayStart ? selectedDayStart : addDays(new Date(), 3),
        ),
      ),
    }),
    [selectedDayStart],
  );

  const { data, loading, networkStatus, fetchMore } = useQuery(
    DiaryAgendaDayUserTodosDocument,
    { variables, pollInterval },
  );
  const startCursor = data?.user?.journalEntries?.pageInfo?.startCursor;
  const endCursor = data?.user?.journalEntries?.pageInfo?.endCursor;
  const timeZone = data?.user?.timeZone || DEFAULT_TIMEZONE;
  const now = useNow(60 * 1000, timeZone);
  const startOfAgendaDay = useMemo(
    () =>
      selectedDayStart
        ? addHours(selectedDayStart, dayStartHour)
        : startOfDayButItRespectsDayStartHour(now),
    [selectedDayStart, now],
  );

  const fetchingInterval = useMemo(
    () => ({
      start: startCursor
        ? stringToDate(startCursor)
        : selectedDayStart
          ? selectedDayStart
          : startOfDay(subDays(startOfAgendaDay, 3)),
      end: endCursor
        ? stringToDate(endCursor)
        : selectedDayStart
          ? selectedDayStart
          : addDays(endOfDayButItRespectsDayStartHour(startOfAgendaDay), 3),
    }),
    [startCursor, endCursor, startOfAgendaDay],
  );

  const daysOfInterval = useMemo(
    () =>
      eachDayOfInterval(fetchingInterval).filter(
        (date) => date <= fetchingInterval.end,
      ),
    [fetchingInterval],
  );

  const userLocations = data?.user?.locations || emptyArray;
  const userJournalEntries = data?.user?.journalEntries.nodes || emptyArray;

  const journalEntriesByDate2 = useMemo(() => {
    const journalEntriesByDate: Record<string, JournalEntry[]> = {
      [dateToString(startOfDayButItRespectsDayStartHour(now))]: [
        { __typename: "NowDivider", id: "now-divider", start: now, end: now },
      ],
    };
    const addEntryToDate = (entry: JournalEntry, date: Date) => {
      const calName = dateToString(startOfDayButItRespectsDayStartHour(date));
      if (!journalEntriesByDate[calName]) journalEntriesByDate[calName] = [];
      journalEntriesByDate[calName].push(entry);
    };
    for (const entry of userJournalEntries) {
      if (entry.__typename === "NextSet") {
        addEntryToDate(entry, max([entry.dueOn, now]));
      } else if (entry.__typename === "Sleep") {
        addEntryToDate(entry, entry.startedAt);

        // Hack for sleep ends as separate entries
        addEntryToDate({ ...entry, _is_separated_end: true }, entry.endedAt);
      } else if (entry.__typename === "Event") {
        const eventInterval = {
          start: max(
            [
              subHours(
                max(
                  [
                    "datetype" in entry && entry.datetype === "date"
                      ? roundToNearestDay(entry.start, { in: tz(timeZone) })
                      : null,

                    "completed" in entry ? entry.completed : null,
                    "due" in entry ? entry.due : null,
                    "start" in entry ? entry.start : null,
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
                    "datetype" in entry && entry.datetype === "date"
                      ? roundToNearestDay(entry.end, { in: tz(timeZone) })
                      : null,
                    "completed" in entry ? entry.completed : null,
                    "due" in entry ? entry.due : null,
                    "end" in entry ? entry.end : null,
                    fetchingInterval.end,
                  ].filter(Boolean),
                ),
                dayStartHour,
              ),
              fetchingInterval.end,
            ].filter(Boolean),
          ),
        };

        let insertedStart = false;
        for (const date of eachDayOfInterval(eventInterval, {
          in: tz(timeZone),
        })) {
          const dayStart = addHours(startOfDay(date), dayStartHour);
          const dayEnd = addHours(endOfDay(date), dayStartHour);
          const eventIsAllDay = isEventEntireDay(entry, date);

          if (entry.datetype === "date") {
            if (
              isBefore(dayEnd, addHours(entry.start, dayStartHour)) ||
              isAfter(dayStart, addHours(entry.end, dayStartHour))
            ) {
              continue;
            }
          }

          if (
            entry.datetype !== "date" &&
            "end" in entry &&
            entry.end &&
            isBefore(entry.end, dayEnd) &&
            !isEqual(entry.start, entry.end) // Don't insert an end for 0 duration events
          ) {
            // Do not insert event start event if the event started on a previous day, but insert an event end event, so that the event appears as ongoing until the end time, but not as starting at the start time

            if (
              !("start" in entry) ||
              !entry.start ||
              !isBefore(entry.start, dayStart)
            ) {
              if (!insertedStart) {
                addEntryToDate(entry, entry.start);
                insertedStart = true;
              }
            }

            addEntryToDate({ ...entry, _is_separated_end: true }, entry.end);
          } else if (
            !insertedStart ||
            entry.datetype === "date" ||
            eventIsAllDay
          ) {
            addEntryToDate(entry, addHours(date, dayStartHour));
            insertedStart = true;
          }
        }
      } else if (entry.__typename === "Todo") {
        // If not done and no due date, this is a backlog item, we don't show in the diary
        if (!entry.due && !entry.completed) continue;

        for (const date of eachDayOfInterval(
          {
            start: subHours(
              max(
                [entry.completed || entry.due, fetchingInterval.start].filter(
                  Boolean,
                ),
              ),
              dayStartHour,
            ),
            end: subHours(fetchingInterval.end, dayStartHour),
          },
          { in: tz(timeZone) },
        )) {
          const dayEnd = endOfDayButItRespectsDayStartHour(date);

          if (
            (isPast(dayEnd) && !entry.completed) ||
            Object.values(journalEntriesByDate)
              .flat()
              .some((e) => e.id === entry.id)
          ) {
            continue;
          }
          addEntryToDate(
            entry,
            entry.completed || (entry.due && max([entry.due, now])) || date,
          );
        }
      } else if (entry.__typename === "Workout") {
        addEntryToDate(
          entry,
          entry.source === WorkoutSource.Self &&
            isUTCMidnight(entry.workedOutAt)
            ? addHours(entry.workedOutAt, dayStartHour)
            : entry.workedOutAt,
        );
      } else if (entry.__typename === "Trip") {
        addEntryToDate(entry, entry.start);
      } else if (entry.__typename === "Meal") {
        addEntryToDate(entry, entry.datetime);
      } else if (entry.__typename === "Delivery") {
        addEntryToDate(entry, entry.timestamp);
      } else {
        entry satisfies never;
      }
    }

    return journalEntriesByDate;
  }, [userJournalEntries, fetchingInterval, timeZone, now]);

  const daysJournalEntries = useMemo(
    () =>
      daysOfInterval
        .filter((date) => addHours(date, dayStartHour) <= fetchingInterval.end)
        .map((dayDate) => {
          const dayStart = addHours(startOfDay(dayDate), dayStartHour);

          const dayRange = {
            start: dayStart,
            end: endOfDayButItRespectsDayStartHour(dayStart),
          };

          const dayName = dateToString(dayDate);

          const dayJournalEntries = (journalEntriesByDate2[dayName] || [])
            .sort((a, b) => a.id.localeCompare(b.id)) // Sort by ID to ensure consistent order for entries with the same start time
            .sort((a, b) => {
              const aText =
                "summary" in a
                  ? a.summary
                  : "exerciseSchedule" in a &&
                    "exerciseInfo" in a.exerciseSchedule &&
                    a.exerciseSchedule.exerciseInfo.name;
              const bText =
                "summary" in b
                  ? b.summary
                  : "exerciseSchedule" in b &&
                    "exerciseInfo" in b.exerciseSchedule &&
                    b.exerciseSchedule.exerciseInfo.name;
              if (aText && bText) {
                return aText.localeCompare(bText);
              }
              return 0;
            })
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

              const aPrincipalDate = getJournalEntryPrincipalDate(a);
              const bPrincipalDate = getJournalEntryPrincipalDate(b);

              return compareAsc(
                aPrincipalDate?.start || new Date(0),
                bPrincipalDate?.start || new Date(0),
              );
            })
            // If the previous entry is the same event and we aren't in the middle of it, we skip the end entry
            .filter(
              (entry, i, entries) =>
                !(
                  entry.__typename === "Event" &&
                  "_is_separated_end" in entry &&
                  entry._is_separated_end &&
                  entries[i - 1]?.id === entry.id &&
                  cotemporality(entry) !== "current"
                ),
            )
            // If the previous entry is a fully coincident event, we skip the end entry
            .filter((entry, i, entries) => {
              const previousEntry = entries[i - 1];
              if (
                entry.__typename === "Event" &&
                previousEntry?.__typename === "Event"
              ) {
                if (
                  "_is_separated_end" in entry &&
                  entry._is_separated_end &&
                  isEqual(entry.start, previousEntry.start) &&
                  isEqual(entry.end, previousEntry.end)
                ) {
                  return false;
                }
              }
              return true;
            });

          return [dayRange, dayJournalEntries] as const;
        }),
    [daysOfInterval, fetchingInterval.end, journalEntriesByDate2],
  );

  const daysJournalEntriesIncludingLocationChanges2 = useMemo(() => {
    let lastLocation: ReturnType<typeof getLocationFromJournalEntry> = null;
    return daysJournalEntries.map(
      (
        [dayRange, dayJournalEntries],
        dayJournalEntriesIndex,
        dayJournalEntriesList,
      ) => {
        const dayJournalEntriesIncludingLocationChanges: typeof dayJournalEntries =
          [];

        for (let i = 0; i < dayJournalEntries.length; i++) {
          const entry = dayJournalEntries[i]!;
          let previousEntry = dayJournalEntries[i - 1];
          if (
            previousEntry &&
            previousEntry.__typename === "Event" &&
            (previousEntry.datetype === "date" ||
              isEventEntireDay(previousEntry, dayRange.start))
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
            !(
              entry.__typename === "Event" &&
              isEventEntireDay(entry, dayRange.start)
            ) &&
            (!previousLocation || previousLocation.name !== location.name) &&
            (!lastLocation || lastLocation.name !== location.name)
          ) {
            const previousEntryIsEnd =
              previousEntry &&
              "_is_separated_end" in previousEntry &&
              previousEntry._is_separated_end;
            const entryIsEnd =
              "_is_separated_end" in entry && entry._is_separated_end;

            const entryPricipalDate = getJournalEntryPrincipalDate(entry);
            const previousEntryPrincipalDate = previousEntry
              ? getJournalEntryPrincipalDate(previousEntry)
              : null;
            const targetDateFrom =
              (previousEntry &&
                previousEntryPrincipalDate &&
                entryPricipalDate &&
                min(
                  [
                    previousEntryIsEnd ||
                    entryPricipalDate.start > previousEntryPrincipalDate.end
                      ? previousEntryPrincipalDate.end
                      : previousEntryPrincipalDate.start,
                    entryPricipalDate.start,
                  ].filter(Boolean),
                )) ||
              dayRange.start;
            const targetDateTo =
              (entryIsEnd
                ? entryPricipalDate?.end
                : entryPricipalDate?.start) || dayRange.end;
            const targetDate = dateMidpoint(targetDateFrom, targetDateTo);

            if (!entryIsEnd) {
              // TOOD: This is unstable as it creates a new object that rerenders all downstream components. Fucking figure it out
              dayJournalEntriesIncludingLocationChanges.push({
                __typename: "LocationChange",
                id: `location-change-${location.id}-${entry.id}`,
                location: location.name,
                start: targetDate,
                end: max([subMilliseconds(targetDateTo, 1), targetDate]),
              });

              // eslint-disable-next-line react-hooks/immutability
              lastLocation = location;
            }
          }

          dayJournalEntriesIncludingLocationChanges.push(entry);
        }

        return [dayRange, dayJournalEntriesIncludingLocationChanges] as const;
      },
    );
  }, [daysJournalEntries, userLocations]);

  const lastInteractedWithPage = useRef<Date | null>(null);
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractedWithPage.current = new Date();
    };
    window.addEventListener("mousedown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("mousedown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  const scrollToNow = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = document
      .querySelector<HTMLElement>(".now-divider")
      ?.closest<HTMLElement>(".diary-agenda-day-entry")?.parentElement;
    if (!el) return;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const elVerticalCenter = el.offsetTop + el.offsetHeight / 2;
    const elHorizontalCenter = el.offsetLeft + el.offsetWidth / 2;
    window.scrollTo(
      elHorizontalCenter - viewportWidth / 2 + el.offsetWidth / 2,
      elVerticalCenter - viewportHeight / 2,
    );
  }, []);

  const isSSR = useIsSSR();
  const isIdle = useIdle();
  useEffect(() => {
    if (!isSSR) scrollToNow();
  }, [isSSR, scrollToNow]);

  useInterval(() => {
    if (isIdle) scrollToNow();
  }, 5000);

  const isPointerFine = useMediaQuery("(pointer: fine)");
  const isXL = useMediaQuery("(min-width: 64rem)");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const element = document.scrollingElement || document.documentElement;
    if (!(element instanceof HTMLElement)) return;

    const transformScroll = (event: Event) => {
      if (
        !isPointerFine ||
        !isXL ||
        !(event instanceof WheelEvent) ||
        !event.deltaY ||
        !(event.currentTarget instanceof HTMLElement)
      ) {
        return;
      }

      event.currentTarget.scrollLeft += event.deltaY;
    };

    element.addEventListener("wheel", transformScroll);
    if (isPointerFine && isXL) {
      element.style.overflowY = "hidden";
      element.style.overflowX = "scroll";
    }
    return () => {
      element.removeEventListener("wheel", transformScroll);
      if (isPointerFine && isXL) {
        element.style.overflowY = "";
        element.style.overflowX = "";
      }
    };
  }, [isPointerFine, isXL]);

  return (
    <>
      {!sessionUser && !sessionDataLoading ? (
        <div
          className={
            "fixed inset-0 z-10 flex items-center justify-center p-4 backdrop-blur-sm"
          }
        >
          <FieldSetY
            legend={null}
            className="flex max-w-2xl flex-col items-center justify-center border-black/50 bg-black/50 px-[3.2vw] py-[1.6vw] text-center text-white"
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
      <div
        className={
          "flex flex-col items-stretch justify-center px-2 lg:flex-1 lg:flex-row lg:gap-5 lg:self-start lg:justify-self-center lg:px-0 lg:py-2"
        }
      >
        {selectedDayStart ? null : ( // We only want to load more days when we are on the current day view, not when we are looking at a specific day in the past or future
          <ShyGuy
            onSeen={() => {
              if (loading) return;

              const firstDay =
                daysJournalEntriesIncludingLocationChanges2[0]?.[0];

              if (!firstDay) return;

              return fetchMore({
                variables: {
                  after: dateToString(
                    startOfDay(
                      subDays(
                        stringToDate(
                          data?.user?.journalEntries.pageInfo.startCursor ||
                            dateToString(new Date()),
                        ),
                        3,
                      ),
                    ),
                  ),
                  before:
                    data?.user?.journalEntries.pageInfo.startCursor ||
                    undefined,
                },
                updateQuery(previousData, { fetchMoreResult }) {
                  if (!fetchMoreResult?.user?.journalEntries)
                    return previousData;

                  const previousNodes =
                    previousData.user?.journalEntries.nodes || [];
                  const fetchMoreNodes =
                    fetchMoreResult.user?.journalEntries.nodes || [];
                  const previousPageInfo =
                    previousData.user?.journalEntries.pageInfo;
                  const fetchMorePageInfo =
                    fetchMoreResult.user?.journalEntries.pageInfo;
                  return {
                    user: {
                      ...previousData.user!,
                      journalEntries: {
                        __typename: "JournalEntriesConnection",
                        pageInfo: {
                          __typename: "PageInfo",
                          hasNextPage:
                            fetchMorePageInfo?.hasNextPage ??
                            previousPageInfo?.hasNextPage ??
                            true,
                          hasPreviousPage:
                            previousPageInfo?.hasPreviousPage ??
                            fetchMorePageInfo?.hasPreviousPage ??
                            true,
                          startCursor:
                            fetchMorePageInfo?.startCursor ||
                            previousPageInfo?.startCursor ||
                            null,
                          endCursor:
                            previousPageInfo?.endCursor ||
                            fetchMorePageInfo?.endCursor ||
                            null,
                        },
                        nodes: [...fetchMoreNodes, ...previousNodes],
                      },
                    },
                  };
                },
              });
            }}
          />
        )}
        {daysJournalEntriesIncludingLocationChanges2.map(
          ([dayRange, dayJournalEntries]) => {
            const dayStart = startOfDayButItRespectsDayStartHour(
              dayRange.start,
            );
            return (
              <TodoDroppable key={dateToString(dayRange.start)} date={dayStart}>
                <DiaryAgendaDayDay
                  now={now}
                  date={dateToString(dayRange.start)}
                  dayRange={dayRange}
                  userTimeZone={timeZone}
                  dayLocations={userLocations}
                  dayJournalEntries={dayJournalEntries}
                  isSelectedDay={Boolean(selectedDayStart)}
                  isLoadingEntries={
                    loading && networkStatus !== 4 && networkStatus !== 1
                  }
                />
              </TodoDroppable>
            );
          },
        )}
        {selectedDayStart ? null : ( // We only want to load more days when we are on the current day view, not when we are looking at a specific day in the past or future
          <ShyGuy
            onSeen={() => {
              if (loading) return;

              const lastDay =
                daysJournalEntriesIncludingLocationChanges2.slice(-1)[0]?.[0];

              if (!lastDay) return;

              return fetchMore({
                variables: {
                  after: dateToString(
                    new Date(
                      data?.user?.journalEntries.pageInfo.endCursor
                        ? stringToDate(
                            data.user.journalEntries.pageInfo.endCursor,
                          )
                        : new Date(),
                    ),
                  ),
                  before: dateToString(
                    endOfDayButItRespectsDayStartHour(
                      addDays(
                        data?.user?.journalEntries.pageInfo.endCursor
                          ? stringToDate(
                              data.user.journalEntries.pageInfo.endCursor,
                            )
                          : new Date(),
                        3,
                      ),
                    ),
                  ),
                },
                updateQuery(previousData, { fetchMoreResult }) {
                  if (!fetchMoreResult?.user?.journalEntries)
                    return previousData;

                  const previousNodes =
                    previousData.user?.journalEntries.nodes || [];
                  const fetchMoreNodes =
                    fetchMoreResult.user?.journalEntries.nodes || [];
                  const previousPageInfo =
                    previousData.user?.journalEntries.pageInfo;
                  const fetchMorePageInfo =
                    fetchMoreResult.user?.journalEntries.pageInfo;

                  return {
                    user: {
                      ...previousData.user!,
                      journalEntries: {
                        __typename: "JournalEntriesConnection",
                        pageInfo: {
                          __typename: "PageInfo",
                          hasNextPage:
                            fetchMorePageInfo?.hasNextPage ??
                            previousPageInfo?.hasNextPage ??
                            true,
                          hasPreviousPage:
                            previousPageInfo?.hasPreviousPage ??
                            fetchMorePageInfo?.hasPreviousPage ??
                            true,
                          startCursor:
                            previousPageInfo?.startCursor ||
                            fetchMorePageInfo?.startCursor ||
                            null,
                          endCursor:
                            fetchMorePageInfo?.endCursor ||
                            previousPageInfo?.endCursor ||
                            null,
                        },
                        nodes: [...previousNodes, ...fetchMoreNodes],
                      },
                    },
                  };
                },
              });
            }}
          />
        )}
        {sessionData?.user ? (
          <DiaryPoller userId={sessionData.user.id} />
        ) : null}
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
