import { useApolloClient } from "@apollo/client/react";
import { tz, TZDate } from "@date-fns/tz";
import { faCalendarWeek } from "@fortawesome/free-solid-svg-icons";
import {
  addHours,
  differenceInDays,
  endOfDay,
  isBefore,
  isPast,
  isSameDay,
  roundToNearestMinutes,
  startOfDay,
  subHours,
} from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import type { ReactElement } from "react";
import { FieldSetX } from "../../components/FieldSet";
import type {
  Event,
  Location,
  Workout,
  WorkoutSet,
} from "../../graphql.generated";
import { WorkoutSource } from "../../models/workout";
import { DataSource } from "../../sources/utils";
import {
  cotemporality,
  dateToString,
  dayStartHour,
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
  roundToNearestDay,
} from "../../utils";
import { DiaryAgendaDayCreateExpander } from "./DiaryAgendaDayCreateExpander";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayDueSet } from "./DiaryAgendaDayDueSet";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayEvent } from "./DiaryAgendaDayEvent";
import { DiaryAgendaDayEventEnd } from "./DiaryAgendaDayEventEnd";
import { DiaryAgendaDayNow } from "./DiaryAgendaDayNow";
import { DiaryAgendaDayTodo } from "./DiaryAgendaDayTodo";
import { DiaryAgendaDayWorkoutSet } from "./DiaryAgendaDayWorkoutSet";
import { TodoSortableContext } from "./TodoDroppable";
import { getJournalEntryPrincipalDate, JournalEntry } from "./diaryUtils";

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

  const tzDate = new TZDate(date, timeZone);

  const userGeohash = user?.dataSources?.find(
    (source) => source.source === DataSource.Tomorrow,
  )?.config?.geohash;
  const userLocation = userGeohash ? decodeGeohash(userGeohash) : null;
  const sunrise = getSunrise(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    tzDate,
  );
  const sunset = getSunset(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    tzDate,
  );

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
    const precedingJournalEntry = dayJournalEntries[i - 1];
    const followingJournalEntry = dayJournalEntries[i + 1];

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

    const surroundingEvent = previousEvents
      .filter(
        (prevEvent) =>
          !eventIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.includes(
            prevEvent.id,
          ),
      )
      .find((prevEvent) =>
        followingEndOfEvents.some(
          (endOfEvent) => prevEvent.id === endOfEvent.id,
        ),
      );

    const cotemporalityOfSurroundingEvent = surroundingEvent
      ? cotemporality(surroundingEvent)
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
              icon={faCalendarWeek}
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
                  <span className="inline-flex items-stretch overflow-hidden rounded-md border border-solid border-black/20 bg-white leading-snug">
                    {numDays > 1 ? (
                      <div className="flex h-full flex-col items-center justify-center self-stretch bg-black/60 px-px text-xs leading-none opacity-40">
                        <span className="px-px text-white">{dayNo}</span>
                        <hr className="w-full border-t-[0.5px] border-solid border-white opacity-40" />
                        <span className="px-px text-white">{numDays}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1 px-1.5 py-0.5">
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
                      {event.location ? (
                        <span className="text-[0.666rem] italic">
                          {event.location}
                        </span>
                      ) : null}
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

        // If the preceding journal entry is the end of an event and it ends exactly when the current event starts, then we can treat them as a single continuous event instead of two separate events for the purpose of drawing the little bracket
        const isEventEnd = Boolean(
          eventHasSeparateEndEvent &&
          precedingEndOfEvent &&
          roundToNearestMinutes(precedingEndOfEvent.end).getTime() ===
            event.start.getTime(),
        );

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
              isEventWithSeparatedEnd={followingEndOfEvents.some(
                (endOfEvent) => endOfEvent.id === event.id,
              )}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
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
    } else if ("scheduleEntry" in journalEntry) {
      const dueSet = journalEntry;

      dayJournalEntryElements.push({
        id:
          client.cache.identify(dueSet.scheduleEntry) ||
          dueSet.scheduleEntry.id,
        element: (
          <DiaryAgendaDayDueSet
            key={dueSet.scheduleEntry.id}
            user={user!}
            dueSet={dueSet}
            date={dayDate}
            cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
            exerciseInfo={dueSet.scheduleEntry.exerciseInfo}
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
        const workoutDate = isSameDay(
          addHours(workout.workedOutAt, dayStartHour),
          subHours(
            setsWithLocation[0]?.[0].createdAt || workout.workedOutAt,
            dayStartHour,
          ),
        )
          ? setsWithLocation[0]?.[0].createdAt || workout.workedOutAt
          : workout.workedOutAt;

        // why the fuck is recalculating this necessary for the cotemporalityOfSurroundingEvent to be correct
        const eventThatSurroundsWorkoutExercise = dayJournalEntries
          .filter((je): je is Event => je.__typename === "Event")
          .find(
            (event) =>
              isBefore(event.start, workoutDate) &&
              isBefore(workoutDate, event.end),
          );

        const cotemporalityOfSurroundingEvent =
          eventThatSurroundsWorkoutExercise
            ? cotemporality(eventThatSurroundsWorkoutExercise)
            : null;

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
      const locationChange = journalEntry;
      dayJournalEntryElements.push({
        id: locationChange.id,
        element: (
          <DiaryAgendaDayEntry
            key={locationChange.id}
            cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
          >
            <center
              key={locationChange.id}
              className="-ml-6 w-full text-xs font-medium opacity-75 [font-variant:small-caps]"
            >
              {locationChange.location}
            </center>
          </DiaryAgendaDayEntry>
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
          {todayStr === dayName ? (
            <span className="ml-2 font-medium whitespace-nowrap text-white text-shadow-black/60 text-shadow-md">
              ☀️
              <small>
                {sunrise.toLocaleTimeString("en-DK", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                -
                {sunset.toLocaleTimeString("en-DK", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </small>
              🌙
            </span>
          ) : (
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
        "mb-1 flex flex-0! flex-col items-stretch gap-1.5 pr-1 pb-2 pl-0 " +
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
