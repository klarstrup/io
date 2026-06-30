import { useApolloClient } from "@apollo/client/react";
import { TZDate } from "@date-fns/tz";
import { faCalendar as faCalendarRegular } from "@fortawesome/free-regular-svg-icons";
import { faExternalLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  differenceInDays,
  differenceInHours,
  isBefore,
  isEqual,
  isPast,
  roundToNearestMinutes,
} from "date-fns";
import Link from "next/link";
import { useMemo, useRef, type ReactElement } from "react";
import { FieldSetX } from "../../components/FieldSet";
import type {
  GQEvent,
  GQLocation,
  GQUser,
  GQWorkout,
} from "../../graphql.generated/graphql";
import { WorkoutSource } from "../../models/workout";
import {
  cotemporality,
  dateToString,
  DEFAULT_TIMEZONE,
  emptyArray,
  isSameDayButItRespectsDayStartHour,
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
import {
  getJournalEntryPrincipalDate,
  isEventEntireDay,
  type JournalEntry,
} from "./diaryUtils";

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
  now,
  date,
  dayRange,
  userTimeZone,
  dayLocations,
  dayJournalEntries,
}: {
  now: Date;
  date: `${number}-${number}-${number}`;
  dayRange: { start: Date; end: Date };
  userTimeZone?: GQUser["timeZone"];
  dayLocations: GQLocation[];
  dayJournalEntries: JournalEntry[];
}) {
  const client = useApolloClient();
  const timeZone = userTimeZone || DEFAULT_TIMEZONE;
  const todayStr = useMemo(
    () => dateToString(startOfDayButItRespectsDayStartHour(now)),
    [now],
  );
  const isToday = date === todayStr;
  const ref = useRef<HTMLFieldSetElement>(null);

  const dayName = dateToString(dayRange.start);

  const allCompleted = dayJournalEntries.every((je) =>
    getJournalEntryPassed(je, now),
  );

  const [dayJournalItems, allDayJournalItems] = useMemo(() => {
    const dayJournalEntryElements: DayJournalEntryElement[] = [];
    const allDayJournalEntryElements: DayJournalEntryElement[] = [];

    let i = 0;
    const eventIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding: string[] =
      [];

    let ownWorkouts = dayJournalEntries
      .filter((jE): jE is GQWorkout => jE.__typename === "Workout")
      .filter((w) => w.source === WorkoutSource.Self);
    if (!ownWorkouts.length) ownWorkouts = emptyArray;

    for (const journalEntry of dayJournalEntries) {
      const principalDate = getJournalEntryPrincipalDate(journalEntry);

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

      const eventThatSurroundsEntry =
        previousEvents
          .filter(
            (prevEvent) =>
              prevEvent.datetype !== "date" &&
              !isEventEntireDay(prevEvent, dayRange.start) &&
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
              je.__typename === "Event" &&
              je.datetype !== "date" &&
              !isEventEntireDay(je, dayRange.start),
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

      const cotemporalityOfSurroundingEvent = eventThatSurroundsEntry
        ? cotemporality(eventThatSurroundsEntry)
        : null;

      if (journalEntry.__typename === "NowDivider") {
        dayJournalEntryElements.push({
          id: "now-divider",
          element: (
            <DiaryAgendaDayNow
              key="now-divider"
              date={date}
              now={journalEntry.start}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
            />
          ),
        });
      } else if (journalEntry.__typename === "Sleep") {
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

        const eventIsMoreThan24HoursAndWereOnADayInTheMiddleOfIt =
          isEventEntireDay(event, dayRange.start);

        const isAllDayEvent =
          event.datetype === "date" ||
          eventIsMoreThan24HoursAndWereOnADayInTheMiddleOfIt;

        if (isAllDayEvent) {
          allDayJournalEntryElements.push({
            id: client.cache.identify(event) || event.id,
            element: (
              <DiaryAgendaDayEntry
                icon={faCalendarRegular}
                cotemporality={cotemporality(event)}
                key={event.id}
                id={event.id}
                __typename={event.__typename}
                cotemporalityOfSurroundingEvent={
                  cotemporalityOfSurroundingEvent
                }
                className={
                  "self-end rounded-tl rounded-tr pr-0.5 pl-0.5 text-sm " +
                  "backdrop-blur-sm " +
                  ((isPast(dayRange.start) && allCompleted) ||
                  isPast(dayRange.end)
                    ? "bg-green-100/75 pt-1"
                    : isToday
                      ? "bg-yellow-200/75 pt-1"
                      : "bg-slate-100/75 pt-1")
                }
                iconClassName="w-6 -mr-1"
              >
                {(() => {
                  const dayNo =
                    Math.floor(
                      differenceInHours(dayRange.start, event.start) / 24,
                    ) + 1;
                  const numDays = Math.ceil(
                    differenceInHours(event.end, event.start) / 24,
                  );
                  const isFirstDay = dayNo === 1;
                  const isLastDay = dayNo === numDays;

                  return (
                    <span className="flex items-stretch leading-snug">
                      <div className="flex items-baseline gap-1 py-0.5">
                        {numDays > 1 ? (
                          isFirstDay && event.datetype === "date-time" ? (
                            <>
                              {event.start.toLocaleTimeString("en-DK", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone,
                              })}
                              -
                            </>
                          ) : isLastDay && event.datetype === "date-time" ? (
                            <>
                              -
                              {event.end.toLocaleTimeString("en-DK", {
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
          const dayNo = differenceInDays(dayRange.start, startDay);
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
                dayRange={dayRange}
                userTimeZone={timeZone}
                event={event}
                key={event.id}
                isEventEnd={isEventEnd}
                isEventWithSeparatedEnd={
                  (followingEndOfEvents.some(
                    (endOfEvent) => endOfEvent.id === event.id,
                  ) &&
                    isEqual(
                      startOfDayButItRespectsDayStartHour(dayRange.start),
                      startOfDayButItRespectsDayStartHour(event.start),
                    )) ||
                  (!isSameDayButItRespectsDayStartHour(
                    event.start,
                    event.end,
                  ) &&
                    isEqual(
                      startOfDayButItRespectsDayStartHour(dayRange.start),
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
          id: journalEntry.id,
          element: (
            <DiaryAgendaDayLocationChange
              key={journalEntry.id}
              locationChange={journalEntry}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
            />
          ),
        });
      }

      i++;
    }

    return [dayJournalEntryElements, allDayJournalEntryElements] as const;
  }, [
    allCompleted,
    client.cache,
    date,
    dayJournalEntries,
    dayLocations,
    dayRange,
    isToday,
    now,
    timeZone,
  ]);

  return (
    <>
      <div
        className="relative z-5 mx-auto mt-1 -mb-px flex max-w-lg items-center gap-1 pr-2 leading-normal xl:max-w-none"
        style={{
          textShadow:
            "0 0 1px rgba(255,255,255,0.5),0 0 2px rgba(255,255,255,0.5),0 0 3px rgba(255,255,255,0.5),0 0 4px rgba(255,255,255,0.5),0 0 5px rgba(255,255,255,0.5),0 0 6px rgba(255,255,255,0.5)",
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
              isPast(dayRange.end) ? "bg-green-200" : "bg-yellow-200"
            }
          >
            <DiaryAgendaDayCreateTodo date={dayRange.start} />
            {isPast(dayRange.start) ? (
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
          "diary-agenda-day-entry border border-[yellow]/25 bg-white/10 backdrop-blur-sm " +
          "mx-auto mb-1 flex max-w-lg flex-0! flex-col items-stretch gap-1.5 pr-1 pb-1 pl-0 xl:max-w-none " +
          ((isPast(dayRange.start) && allCompleted) || isPast(dayRange.end)
            ? "bg-green-100/75 pt-1"
            : isToday
              ? "bg-yellow-200/75 pt-1"
              : "bg-slate-100/75 pt-1")
        }

        style={{
          boxShadow:
            "0 0 16px #edab00, 0 0 8px #edab00, 0 0 4px #edab00, 0 0 4px #edab00, 0 0 20vmax rgba(0, 0, 0, 0.5), 0 0 1px rgba(0, 0, 0, 1)",
        }}
      >
        {dayJournalItems.length ? (
          <TodoSortableContext items={dayJournalItems}>
            {dayJournalItems.map(({ element }) => element)}
          </TodoSortableContext>
        ) : (
          <DiaryAgendaDayEntry className="text-gray-400/50 italic">
            {isPast(dayRange.end) ? "Nothing logged" : "Nothing planned"}
          </DiaryAgendaDayEntry>
        )}
      </FieldSetX>
    </>
  );
}
