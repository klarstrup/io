import { tz, TZDate } from "@date-fns/tz";
import { faCalendarCheck } from "@fortawesome/free-regular-svg-icons";
import { faCalendar } from "@fortawesome/free-regular-svg-icons/faCalendar";
import { faCalendarWeek, faDumbbell } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  addHours,
  differenceInDays,
  endOfDay,
  intervalToDuration,
  isBefore,
  isPast,
  roundToNearestMinutes,
  startOfDay,
  subHours,
} from "date-fns";
import { type WithId } from "mongodb";
import type { Session } from "next-auth";
import Link from "next/link";
import { Fragment, type ReactElement } from "react";
import { ScrollToMe } from "../../components/CenterMe";
import { FieldSetX } from "../../components/FieldSet";
import type { MongoVEvent } from "../../lib";
import { LocationData } from "../../models/location";
import {
  ExerciseSetWithExerciseDataAndLocationsAndWorkouts,
  isClimbingExercise,
  WorkoutSource,
} from "../../models/workout";
import { calculateClimbingStats } from "../../models/workout.server";
import {
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  roundToNearestDay,
  uniqueBy,
} from "../../utils";
import { getJournalEntryPrincipalDate, JournalEntry } from "./DiaryAgendaDay";
import { DiaryAgendaDayCreateExpander } from "./DiaryAgendaDayCreateExpander";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayDueSet } from "./DiaryAgendaDayDueSet";
import { DiaryAgendaDayTodo } from "./DiaryAgendaDayTodo";
import { WorkoutEntryExercise } from "./WorkoutEntry";

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
  dayLocations: WithId<LocationData>[];
  dayJournalEntries: JournalEntry[];
}) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const todayStr = dateToString(subHours(now, dayStartHour));
  const isToday = date === todayStr;

  const dayStart = addHours(startOfDay(dayDate), dayStartHour);
  const dayEnd = addHours(endOfDay(dayDate), dayStartHour);
  const dayName = dateToString(dayDate);

  const dayJournalEntryElements: ReactElement[] = [];

  let i = 0;
  const getIsJournalEntryPassed = (
    journalEntry: (typeof dayJournalEntries)[number],
  ) => {
    const principalDate = getJournalEntryPrincipalDate(journalEntry);
    if (!principalDate) return false;
    return isBefore(principalDate, now);
  };
  for (const journalEntry of dayJournalEntries) {
    const nextJournalEntry =
      i < dayJournalEntries.length - 1 ? dayJournalEntries[i + 1] : undefined;

    if ("type" in journalEntry && journalEntry.type === "VEVENT") {
      const event = journalEntry;
      const isPassed = isBefore(event.end, now);
      const isAllDayEvent =
        differenceInDays(event.end, event.start) >= 0 &&
        event.datetype === "date";

      if (isAllDayEvent) {
        dayJournalEntryElements.push(
          <Fragment key={event.uid}>
            <span className="flex justify-center pt-1 text-xl text-black/50">
              <FontAwesomeIcon icon={faCalendarWeek} />
            </span>
            <div className="flex flex-wrap items-stretch gap-0.5">
              {(() => {
                const eventStart =
                  event.datetype === "date"
                    ? roundToNearestDay(event.start, {
                        in: tz(event.start.tz || DEFAULT_TIMEZONE),
                      })
                    : event.start;
                const eventEnd =
                  event.datetype === "date"
                    ? roundToNearestDay(event.end, {
                        in: tz(event.end.tz || DEFAULT_TIMEZONE),
                      })
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
            </div>
          </Fragment>,
        );
      } else {
        dayJournalEntryElements.push(
          <Fragment key={event.uid}>
            <span
              className={
                "flex justify-center pt-1 text-xl " +
                (isPassed ? "text-green-400" : "text-gray-900/50")
              }
            >
              <FontAwesomeIcon
                icon={
                  isAllDayEvent
                    ? faCalendarWeek
                    : isPassed
                      ? faCalendarCheck
                      : faCalendar
                }
              />
            </span>
            <div>{renderOnDayEvent(event)}</div>
          </Fragment>,
        );
      }
    } else if ("type" in journalEntry && journalEntry.type === "VTODO") {
      const todo = journalEntry;
      dayJournalEntryElements.push(
        <DiaryAgendaDayTodo todo={todo} key={todo.uid} />,
      );
    } else if ("scheduleEntry" in journalEntry) {
      const dueSet = journalEntry;

      dayJournalEntryElements.push(
        <Fragment key={JSON.stringify(dueSet.scheduleEntry)}>
          <span className="text-md flex justify-center pt-1.5 text-gray-900/50">
            <FontAwesomeIcon icon={faDumbbell} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-0.5">
              <DiaryAgendaDayDueSet
                key={JSON.stringify(dueSet.scheduleEntry)}
                userId={user!.id}
                dueSet={dueSet}
                date={dayDate}
                workouts={uniqueBy(
                  dayJournalEntries
                    .filter(
                      (
                        jE,
                      ): jE is ExerciseSetWithExerciseDataAndLocationsAndWorkouts =>
                        Array.isArray(jE) && jE.length === 3 && "id" in jE[0],
                    )
                    ?.map(([_, __, workouts]) => workouts)
                    .flat() || [],
                  (w) => w._id.toString(),
                )
                  .filter((w) => w.source === WorkoutSource.Self)
                  .map((d) => ({
                    ...d,
                    _id: d._id.toString(),
                  }))}
                locations={dayLocations.map(({ _id, ...d }) => ({
                  ...d,
                  id: _id.toString(),
                }))}
              />
            </div>
          </div>
        </Fragment>,
      );
    } else if (
      Array.isArray(journalEntry) &&
      journalEntry.length === 3 &&
      "id" in journalEntry[0]
    ) {
      const exerciseSetEntry =
        journalEntry as ExerciseSetWithExerciseDataAndLocationsAndWorkouts;

      dayJournalEntryElements.push(
        <Fragment key={exerciseSetEntry[0].id}>
          <span className="text-md flex justify-center pt-1 text-green-400">
            <FontAwesomeIcon icon={faDumbbell} />
          </span>
          <div>
            <div>
              {(([exercise, setsWithLocation, workouts]) => {
                const mostRecentWorkout =
                  workouts.length === 1 ? workouts[0]! : null;
                const workoutDateStr =
                  mostRecentWorkout &&
                  dateToString(mostRecentWorkout.workedOutAt);

                return (
                  <div
                    className={
                      "inline-flex h-auto flex-row justify-center rounded-md border border-black/20 bg-white" +
                      (isClimbingExercise(exercise.id) ? " w-full" : "")
                    }
                  >
                    <div
                      className={
                        "flex w-30 flex-col flex-wrap items-stretch justify-center gap-1 self-stretch rounded-l-[5px] bg-black/60 px-1.5 text-sm leading-tight text-white opacity-40 " +
                        (!setsWithLocation.length ? "rounded-r-[5px]" : "")
                      }
                    >
                      <div className="flex justify-between">
                        <Link
                          prefetch={false}
                          href={`/diary/exercises/${exercise.id}`}
                        >
                          {[exercise.name, ...exercise.aliases]
                            .filter((name) => name.length >= 4)
                            .sort((a, b) => a.length - b.length)[0]!
                            .replace("Barbell", "")}
                        </Link>
                        {mostRecentWorkout &&
                        (mostRecentWorkout.source === WorkoutSource.Self ||
                          !mostRecentWorkout.source) ? (
                          <Link
                            prefetch={false}
                            href={`/diary/${workoutDateStr}/workout/${mostRecentWorkout.id}`}
                            style={{ color: "#edab00" }}
                            className="text-sm font-semibold"
                          >
                            ⏎
                          </Link>
                        ) : null}
                      </div>
                      <div className="leading-none">
                        {isClimbingExercise(exercise.id)
                          ? calculateClimbingStats(setsWithLocation)
                          : null}
                      </div>
                    </div>
                    {setsWithLocation.length > 0 ? (
                      <div className="flex flex-1 items-center px-1.5 py-0.5 pb-1 text-xs">
                        <WorkoutEntryExercise
                          exercise={exercise}
                          setsWithLocations={setsWithLocation}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })(exerciseSetEntry)}
            </div>
          </div>
        </Fragment>,
      );
    }

    const currentIsPassed = getIsJournalEntryPassed(journalEntry);
    if (i > 0 && nextJournalEntry) {
      const nextIsPassed = getIsJournalEntryPassed(nextJournalEntry);

      const shouldPutNowDivider = currentIsPassed !== nextIsPassed;

      if (shouldPutNowDivider && isToday) {
        dayJournalEntryElements.push(
          <Fragment key={`divider-${i}`}>
            <div className="flex items-center text-[10px] font-bold text-[#EDAB00]">
              NOW
            </div>
            <div className="flex items-center gap-1 leading-normal">
              <Link
                prefetch={false}
                href={`/diary/${date}/workout`}
                className={
                  "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold shadow-md shadow-black/30"
                }
              >
                <span className="text-xs">➕</span> Workout
              </Link>
              <DiaryAgendaDayCreateTodo date={dayStart} />
              <span
                className={
                  "cursor-not-allowed rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-sm font-semibold text-black/25 shadow-md shadow-black/30"
                }
              >
                <span className="text-xs">➕</span> Event
              </span>
              <ScrollToMe />
            </div>
          </Fragment>,
        );
      }
    }

    i++;
  }
  const allCompleted = dayJournalEntries.every((je) =>
    getIsJournalEntryPassed(je),
  );

  function renderOnDayEvent(event: MongoVEvent) {
    const duration = intervalToDuration({
      start: event.start,
      end: roundToNearestMinutes(event.end, {
        roundingMethod: "ceil",
      }),
    });
    const startDay = startOfDay(addHours(event.start, dayStartHour));
    const endDay = startOfDay(addHours(event.end, dayStartHour));
    const days = differenceInDays(endDay, startDay) + 1;
    const dayNo = differenceInDays(dayStart, startDay) + 1;
    const isLastDay = dayNo === days;

    return (
      <div key={event.uid} className="flex gap-1.5">
        <div className="text-center">
          <div className="leading-snug font-semibold tabular-nums">
            {event.datetype === "date-time" && dayNo <= 1 ? (
              event.start.toLocaleTimeString("en-DK", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone,
              })
            ) : (
              <>Day {dayNo}</>
            )}{" "}
          </div>
          <div className="text-[0.666rem] whitespace-nowrap tabular-nums">
            {dayNo === 1 && duration ? (
              <>
                {duration.days ? `${duration.days}d` : null}
                {duration.hours ? `${duration.hours}h` : null}
                {duration.minutes ? `${duration.minutes}m` : null}
                {duration.seconds ? `${duration.seconds}s` : null}
              </>
            ) : isLastDay ? (
              <>
                -
                {event.end.toLocaleTimeString("en-DK", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone,
                })}
              </>
            ) : null}
          </div>
        </div>
        <div className="flex-1">
          <div className="leading-snug">{event.summary}</div>
          <div className="text-[0.666rem] leading-tight italic">
            {event.location}
          </div>
        </div>
      </div>
    );
  }

  return (
    <FieldSetX
      legend={
        <div className="-ml-3 flex items-center gap-1 leading-normal">
          <span
            className={
              "w-7.5 text-right font-mono text-xs tracking-[-1px] text-gray-900/70 tabular-nums text-shadow-md text-shadow-white"
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
        "mb-1 grid flex-0! gap-1.5 px-1 pb-1 " +
        ((isPast(dayStart) && allCompleted) || isPast(dayEnd)
          ? "bg-green-50 pt-1"
          : todayStr === dayName
            ? "bg-yellow-50 pt-1"
            : "bg-slate-50 pt-1")
      }
      style={{ gridTemplateColumns: "1.5rem minmax(0, 1fr)" }}
    >
      {dayJournalEntryElements.length ? (
        dayJournalEntryElements
      ) : (
        <>
          <div />
          <div className="text-gray-400/50 italic">
            {isPast(dayEnd) ? "Nothing logged" : "Nothing scheduled"}
          </div>
        </>
      )}
    </FieldSetX>
  );
}
