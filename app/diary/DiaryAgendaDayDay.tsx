import { useApolloClient } from "@apollo/client/react";
import { TZDate } from "@date-fns/tz";
import { faCalendar as faCalendarRegular } from "@fortawesome/free-regular-svg-icons";
import {
  faBoxesPacking,
  faExternalLink,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  differenceInDays,
  differenceInHours,
  isBefore,
  isDate,
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
import DiaryAgendaDayDayBacklog from "./DiaryAgendaDayDayBacklog";
import { DiaryAgendaDayDueSet } from "./DiaryAgendaDayDueSet";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayEvent } from "./DiaryAgendaDayEvent";
import { DiaryAgendaDayEventEnd } from "./DiaryAgendaDayEventEnd";
import { DiaryAgendaDayLocationChange } from "./DiaryAgendaDayLocationChange";
import { DiaryAgendaDayMeal } from "./DiaryAgendaDayMeal";
import { DiaryAgendaDayNow } from "./DiaryAgendaDayNow";
import DiaryAgendaDaySleep from "./DiaryAgendaDaySleep";
import { DiaryAgendaDayTodo } from "./DiaryAgendaDayTodo";
import { DiaryAgendaDayTrip } from "./DiaryAgendaDayTrip";
import { DiaryAgendaDayWorkout } from "./DiaryAgendaDayWorkout";
import { TodoSortableContext } from "./TodoDroppable";
import {
  getJournalEntryPrincipalDate,
  isEventEntireDay,
  isSeparatedEnd,
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
  isSelectedDay,
  isLoadingEntries,
}: {
  now: Date;
  date: `${number}-${number}-${number}`;
  dayRange: { start: Date; end: Date };
  userTimeZone?: GQUser["timeZone"];
  dayLocations: GQLocation[];
  dayJournalEntries: JournalEntry[];
  isSelectedDay?: boolean;
  isLoadingEntries?: boolean;
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
    const entryIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding: string[] =
      [];

    let ownWorkouts = dayJournalEntries
      .filter((jE): jE is GQWorkout => jE.__typename === "Workout")
      .filter((w) => w.source === WorkoutSource.Self);
    if (!ownWorkouts.length) ownWorkouts = emptyArray;

    for (const journalEntry of dayJournalEntries) {
      const principalDate = getJournalEntryPrincipalDate(journalEntry);

      const precedingJournalEntry = dayJournalEntries[i - 1];
      const followingJournalEntry = dayJournalEntries[i + 1];

      const previousEntries = dayJournalEntries.slice(0, i);
      const followingEndOfEntries = dayJournalEntries
        .slice(i + 1)
        .filter((je) => isSeparatedEnd(je));

      const entryThatSurroundsEntry =
        previousEntries
          .filter(
            (prevJE) =>
              (prevJE.__typename === "Event"
                ? prevJE.datetype !== "date" &&
                  !isEventEntireDay(prevJE, dayRange.start)
                : true) &&
              !entryIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.includes(
                prevJE.id,
              ),
          )
          .find((prevJE) =>
            followingEndOfEntries.some((endOfJE) => prevJE.id === endOfJE.id),
          ) ||
        dayJournalEntries
          .filter((je) =>
            je.__typename === "Event"
              ? je.datetype !== "date" && !isEventEntireDay(je, dayRange.start)
              : true,
          )
          .find((je) => {
            const jePrincipalDate = getJournalEntryPrincipalDate(je);
            return (
              principalDate &&
              jePrincipalDate &&
              isBefore(jePrincipalDate.start, new Date(principalDate.start)) &&
              isBefore(new Date(principalDate.end), jePrincipalDate.end)
            );
          }) || // Following end of event that doesn't have a surrounding start of event, which can happen if the event started on a previous day or if the start of the event was skipped because it was exactly at the same time as the end of the previous event
        followingEndOfEntries
          // followingEndOfEvent that has started(before today in this case) but doesn't have a surrounding start of event, which can happen if the event started on a previous day or if the start of the event was skipped because it was exactly at the same time as the end of the previous event)
          .find((endOfJE) => {
            const endPrincipalDate = getJournalEntryPrincipalDate({
              ...endOfJE,
              _is_separated_end: undefined,
            } as JournalEntry);
            return (
              principalDate &&
              endPrincipalDate &&
              isBefore(endPrincipalDate.start, principalDate.start)
            );
          });

      const surroundingPrincipalDate = entryThatSurroundsEntry
        ? getJournalEntryPrincipalDate(entryThatSurroundsEntry)
        : null;
      const cotemporalityOfSurroundingEntry = surroundingPrincipalDate
        ? cotemporality(surroundingPrincipalDate)
        : null;

      if (journalEntry.__typename === "NowDivider") {
        dayJournalEntryElements.push({
          id: "now-divider",
          element: (
            <DiaryAgendaDayNow
              key="now-divider"
              date={date}
              now={journalEntry.start}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
            />
          ),
        });
      } else if (journalEntry.__typename === "Sleep") {
        const sleep = journalEntry;

        dayJournalEntryElements.push({
          id:
            (isSeparatedEnd(sleep) ? "end-of-" : "") +
            (client.cache.identify(sleep) || sleep.id),
          element: (
            <DiaryAgendaDaySleep
              sleep={sleep}
              userTimeZone={timeZone}
              principalDate={principalDate}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              hasSeparatedEnd={!isSeparatedEnd(sleep)}
              key={sleep.id + (isSeparatedEnd(sleep) ? "-end" : "")}
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
                key={event.id}
                date={getJournalEntryPrincipalDate(event)!.start}
                entry={event}
                icon={faCalendarRegular}
                cotemporality={cotemporality(event)}
                className={
                  "relative z-5 self-end rounded-tl rounded-tr pr-0.5 pl-0.5 text-sm " +
                  "backdrop-blur-sm " +
                  (isSelectedDay
                    ? "bg-white/90"
                    : (isPast(dayRange.start) && allCompleted) ||
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
        } else if (isSeparatedEnd(event)) {
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
                  isSeparatedEnd(je) &&
                  je.id === followingEvent.id,
              );

          if (
            followingEvent &&
            followingEventHasSeparateEndEvent &&
            roundToNearestMinutes(event.end).getTime() ===
              (isDate(followingEvent.start)
                ? followingEvent.start
                : new Date(followingEvent.start)
              ).getTime()
          ) {
            entryIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.push(
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
                    cotemporalityOfSurroundingEntry
                  }
                />
              ),
            });
          }
        } else {
          const precedingEndOfEvent =
            precedingJournalEntry &&
            precedingJournalEntry.__typename === "Event" &&
            isSeparatedEnd(precedingJournalEntry)
              ? precedingJournalEntry
              : null;

          const eventHasSeparateEndEntry = dayJournalEntries
            .slice(i + 1)
            .some(
              (je): je is GQEvent => isSeparatedEnd(je) && je.id === event.id,
            );

          const startDay = startOfDayButItRespectsDayStartHour(event.start);
          const endDay = startOfDayButItRespectsDayStartHour(event.end);
          const days = differenceInDays(endDay, startDay) + 1;
          const dayNo = differenceInDays(dayRange.start, startDay);
          const isLastDay = dayNo === days;

          // If the preceding journal entry is the end of an event and it ends exactly when the current event starts, then we can treat them as a single continuous event instead of two separate events for the purpose of drawing the little bracket
          const isEventEnd =
            Boolean(
              eventHasSeparateEndEntry &&
              precedingEndOfEvent &&
              roundToNearestMinutes(precedingEndOfEvent.end).getTime() ===
                (isDate(event.start)
                  ? event.start
                  : new Date(event.start)
                ).getTime(),
            ) ||
            (dayNo > 1 && days > 1 && isLastDay && !eventHasSeparateEndEntry);

          if (precedingEndOfEvent && isEventEnd) {
            entryIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.push(
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
                  (followingEndOfEntries.some(
                    (endOfEntry) => endOfEntry.id === event.id,
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
                  cotemporalityOfSurroundingEntry ||
                  (dayNo > 1 && days > 1 && eventHasSeparateEndEntry
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
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
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
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
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
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
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
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
            />
          ),
        });
      } else if (journalEntry.__typename === "Trip") {
        const trip = journalEntry;

        dayJournalEntryElements.push({
          id: client.cache.identify(trip) || trip.id,
          element: (
            <DiaryAgendaDayTrip
              key={trip.id}
              trip={trip}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
            />
          ),
        });
      } else if (journalEntry.__typename === "Meal") {
        const meal = journalEntry;

        dayJournalEntryElements.push({
          id: client.cache.identify(meal) || meal.id,
          element: (
            <DiaryAgendaDayMeal
              key={meal.id}
              meal={meal}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
            />
          ),
        });
      } else if (journalEntry.__typename === "Delivery") {
        const delivery = journalEntry;

        dayJournalEntryElements.push({
          id: client.cache.identify(delivery) || delivery.id,
          element: (
            <DiaryAgendaDayEntry
              date={getJournalEntryPrincipalDate(delivery)!.start}
              entry={delivery}
              icon={faBoxesPacking}
              cotemporality={cotemporality({
                start: delivery.timestamp,
                end: delivery.timestamp,
              })}
              key={delivery.id}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              className={"pr-0.5 pl-0.5 text-xs"}
              iconClassName="w-10 text-[0.666rem]"
            >
              <span className="flex items-stretch leading-snug">
                <div className="flex items-baseline gap-1 py-0.5">
                  <span>{delivery.status}</span>
                  {delivery.from ? (
                    <span className="text-[0.666rem] opacity-50">
                      from {delivery.from}
                    </span>
                  ) : null}
                  {delivery.url ? (
                    <a
                      href={delivery.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.666rem] text-[#edab00] hover:text-[#edab00]/80"
                    >
                      <FontAwesomeIcon icon={faExternalLink} />
                    </a>
                  ) : null}{" "}
                </div>
              </span>
            </DiaryAgendaDayEntry>
          ),
        });
      } else {
        journalEntry satisfies never;
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
    isSelectedDay,
    isToday,
    now,
    timeZone,
  ]);

  return (
    <>
      <div
        className={
          "relative z-5 mx-auto mt-1 -mb-px flex w-full max-w-lg items-center gap-1 pr-2 leading-normal transition-colors xl:max-w-none" +
          (isLoadingEntries ? " animate-pulse bg-blue-300!" : "")
        }
        style={{
          textShadow:
            "0 0 1px rgba(255,255,255,0.5),0 0 2px rgba(255,255,255,0.5),0 0 3px rgba(255,255,255,0.5),0 0 4px rgba(255,255,255,0.5),0 0 5px rgba(255,255,255,0.5),0 0 6px rgba(255,255,255,0.5)",
        }}
      >
        <Link
          href="/calendar"
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
          "diary-agenda-day-entry z-4 w-full border border-[yellow]/25 bg-white/10 backdrop-blur-sm " +
          "mx-auto mb-1 flex max-w-lg flex-0! flex-col items-stretch gap-1 pr-1 pb-1 pl-0 transition-colors xl:max-w-none " +
          (isSelectedDay
            ? "bg-white/90"
            : (isPast(dayRange.start) && allCompleted) || isPast(dayRange.end)
              ? "bg-green-100/75 pt-1"
              : isToday
                ? "bg-yellow-200/75 pt-1"
                : "bg-slate-100/75 pt-1") +
          (isLoadingEntries ? " animate-pulse bg-blue-300!" : "")
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
          <div className={"pl-10 text-gray-400/50 italic"}>
            {isLoadingEntries
              ? "Loading..."
              : isPast(dayRange.end)
                ? "Nothing logged"
                : "Nothing planned"}
          </div>
        )}
      </FieldSetX>
      {isToday ? <DiaryAgendaDayDayBacklog dayRange={dayRange} /> : null}
    </>
  );
}
