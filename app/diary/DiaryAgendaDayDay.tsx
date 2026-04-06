import { useApolloClient } from "@apollo/client/react";
import { tz, TZDate } from "@date-fns/tz";
import { faCalendar as faCalendarRegular } from "@fortawesome/free-regular-svg-icons";
import { faExternalLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  addHours,
  differenceInDays,
  isBefore,
  isEqual,
  isPast,
  roundToNearestMinutes,
  type Interval,
} from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { FieldSetX } from "../../components/FieldSet";
import type {
  GQEvent,
  GQLocation,
  GQUser,
  GQWorkout,
} from "../../graphql.generated";
import { useNow } from "../../hooks";
import { useIsSSR } from "../../hooks/useIsSSR";
import { WorkoutSource } from "../../models/workout";
import {
  cotemporality,
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  emptyArray,
  endOfDayButItRespectsDayStartHour,
  isSameDayButItRespectsDayStartHour,
  roundToNearestDay,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import { DiaryAgendaDayCreateExpander } from "./DiaryAgendaDayCreateExpander";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayDueSet } from "./DiaryAgendaDayDueSet";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayEvent } from "./DiaryAgendaDayEvent";
import { DiaryAgendaDayEventEnd } from "./DiaryAgendaDayEventEnd";
import { DiaryAgendaDayLocationChange } from "./DiaryAgendaDayLocationChange";
import { DiaryAgendaDayNow } from "./DiaryAgendaDayNow";
import DiaryAgendaDaySleep from "./DiaryAgendaDaySleep";
import { DiaryAgendaDayTodo } from "./DiaryAgendaDayTodo";
import { DiaryAgendaDayWorkout } from "./DiaryAgendaDayWorkout";
import { TodoSortableContext } from "./TodoDroppable";
import { getJournalEntryPrincipalDate, type JournalEntry } from "./diaryUtils";

interface DayJournalEntryElement {
  id: string;
  element: ReactElement;
}

const getJournalEntryPassed = (journalEntry: JournalEntry, now: Date) => {
  const principalDate = getJournalEntryPrincipalDate(journalEntry);
  if (!principalDate) return false;
  return isBefore(principalDate.end, now);
};

export function DiaryAgendaDayDay({
  date,
  dayDate,
  userTimeZone,
  dayLocations,
  dayJournalEntries,
}: {
  date: `${number}-${number}-${number}`;
  dayDate: Date;
  userTimeZone?: GQUser["timeZone"];
  dayLocations: GQLocation[];
  dayJournalEntries: JournalEntry[];
}) {
  const isSSR = useIsSSR();
  const client = useApolloClient();
  const timeZone = userTimeZone || DEFAULT_TIMEZONE;
  const todayStr = useMemo(
    () =>
      dateToString(startOfDayButItRespectsDayStartHour(TZDate.tz(timeZone))),
    [timeZone],
  );
  const isToday = date === todayStr;
  const now = useNow(isToday ? 60 * 1000 : 60 * 60 * 1000);
  const ref = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    if (!isToday || isSSR) return;

    ref.current?.scrollIntoView({ behavior: "auto", block: "center" });
  }, [isToday, isSSR, dayJournalEntries.length]);

  const dayStart = useMemo(() => addHours(dayDate, dayStartHour), [dayDate]);
  const dayEnd = useMemo(
    () => endOfDayButItRespectsDayStartHour(dayStart),
    [dayStart],
  );
  const dayName = dateToString(dayDate);

  const [dayJournalItems, allDayJournalItems] = useMemo(() => {
    const dayJournalEntryElements: DayJournalEntryElement[] = [];
    const allDayJournalEntryElements: DayJournalEntryElement[] = [];

    let i = 0;
    const eventIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding: string[] =
      [];

    let pushedNow = false;
    const pushNow = (
      cotemporalityOfSurroundingEvent: "current" | "past" | "future" | null,
    ) => {
      dayJournalEntryElements.push({
        id: "now-divider",
        element: (
          <DiaryAgendaDayNow
            key="now-divider"
            date={date}
            now={now}
            cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
          />
        ),
      });
    };

    let ownWorkouts = dayJournalEntries
      .filter((jE): jE is GQWorkout => jE.__typename === "Workout")
      .filter((w) => w.source === WorkoutSource.Self);
    if (!ownWorkouts.length) ownWorkouts = emptyArray;

    for (const journalEntry of dayJournalEntries) {
      const principalDate = getJournalEntryPrincipalDate(journalEntry);
      const journalEntryCotemporality =
        principalDate &&
        !(
          journalEntry.__typename === "Event" &&
          journalEntry.datetype === "date"
        )
          ? cotemporality(principalDate as Interval<Date, Date>)
          : null;
      const precedingJournalEntry = dayJournalEntries[i - 1];
      const followingJournalEntry = dayJournalEntries[i + 1];

      const previousEvents = dayJournalEntries
        .slice(0, i)
        .filter((je): je is GQEvent => je.__typename === "Event");
      const followingEndOfEvents = dayJournalEntries
        .slice(i + 1)
        .filter(
          (je): je is GQEvent =>
            je.__typename === "Event" &&
            "_this_is_the_end_of_a_event" in je &&
            je._this_is_the_end_of_a_event,
        );

      let eventThatSurroundsEntry =
        previousEvents
          .filter(
            (prevEvent) =>
              prevEvent.datetype !== "date" &&
              !eventIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.includes(
                prevEvent.id,
              ),
          )
          .find((prevEvent) =>
            followingEndOfEvents.some(
              (endOfEvent) => prevEvent.id === endOfEvent.id,
            ),
          ) ||
        dayJournalEntries
          .filter(
            (je): je is GQEvent =>
              je.__typename === "Event" && je.datetype !== "date",
          )
          .find(
            (event) =>
              principalDate &&
              isBefore(event.start, new Date(principalDate.start)) &&
              isBefore(new Date(principalDate.end), event.end),
          ) || // Following end of event that doesn't have a surrounding start of event, which can happen if the event started on a previous day or if the start of the event was skipped because it was exactly at the same time as the end of the previous event
        followingEndOfEvents
          // followingEndOfEvent that has started(before today in this case) but doesn't have a surrounding start of event, which can happen if the event started on a previous day or if the start of the event was skipped because it was exactly at the same time as the end of the previous event)
          .find(
            (endOfEvent) =>
              principalDate && isBefore(endOfEvent.start, principalDate.start),
          );

      // ???
      if (followingJournalEntry === eventThatSurroundsEntry) {
        eventThatSurroundsEntry = undefined;
      }

      const cotemporalityOfSurroundingEvent = eventThatSurroundsEntry
        ? cotemporality(eventThatSurroundsEntry)
        : null;

      if (journalEntry.__typename === "Sleep") {
        const sleep = journalEntry;

        dayJournalEntryElements.push({
          id: client.cache.identify(sleep) || sleep.id,
          element: (
            <DiaryAgendaDaySleep
              sleep={sleep}
              userTimeZone={timeZone}
              principalDate={principalDate}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
              key={
                sleep.id +
                ("_this_is_the_end_of_a_sleep" in sleep ? "-end" : "")
              }
            />
          ),
        });
      } else if (journalEntry.__typename === "Event") {
        const event = journalEntry;

        const isAllDayEvent =
          differenceInDays(event.end, event.start) >= 0 &&
          event.datetype === "date";

        if (isAllDayEvent) {
          allDayJournalEntryElements.push({
            id: client.cache.identify(event) || event.id,
            element: (
              <DiaryAgendaDayEntry
                icon={faCalendarRegular}
                cotemporality={cotemporality(event)}
                key={event.id}
                cotemporalityOfSurroundingEvent={
                  cotemporalityOfSurroundingEvent
                }
                className={
                  "rounded-tl rounded-tr pr-0.5 pl-0.5 text-sm " +
                  (isPast(dayEnd)
                    ? "bg-green-50"
                    : isToday
                      ? "bg-yellow-50"
                      : "bg-slate-50")
                }
                iconClassName="w-6 -mr-1"
              >
                {(() => {
                  const eventStart =
                    event.datetype === "date"
                      ? roundToNearestDay(event.start, {
                          in: tz(DEFAULT_TIMEZONE),
                        })
                      : event.start;
                  const eventEnd =
                    event.datetype === "date"
                      ? roundToNearestDay(event.end, {
                          in: tz(DEFAULT_TIMEZONE),
                        })
                      : event.end;

                  const dayNo = differenceInDays(dayDate, eventStart) + 1;
                  const numDays = differenceInDays(eventEnd, eventStart);
                  const isFirstDay = dayNo === 1;
                  const isLastDay = dayNo === numDays;

                  return (
                    <span className="flex items-stretch leading-snug">
                      <div className="flex items-baseline gap-1 py-0.5">
                        {numDays > 1 ? (
                          isFirstDay && event.datetype === "date-time" ? (
                            <>
                              {eventStart.toLocaleTimeString("en-DK", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone,
                              })}
                              -
                            </>
                          ) : isLastDay && event.datetype === "date-time" ? (
                            <>
                              -
                              {eventEnd.toLocaleTimeString("en-DK", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone,
                              })}
                            </>
                          ) : null
                        ) : null}
                        <span>{event.summary}</span>
                        {numDays > 1 ? (
                          <span className="flex items-baseline text-[0.555rem] whitespace-nowrap tabular-nums opacity-50">
                            <span className="px-px text-[0.777rem]">
                              {dayNo}
                            </span>
                            <span>/</span>
                            <span className="px-px">{numDays}d</span>
                          </span>
                        ) : null}
                        {event.url ? (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.666rem] text-[#edab00] hover:text-[#edab00]/80"
                          >
                            <FontAwesomeIcon icon={faExternalLink} />
                          </a>
                        ) : null}{" "}
                      </div>
                    </span>
                  );
                })()}
              </DiaryAgendaDayEntry>
            ),
          });
        } else if (
          "_this_is_the_end_of_a_event" in event &&
          event._this_is_the_end_of_a_event
        ) {
          const followingEvent =
            followingJournalEntry &&
            followingJournalEntry.__typename === "Event"
              ? followingJournalEntry
              : null;

          const followingEventHasSeparateEndEvent =
            followingEvent &&
            dayJournalEntries
              .slice(i + 2)
              .some(
                (je): je is GQEvent =>
                  je.__typename === "Event" &&
                  "_this_is_the_end_of_a_event" in je &&
                  je._this_is_the_end_of_a_event &&
                  je.id === followingEvent.id,
              );

          if (
            followingEvent &&
            followingEventHasSeparateEndEvent &&
            roundToNearestMinutes(event.end).getTime() ===
              followingEvent.start.getTime()
          ) {
            eventIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.push(
              followingEvent.id,
            );
          } else {
            dayJournalEntryElements.push({
              id: "end-of-" + (client.cache.identify(event) || event.id),
              element: (
                <DiaryAgendaDayEventEnd
                  userTimeZone={timeZone}
                  event={event}
                  key={"end-of-" + (client.cache.identify(event) || event.id)}
                  cotemporalityOfSurroundingEvent={
                    cotemporalityOfSurroundingEvent
                  }
                />
              ),
            });
          }
        } else {
          const precedingEndOfEvent =
            precedingJournalEntry &&
            "_this_is_the_end_of_a_event" in precedingJournalEntry &&
            precedingJournalEntry._this_is_the_end_of_a_event
              ? precedingJournalEntry
              : null;

          const eventHasSeparateEndEvent = dayJournalEntries
            .slice(i + 1)
            .some(
              (je): je is GQEvent =>
                je.__typename === "Event" &&
                "_this_is_the_end_of_a_event" in je &&
                je._this_is_the_end_of_a_event &&
                je.id === event.id,
            );

          const startDay = startOfDayButItRespectsDayStartHour(event.start);
          const endDay = startOfDayButItRespectsDayStartHour(event.end);
          const days = differenceInDays(endDay, startDay) + 1;
          const dayNo = differenceInDays(dayStart, startDay) + 1;
          const isLastDay = dayNo === days;

          // If the preceding journal entry is the end of an event and it ends exactly when the current event starts, then we can treat them as a single continuous event instead of two separate events for the purpose of drawing the little bracket
          const isEventEnd =
            Boolean(
              eventHasSeparateEndEvent &&
              precedingEndOfEvent &&
              roundToNearestMinutes(precedingEndOfEvent.end).getTime() ===
                event.start.getTime(),
            ) ||
            (dayNo > 1 && days > 1 && isLastDay && !eventHasSeparateEndEvent);

          if (precedingEndOfEvent && isEventEnd) {
            eventIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.push(
              precedingEndOfEvent.id,
            );
          }

          dayJournalEntryElements.push({
            id: client.cache.identify(event) || event.id,
            element: (
              <DiaryAgendaDayEvent
                dayDate={dayDate}
                userTimeZone={timeZone}
                event={event}
                key={event.id}
                isEventEnd={isEventEnd}
                isEventWithSeparatedEnd={
                  (followingEndOfEvents.some(
                    (endOfEvent) => endOfEvent.id === event.id,
                  ) &&
                    isEqual(
                      startOfDayButItRespectsDayStartHour(dayStart),
                      startOfDayButItRespectsDayStartHour(event.start),
                    )) ||
                  (!isSameDayButItRespectsDayStartHour(
                    event.start,
                    event.end,
                  ) &&
                    isEqual(
                      startOfDayButItRespectsDayStartHour(dayStart),
                      startOfDayButItRespectsDayStartHour(event.start),
                    ))
                }
                cotemporalityOfSurroundingEvent={
                  cotemporalityOfSurroundingEvent ||
                  (dayNo > 1 && days > 1 && eventHasSeparateEndEvent
                    ? cotemporality(event)
                    : null)
                }
              />
            ),
          });
        }
      } else if (journalEntry.__typename === "Todo") {
        const todo = journalEntry;
        dayJournalEntryElements.push({
          id: client.cache.identify(todo) || todo.id,
          element: (
            <DiaryAgendaDayTodo
              todo={todo}
              key={todo.id}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
              now={now}
            />
          ),
        });
      } else if ("exerciseSchedule" in journalEntry) {
        const dueSet = journalEntry;

        dayJournalEntryElements.push({
          id: client.cache.identify(dueSet) || dueSet.id,
          element: (
            <DiaryAgendaDayDueSet
              key={dueSet.id}
              dueSet={dueSet}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
              exerciseInfo={dueSet.exerciseSchedule.exerciseInfo}
              workouts={ownWorkouts}
              locations={dayLocations}
            />
          ),
        });
      } else if (journalEntry.__typename === "Workout") {
        const workout = journalEntry;

        const workoutDateStr = dateToString(
          startOfDayButItRespectsDayStartHour(workout.workedOutAt),
        );

        dayJournalEntryElements.push({
          id: client.cache.identify(workout) || workout.id,
          element: (
            <DiaryAgendaDayWorkout
              key={workout.id}
              location={dayLocations.find(
                (loc) => loc.id === workout.locationId,
              )}
              workout={workout}
              workoutDateStr={workoutDateStr}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
            />
          ),
        });
      } else if (journalEntry.__typename === "LocationChange") {
        dayJournalEntryElements.push({
          id: "location-change-" + journalEntry.id,
          element: (
            <DiaryAgendaDayLocationChange
              key={"location-change-" + journalEntry.id}
              locationChange={journalEntry}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
            />
          ),
        });
      }

      if (
        !pushedNow &&
        isToday &&
        ((followingJournalEntry
          ? getJournalEntryPrincipalDate(followingJournalEntry)!.start >= now
          : getJournalEntryPrincipalDate(journalEntry)!.start >= now) ||
          !followingJournalEntry)
      ) {
        pushNow(
          cotemporalityOfSurroundingEvent ||
            (journalEntryCotemporality === "current" &&
              journalEntryCotemporality) ||
            null,
        );
        pushedNow = true;
      }

      i++;
    }

    return [dayJournalEntryElements, allDayJournalEntryElements] as const;
  }, [
    client.cache,
    date,
    dayDate,
    dayEnd,
    dayJournalEntries,
    dayLocations,
    dayStart,
    isToday,
    now,
    timeZone,
  ]);

  const allCompleted = dayJournalEntries.every((je) =>
    getJournalEntryPassed(je, now),
  );

  return (
    <>
      <div
        className="mx-auto mt-1 -mb-px flex max-w-lg items-center gap-1 pr-2 leading-normal"
        style={{
          textShadow:
            "0 0 1px rgba(255,255,255,1),0 0 2px rgba(255,255,255,1),0 0 3px rgba(255,255,255,1),0 0 4px rgba(255,255,255,1),0 0 5px rgba(255,255,255,1),0 0 6px rgba(255,255,255,1)",
        }}
      >
        <Link
          href="/calendar"
          prefetch={false}
          className={
            "w-8 text-right font-mono text-xs tracking-[-1px] text-gray-900/70 tabular-nums"
          }
        >
          {new TZDate(dayName, timeZone).toLocaleDateString("da-DK", {
            month: "numeric",
            day: "numeric",
          })}
        </Link>
        <b>
          {isToday
            ? "Today"
            : new TZDate(dayName, timeZone).toLocaleDateString("en-DK", {
                weekday: "long",
              })}
        </b>
        {todayStr === dayName ? null : (
          <DiaryAgendaDayCreateExpander
            inactiveButtonClassName={
              isPast(dayEnd) ? "bg-green-200" : "bg-yellow-200"
            }
          >
            <DiaryAgendaDayCreateTodo date={dayStart} />
            {isPast(dayStart) ? (
              <>
                <Link
                  prefetch={false}
                  href={`/diary/${date}/workout`}
                  className={
                    "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold shadow-md shadow-black/30"
                  }
                >
                  <span className="text-xs opacity-25">➕</span> Workout
                </Link>
              </>
            ) : null}
            <span
              hidden
              className={
                "cursor-not-allowed rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-sm font-semibold text-black/25 shadow-md shadow-black/30"
              }
            >
              <span className="text-xs">➕</span> Event
            </span>
          </DiaryAgendaDayCreateExpander>
        )}
        <div className="w-2" />
        {allDayJournalItems.map(({ element }) => element)}
      </div>
      <FieldSetX
        legend={null}
        ref={ref}
        className={
          "mx-auto mb-1 flex max-w-lg flex-0! flex-col items-stretch gap-1.5 pr-1 pb-1 pl-0 " +
          ((isPast(dayStart) && allCompleted) || isPast(dayEnd)
            ? "bg-green-50 pt-1"
            : todayStr === dayName
              ? "bg-yellow-50 pt-1"
              : "bg-slate-50 pt-1")
        }
      >
        {dayJournalItems.length ? (
          <TodoSortableContext items={dayJournalItems}>
            {dayJournalItems.map(({ element }) => element)}
          </TodoSortableContext>
        ) : (
          <DiaryAgendaDayEntry className="text-gray-400/50 italic">
            {isPast(dayEnd) ? "Nothing logged" : "Nothing planned"}
          </DiaryAgendaDayEntry>
        )}
      </FieldSetX>
    </>
  );
}
