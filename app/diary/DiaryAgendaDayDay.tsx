import { useApolloClient } from "@apollo/client/react";
import { tz, TZDate } from "@date-fns/tz";
import { faCalendar as faCalendarRegular } from "@fortawesome/free-regular-svg-icons";
import { faBed, faBedPulse } from "@fortawesome/free-solid-svg-icons";
import {
  addHours,
  differenceInDays,
  endOfDay,
  intervalToDuration,
  isBefore,
  isEqual,
  isPast,
  roundToNearestMinutes,
  startOfDay,
  subHours,
  type Interval,
} from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { useEffect, useRef, type ReactElement } from "react";
import { FieldSetX } from "../../components/FieldSet";
import type {
  Event,
  Location,
  Workout,
  WorkoutSet,
} from "../../graphql.generated";
import { formatShortDuration, WorkoutSource } from "../../models/workout";
import {
  cotemporality,
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
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
import { DiaryAgendaDayTodo } from "./DiaryAgendaDayTodo";
import { DiaryAgendaDayWorkoutSet } from "./DiaryAgendaDayWorkoutSet";
import { TodoSortableContext } from "./TodoDroppable";
import { getJournalEntryPrincipalDate, type JournalEntry } from "./diaryUtils";

export function DiaryAgendaDayDay({
  date,
  dayDate,
  user,
  dayLocations,
  dayJournalEntries,
}: {
  date: `${number}-${number}-${number}`;
  dayDate: Date;
  user?: Session["user"];
  dayLocations: Location[];
  dayJournalEntries: JournalEntry[];
}) {
  const client = useApolloClient();
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const todayStr = dateToString(subHours(now, dayStartHour));
  const isToday = date === todayStr;
  const ref = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    if (isToday) {
      ref.current?.scrollIntoView({ behavior: "auto", block: "center" });
    }
  }, [isToday]);

  const dayStart = addHours(startOfDay(dayDate), dayStartHour);
  const dayEnd = addHours(endOfDay(dayDate), dayStartHour);
  const dayName = dateToString(dayDate);

  const dayJournalEntryElements: { id: string; element: ReactElement }[] = [];

  let i = 0;
  const getJournalEntryPassed = (
    journalEntry: (typeof dayJournalEntries)[number],
  ) => {
    const principalDate = getJournalEntryPrincipalDate(journalEntry);
    if (!principalDate) return false;
    return isBefore(principalDate.end, now);
  };
  const eventIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding: string[] =
    [];
  for (const journalEntry of dayJournalEntries) {
    const principalDate = getJournalEntryPrincipalDate(journalEntry);

    const precedingJournalEntry = dayJournalEntries[i - 1];
    const followingJournalEntry = dayJournalEntries[i + 1];

    const isLastEntry = !followingJournalEntry;

    const previousEvents = dayJournalEntries
      .slice(0, i)
      .filter((je): je is Event => je.__typename === "Event");
    const followingEndOfEvents = dayJournalEntries
      .slice(i + 1)
      .filter(
        (je): je is Event =>
          je.__typename === "Event" &&
          "_this_is_the_end_of_a_event" in je &&
          je._this_is_the_end_of_a_event,
      );

    const eventThatSurroundsEntry =
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
          (je): je is Event =>
            je.__typename === "Event" && je.datetype !== "date",
        )
        .find(
          (event) =>
            principalDate &&
            isBefore(event.start, new Date(principalDate.start)) &&
            isBefore(new Date(principalDate.end), event.end),
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
            cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
          />
        ),
      });
    } else if (journalEntry.__typename === "Sleep") {
      const sleep = journalEntry;

      const duration = intervalToDuration({
        start: 0,
        end: journalEntry.totalSleepTime * 1000,
      });

      dayJournalEntryElements.push({
        id: client.cache.identify(sleep) || sleep.id,
        element: (
          <DiaryAgendaDayEntry
            // TODO: smarter way of determining if it's waking up or going to sleep
            icon={isLastEntry ? faBed : faBedPulse}
            cotemporality={cotemporality(principalDate as Interval<Date, Date>)}
            cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
            key={sleep.id}
          >
            <div className="flex items-center gap-1.5 leading-snug">
              <div className="text-center font-semibold tabular-nums">
                {!isLastEntry
                  ? new Date(sleep.endedAt).toLocaleTimeString("en-DK", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone,
                    })
                  : new Date(sleep.startedAt).toLocaleTimeString("en-DK", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone,
                    })}
              </div>{" "}
              <div className="flex items-baseline gap-2">
                {isLastEntry ? (
                  <span>Went to bed</span>
                ) : (
                  <span>Got out of bed</span>
                )}
                {!isLastEntry ? (
                  <span className="text-[0.666rem] whitespace-nowrap tabular-nums opacity-50">
                    {duration ? (
                      <>{formatShortDuration(duration)} slept</>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>
          </DiaryAgendaDayEntry>
        ),
      });
    } else if (journalEntry.__typename === "Event") {
      const event = journalEntry;

      const isAllDayEvent =
        differenceInDays(event.end, event.start) >= 0 &&
        event.datetype === "date";

      if (isAllDayEvent) {
        dayJournalEntryElements.push({
          id: client.cache.identify(event) || event.id,
          element: (
            <DiaryAgendaDayEntry
              icon={faCalendarRegular}
              cotemporality={cotemporality(event)}
              key={event.id}
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
                    ? roundToNearestDay(event.end, { in: tz(DEFAULT_TIMEZONE) })
                    : event.end;

                const dayNo = differenceInDays(dayDate, eventStart) + 1;
                const numDays = differenceInDays(eventEnd, eventStart);
                const isFirstDay = dayNo === 1;
                const isLastDay = dayNo === numDays;

                return (
                  <span className="inline-flex items-stretch leading-snug">
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
                      <span className="flex items-baseline text-[0.555rem] whitespace-nowrap tabular-nums opacity-50">
                        {numDays > 1 ? (
                          <>
                            <span className="px-px text-[0.888rem]">
                              {dayNo}
                            </span>
                            <span>/</span>
                          </>
                        ) : null}
                        <span className="px-px">{numDays}d</span>
                      </span>
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
          followingJournalEntry && followingJournalEntry.__typename === "Event"
            ? followingJournalEntry
            : null;

        const followingEventHasSeparateEndEvent =
          followingEvent &&
          dayJournalEntries
            .slice(i + 2)
            .some(
              (je): je is Event =>
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
                user={user}
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
            (je): je is Event =>
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
              user={user}
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
                (!isSameDayButItRespectsDayStartHour(event.start, event.end) &&
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
            user={user!}
            dueSet={dueSet}
            date={dayDate}
            cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
            exerciseInfo={dueSet.exerciseSchedule.exerciseInfo}
            workouts={dayJournalEntries
              .filter((jE): jE is Workout => jE.__typename === "Workout")
              .filter((w) => w.source === WorkoutSource.Self)
              .map((d) => ({ ...d, _id: d.id.toString() }))}
            locations={dayLocations}
          />
        ),
      });
    } else if (journalEntry.__typename === "Workout") {
      const workout = journalEntry;

      const mostRecentWorkout = workout;
      const workoutDateStr =
        mostRecentWorkout && dateToString(mostRecentWorkout.workedOutAt);

      for (const workoutExercise of workout.exercises) {
        const { exerciseInfo } = workoutExercise;

        const setsWithLocation = workoutExercise.sets.map((set) => {
          const setLocationId = workout.locationId;
          const location = dayLocations.find((loc) => loc.id === setLocationId);
          return [
            {
              ...set,
              meta: (set.meta?.reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
              }, {}) || {}) as WorkoutSet["meta"],
            },
            location,
            workout,
          ] as const;
        });
        dayJournalEntryElements.push({
          id:
            (client.cache.identify(workout) || workout.id) +
            "-" +
            String(workoutExercise.exerciseId),
          element: (
            <DiaryAgendaDayWorkoutSet
              workout={workout}
              workoutExercise={workoutExercise}
              exerciseInfo={exerciseInfo}
              setsWithLocation={setsWithLocation}
              mostRecentWorkout={mostRecentWorkout}
              workoutDateStr={workoutDateStr}
              key={
                (client.cache.identify(workout) || workout.id) +
                "-" +
                String(workoutExercise.exerciseId)
              }
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
            />
          ),
        });
      }
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

    i++;
  }

  const allCompleted = dayJournalEntries.every((je) =>
    getJournalEntryPassed(je),
  );

  return (
    <FieldSetX
      ref={ref}
      legend={
        <div className="-ml-1 flex items-center gap-1 leading-normal">
          <span
            className={
              "w-8 text-right font-mono text-xs tracking-[-1px] text-gray-900/70 tabular-nums text-shadow-md text-shadow-white"
            }
          >
            {new TZDate(dayName, timeZone).toLocaleDateString("da-DK", {
              month: "numeric",
              day: "numeric",
            })}
          </span>
          <b className="text-shadow-md text-shadow-white">
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
              <DiaryAgendaDayCreateTodo date={dayStart} />
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
        </div>
      }
      className={
        "mx-auto mb-1 flex max-w-lg flex-0! flex-col items-stretch gap-1.5 pr-1 pb-2 pl-0 " +
        ((isPast(dayStart) && allCompleted) || isPast(dayEnd)
          ? "bg-green-50 pt-1"
          : todayStr === dayName
            ? "bg-yellow-50 pt-1"
            : "bg-slate-50 pt-1")
      }
    >
      {dayJournalEntryElements.length ? (
        <TodoSortableContext items={dayJournalEntryElements}>
          {dayJournalEntryElements.map(({ element }) => element)}
        </TodoSortableContext>
      ) : (
        <DiaryAgendaDayEntry className="text-gray-400/50 italic">
          {isPast(dayEnd) ? "Nothing logged" : "Nothing planned"}
        </DiaryAgendaDayEntry>
      )}
    </FieldSetX>
  );
}
