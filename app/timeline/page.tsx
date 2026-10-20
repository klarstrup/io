"use client";
import { useQuery } from "@apollo/client/react";
import {
  addDays,
  compareAsc,
  isEqual,
  max,
  min,
  startOfDay,
  subDays,
} from "date-fns";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { noop } from "../../actions";
import { FieldSetY } from "../../components/FieldSet";
import { ShyGuy } from "../../components/ShyGuy";
import { useNow, useVisibilityAwarePollInterval } from "../../hooks";
import { useIdle } from "../../hooks/useIdle";
import useInterval from "../../hooks/useInterval";
import { useIsSSR } from "../../hooks/useIsSSR";
import { useSession } from "../../lib/auth-client";
import {
  cotemporality,
  dateMidpoint,
  dateToString,
  DEFAULT_TIMEZONE,
  emptyArray,
  endOfDayButItRespectsDayStartHour,
  stringToDate,
} from "../../utils";
import {
  UserJournalEntriesDocument,
  UserLocationsDocument,
} from "../diary/DiaryAgendaDay";
import { DiaryAgendaDayDayContents } from "../diary/DiaryAgendaDayDayContents";
import { DiaryPoller } from "../diary/DiaryPoller";
import {
  getJournalEntryPrincipalDate,
  getLocationFromJournalEntry,
  isSeparatedEnd,
  isVisuallyIdenticalEvent,
  JournalEntryType,
  journalEntryTypes,
  type JournalEntry,
  type LocationChange,
} from "../diary/diaryUtils";
import { TodoDragDropContainer } from "../diary/TodoDroppable";

export default function TimelinePage({
  selectedDayStart,
}: {
  selectedDayStart?: Date;
}) {
  const pollInterval = useVisibilityAwarePollInterval(300000);

  const { data: sessionData, isPending: sessionPending } = useSession();
  const sessionDataLoading = sessionPending;
  const sessionUser = sessionData?.user;

  const timeZone = sessionData?.user?.timeZone || DEFAULT_TIMEZONE;
  const now = useNow(60 * 1000, timeZone);

  const [entryType, setEntryType] = useState<JournalEntryType | null>(null);

  const variables = useMemo(
    () =>
      selectedDayStart
        ? { on: dateToString(startOfDay(selectedDayStart)), type: entryType }
        : {
            after: dateToString(startOfDay(subDays(now, entryType ? 30 : 3))),
            before: dateToString(
              endOfDayButItRespectsDayStartHour(
                addDays(now, entryType ? 30 : 3),
              ),
            ),
            type: entryType,
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps -- don't want the query to reset every minute
    [selectedDayStart, entryType],
  );

  const { data: locationsData } = useQuery(UserLocationsDocument);

  const { data, loading, fetchMore, refetch } = useQuery(
    UserJournalEntriesDocument,
    {
      variables,
      fetchPolicy: selectedDayStart ? "cache-and-network" : "cache-first",
    },
  );
  const startCursor = data?.user?.journalEntries?.pageInfo?.startCursor;
  const endCursor = data?.user?.journalEntries?.pageInfo?.endCursor;

  const fetchingInterval = useMemo(
    () => ({
      start: startCursor
        ? stringToDate(startCursor)
        : startOfDay(subDays(now, entryType ? 30 : 3)),
      end: endCursor
        ? stringToDate(endCursor)
        : endOfDayButItRespectsDayStartHour(addDays(now, entryType ? 30 : 3)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps -- don't want the query to reset every minute
    [startCursor, endCursor],
  );

  useInterval(() => {
    if (!loading) {
      void refetch({ after: startCursor, before: endCursor, type: entryType });
    }
    void noop();
  }, pollInterval);

  const userLocations = locationsData?.user?.locations || emptyArray;
  const userJournalEntries = data?.user?.journalEntries.nodes || emptyArray;

  const journalEntries2 = useMemo(() => {
    const journalEntries: JournalEntry[] = [
      { __typename: "NowDivider", id: "now-divider", start: now, end: now },
    ];

    for (const entry of userJournalEntries) {
      // TODO: Find a better way of merging events that are duplicated between calendars, for now we just skip them if they are visually identical
      if (journalEntries.some((e) => isVisuallyIdenticalEvent(e, entry))) {
        continue;
      }

      journalEntries.push(entry);
      if (entry.__typename === "Sleep") {
        journalEntries.push({ ...entry, _is_separated_end: true });
      } else if (entry.__typename === "Event") {
        journalEntries.push({ ...entry, _is_separated_end: true });
      } else if (entry.__typename === "Trip") {
        journalEntries.push({ ...entry, _is_separated_end: true });
      }
    }

    return journalEntries;
  }, [userJournalEntries, now]);

  const journalEntries3 = useMemo(
    () =>
      journalEntries2
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
        .sort((a, b) => a.__typename.localeCompare(b.__typename)) // Sort by typename to ensure consistent order for entries with the same start time
        .sort((a, b) =>
          a.__typename == "Meal" && b.__typename !== "Meal"
            ? -1
            : b.__typename == "Meal" && a.__typename !== "Meal"
              ? 1
              : compareAsc(
                  getJournalEntryPrincipalDate(b).end,
                  getJournalEntryPrincipalDate(a).end,
                ),
        )
        .sort((a, b) =>
          compareAsc(
            getJournalEntryPrincipalDate(a).start,
            getJournalEntryPrincipalDate(b).start,
          ),
        )
        // If the previous entry is the same event and we aren't in the middle of it, we skip the end entry
        .filter(
          (entry, i, entries) =>
            !(
              entry.__typename === "Event" &&
              isSeparatedEnd(entry) &&
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
              isSeparatedEnd(entry) &&
              isEqual(entry.start, previousEntry.start) &&
              isEqual(entry.end, previousEntry.end)
            ) {
              return false;
            }
          }
          return true;
        }),
    [journalEntries2],
  );

  const journalEntriesIncludingLocationChanges2 = useMemo(() => {
    let lastLocation: ReturnType<typeof getLocationFromJournalEntry> = null;

    const dayJournalEntriesIncludingLocationChanges: typeof journalEntries3 =
      [];

    for (let i = 0; i < journalEntries3.length; i++) {
      const entry = journalEntries3[i]!;
      const previousEntry = journalEntries3[i - 1];

      const location = getLocationFromJournalEntry(userLocations, entry);
      const previousLocation = previousEntry
        ? getLocationFromJournalEntry(userLocations, previousEntry)
        : null;

      if (
        location &&
        !(
          !entryType &&
          entry.__typename === "Meal" &&
          location !== previousLocation
        ) &&
        (!previousLocation || previousLocation.name !== location.name) &&
        (!lastLocation || lastLocation.name !== location.name)
      ) {
        const previousEntryIsEnd =
          previousEntry && isSeparatedEnd(previousEntry);
        const entryIsEnd = isSeparatedEnd(entry);

        const entryPricipalDate = getJournalEntryPrincipalDate(entry);
        const previousEntryPrincipalDate = previousEntry
          ? getJournalEntryPrincipalDate(previousEntry)
          : null;
        const targetDateFrom =
          previousEntry &&
          previousEntryPrincipalDate &&
          min(
            [
              previousEntryIsEnd ||
              entryPricipalDate.start > previousEntryPrincipalDate.end
                ? previousEntryPrincipalDate.end
                : previousEntryPrincipalDate.start,
              entryPricipalDate.start,
            ].filter(Boolean),
          );
        const targetDateTo = entryIsEnd
          ? entryPricipalDate?.end
          : entryPricipalDate?.start;
        const targetDate =
          targetDateFrom &&
          targetDateTo &&
          dateMidpoint(targetDateFrom, targetDateTo);

        if (!entryIsEnd && targetDate) {
          // TOOD: This is unstable as it creates a new object that rerenders all downstream components. Fucking figure it out
          const locationChangeEntry = {
            __typename: "LocationChange",
            id: `location-change-${location.id}-${entry.id}`,
            locationId: location.id !== location.name ? location.id : null,
            location: location.name,
            start: targetDate,
            end: max([targetDateTo, targetDate]),
          } satisfies LocationChange;

          // if the previous entry has the same start time as the current entry and no location change associated, this location should be considered the same as the previous one
          // and be inserted before the previous entry in the list
          if (
            previousEntryPrincipalDate &&
            !previousEntryIsEnd &&
            previousEntry?.__typename !== "LocationChange" &&
            isEqual(previousEntryPrincipalDate.start, entryPricipalDate.start)
          ) {
            dayJournalEntriesIncludingLocationChanges.splice(
              dayJournalEntriesIncludingLocationChanges.length - 1,
              0,
              locationChangeEntry,
            );
          } else {
            dayJournalEntriesIncludingLocationChanges.push(locationChangeEntry);
          }

          lastLocation = location;
        }
      }

      dayJournalEntriesIncludingLocationChanges.push(entry);
    }

    return dayJournalEntriesIncludingLocationChanges;
  }, [entryType, journalEntries3, userLocations]);

  const lastInteractedWithPageRef = useRef<Date | null>(null);
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractedWithPageRef.current = new Date();
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
    const nowDivider = document.querySelector<HTMLElement>(".now-divider");
    if (!nowDivider) return;

    nowDivider.scrollIntoView({ block: "center" });
  }, []);

  const isSSR = useIsSSR();
  const isIdle = useIdle();
  useEffect(() => {
    if (!isSSR) scrollToNow();
  }, [isSSR, scrollToNow]);

  useInterval(() => {
    if (isIdle) scrollToNow();
  }, 5000);

  return (
    <>
      <div
        className={
          "fixed left-1/2 z-5 flex max-w-[calc(100%-5rem)] -translate-x-1/2 gap-x-2 border border-[yellow]/25 bg-white/10 px-1 text-xs backdrop-blur-md sm:gap-2 pointer-coarse:bottom-12 pointer-coarse:rounded-t-xl pointer-fine:top-18 pointer-fine:rounded-b-xl"
        }
        style={{
          boxShadow:
            "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
        }}
      >
        <button onClick={scrollToNow}>Scroll to Now</button>
        <button onClick={() => window.scrollTo(0, 0)}>Scroll to Top</button>
        <button onClick={() => window.scrollTo(0, document.body.scrollHeight)}>
          Scroll to Bottom
        </button>
        <select
          onChange={(e) =>
            setEntryType((e.target.value || null) as JournalEntryType | null)
          }
        >
          <option value="">All</option>
          {journalEntryTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
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
      <TodoDragDropContainer>
        <div
          className={
            "flex flex-col items-stretch justify-center px-2" +
            "diary-agenda-day-entry z-4 w-full border border-[yellow]/25 bg-white/10 backdrop-blur-sm " +
            "mx-auto mb-1 flex max-w-lg flex-0! flex-col items-stretch gap-1 pr-1 pb-1 pl-0 transition-colors " +
            "bg-white/90"
          }
        >
          {selectedDayStart ? null : ( // We only want to load more days when we are on the current day view, not when we are looking at a specific day in the past or future
            <ShyGuy
              requireScroll={!entryType}
              onSeen={() => {
                if (loading) return;

                const firstDay = journalEntriesIncludingLocationChanges2[0];

                if (!firstDay) return;

                const startCursor =
                  data?.user?.journalEntries.pageInfo.startCursor;

                if (!startCursor) return;

                const hasPreviousPage =
                  data?.user?.journalEntries.pageInfo.hasPreviousPage;

                if (!hasPreviousPage) return;

                return fetchMore({
                  variables: {
                    after: dateToString(
                      startOfDay(
                        subDays(stringToDate(startCursor), entryType ? 30 : 4),
                      ),
                    ),
                    before: startCursor,
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
                            hasNextPage: previousPageInfo
                              ? fetchMorePageInfo?.hasNextPage &&
                                previousPageInfo.hasNextPage
                              : fetchMorePageInfo?.hasNextPage,
                            hasPreviousPage: previousPageInfo
                              ? fetchMorePageInfo?.hasPreviousPage &&
                                previousPageInfo.hasPreviousPage
                              : fetchMorePageInfo?.hasPreviousPage,
                            startCursor:
                              fetchMorePageInfo.startCursor ||
                              previousPageInfo?.startCursor ||
                              null,
                            endCursor:
                              previousPageInfo?.endCursor ||
                              fetchMorePageInfo.endCursor ||
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
          <Suspense
            fallback={
              <div className={"pl-10 text-gray-400/50 italic"}>Loading...</div>
            }
          >
            <DiaryAgendaDayDayContents
              now={now}
              dayRange={fetchingInterval}
              dayLocations={userLocations}
              userTimeZone={timeZone}
              dayJournalEntries={journalEntriesIncludingLocationChanges2}
            />
          </Suspense>
          {selectedDayStart ? null : ( // We only want to load more days when we are on the current day view, not when we are looking at a specific day in the past or future
            <ShyGuy
              requireScroll={!entryType}
              onSeen={() => {
                if (loading) return;

                const lastDay =
                  journalEntriesIncludingLocationChanges2.slice(-1)[0];

                if (!lastDay) return;

                const endCursor = data?.user?.journalEntries.pageInfo.endCursor;

                if (!endCursor) return;

                const hasNextPage =
                  data?.user?.journalEntries.pageInfo.hasNextPage;

                if (!hasNextPage) return;

                return fetchMore({
                  variables: {
                    after: dateToString(new Date(stringToDate(endCursor))),
                    before: dateToString(
                      endOfDayButItRespectsDayStartHour(
                        addDays(stringToDate(endCursor), entryType ? 30 : 4),
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
                            hasNextPage: previousPageInfo
                              ? previousPageInfo.hasNextPage &&
                                fetchMorePageInfo.hasNextPage
                              : fetchMorePageInfo.hasNextPage,
                            hasPreviousPage: previousPageInfo
                              ? previousPageInfo.hasPreviousPage &&
                                fetchMorePageInfo.hasPreviousPage
                              : fetchMorePageInfo.hasPreviousPage,
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
      </TodoDragDropContainer>
    </>
  );
}
