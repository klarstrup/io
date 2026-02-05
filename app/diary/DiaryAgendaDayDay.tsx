import { useApolloClient } from "@apollo/client/react";
import { tz, TZDate } from "@date-fns/tz";
import {
  faCalendarCheck,
  faCalendarWeek,
} from "@fortawesome/free-solid-svg-icons";
import {
  addHours,
  differenceInDays,
  endOfDay,
  isBefore,
  isPast,
  startOfDay,
  subHours,
} from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import type { ReactElement } from "react";
import { FieldSetX } from "../../components/FieldSet";
import { Location, Workout, WorkoutSet } from "../../graphql.generated";
import { exercisesById } from "../../models/exercises";
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
  let hasPutNowDivider = false;
  const getIsJournalEntryPassed = (
    journalEntry: (typeof dayJournalEntries)[number],
  ) => {
    const principalDate = getJournalEntryPrincipalDate(journalEntry);
    if (!principalDate) return false;
    return isBefore(principalDate.end, now);
  };
  const putNowDivider = () => {
    if (isToday && !hasPutNowDivider) {
      dayJournalEntryElements.push({
        id: "now-divider",
        element: <DiaryAgendaDayNow key="now-divider" date={date} />,
      });
      hasPutNowDivider = true;
    }
  };
  for (const journalEntry of dayJournalEntries) {
    const nextJournalEntry =
      i < dayJournalEntries.length - 1 ? dayJournalEntries[i + 1] : undefined;
    const previousJournalEntry = i > 0 ? dayJournalEntries[i - 1] : undefined;
    const currentIsPassed = getIsJournalEntryPassed(journalEntry);
    const nextIsPassed =
      nextJournalEntry && getIsJournalEntryPassed(nextJournalEntry);
    const shouldPutNowDivider = !currentIsPassed;

    if (shouldPutNowDivider && isToday) putNowDivider();

    if ("__typename" in journalEntry && journalEntry.__typename === "Event") {
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
              cotemporality={cotemporality({
                start: event.start,
                end: event.end,
              })}
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
                  <span className="inline-flex items-stretch overflow-hidden rounded-md border border-solid border-black/20 bg-white">
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
                        <span className="text-[0.666rem] leading-tight italic">
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
        if (
          previousJournalEntry &&
          "__typename" in previousJournalEntry &&
          previousJournalEntry.__typename === "Event" &&
          previousJournalEntry.id === event.id
        ) {
          // don't show the end of an event if it's immediately after the event itself, to avoid cluttering the UI with duplicate entries
        } else {
          dayJournalEntryElements.push({
            id: "end-of-" + (client.cache.identify(event) || event.id),
            element: (
              <DiaryAgendaDayEntry
                icon={faCalendarCheck}
                cotemporality={cotemporality({
                  start: event.start,
                  end: event.end,
                })}
                key={"end-of-" + event.id}
              >
                <div key={event.id} className="flex gap-1.5">
                  <div className="text-center">
                    <div className="leading-snug font-semibold tabular-nums">
                      {event.end.toLocaleTimeString("en-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone,
                      })}
                    </div>
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="leading-snug">{event.summary}</div>
                    <div className="text-[0.666rem] whitespace-nowrap tabular-nums">
                      END
                    </div>
                  </div>
                </div>
              </DiaryAgendaDayEntry>
            ),
          });
        }
      } else {
        dayJournalEntryElements.push({
          id: client.cache.identify(event) || event.id,
          element: (
            <DiaryAgendaDayEvent
              dayDate={dayDate}
              user={user}
              event={event}
              key={event.id}
            />
          ),
        });
      }
    } else if (
      "__typename" in journalEntry &&
      journalEntry.__typename === "Todo"
    ) {
      const todo = journalEntry;
      dayJournalEntryElements.push({
        id: client.cache.identify(todo) || todo.id,
        element: <DiaryAgendaDayTodo todo={todo} key={todo.id} />,
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
            userId={user!.id}
            dueSet={dueSet}
            date={dayDate}
            workouts={dayJournalEntries
              .filter(
                (jE): jE is Workout =>
                  "__typename" in jE && jE.__typename === "Workout",
              )
              .filter((w) => w.source === WorkoutSource.Self)
              .map((d) => ({ ...d, _id: d.id.toString() }))}
            locations={dayLocations}
          />
        ),
      });
    } else if (
      "__typename" in journalEntry &&
      journalEntry.__typename === "Workout"
    ) {
      const workout = journalEntry;

      const mostRecentWorkout = workout;
      const workoutDateStr =
        mostRecentWorkout && dateToString(mostRecentWorkout.workedOutAt);

      for (const workoutExercise of workout.exercises) {
        const exercise = exercisesById[workoutExercise.exerciseId];
        if (!exercise) continue;

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
              exercise={exercise}
              setsWithLocation={setsWithLocation}
              mostRecentWorkout={mostRecentWorkout}
              workoutDateStr={workoutDateStr}
              key={
                (client.cache.identify(workout) || workout.id) +
                "-" +
                String(workoutExercise.exerciseId)
              }
            />
          ),
        });
      }
    }

    const shouldPutNowDivider2 =
      (journalEntry &&
        nextJournalEntry &&
        currentIsPassed !== nextIsPassed &&
        !hasPutNowDivider) ||
      (i === dayJournalEntries.length - 1 && !hasPutNowDivider);

    if (shouldPutNowDivider2 && isToday) putNowDivider();

    i++;
  }
  if (!hasPutNowDivider) putNowDivider();

  const allCompleted = dayJournalEntries.every((je) =>
    getIsJournalEntryPassed(je),
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
