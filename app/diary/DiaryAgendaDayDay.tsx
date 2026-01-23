import { tz, TZDate } from "@date-fns/tz";
import {
  faCalendar,
  faCalendarCheck,
  faCalendarWeek,
  faDumbbell,
} from "@fortawesome/free-solid-svg-icons";
import {
  addHours,
  differenceInDays,
  endOfDay,
  intervalToDuration,
  isBefore,
  isPast,
  max,
  min,
  roundToNearestMinutes,
  startOfDay,
  subHours,
} from "date-fns";
import { type WithId } from "mongodb";
import type { Session } from "next-auth";
import Link from "next/link";
import type { ReactElement } from "react";
import { ScrollToMe } from "../../components/CenterMe";
import { FieldSetX } from "../../components/FieldSet";
import type { MongoVEvent } from "../../lib";
import { exercisesById } from "../../models/exercises";
import type { LocationData } from "../../models/location";
import {
  isClimbingExercise,
  WorkoutData,
  WorkoutSource,
} from "../../models/workout";
import { calculateClimbingStats } from "../../models/workout.server";
import {
  cotemporality,
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  roundToNearestDay,
} from "../../utils";
import { DiaryAgendaDayCreateExpander } from "./DiaryAgendaDayCreateExpander";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayDueSet } from "./DiaryAgendaDayDueSet";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayTodo } from "./DiaryAgendaDayTodo";
import { TodoSortableContext } from "./TodoDroppable";
import { WorkoutEntryExercise } from "./WorkoutEntry";
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

  const dayJournalEntryElements: { id: string; element: ReactElement }[] = [];

  let i = 0;
  let hasPutNowDivider = false;
  const getIsJournalEntryPassed = (
    journalEntry: (typeof dayJournalEntries)[number],
  ) => {
    const principalDate = getJournalEntryPrincipalDate(journalEntry);
    if (!principalDate) return false;
    return isBefore(principalDate, now);
  };
  const putNowDivider = () => {
    if (isToday && !hasPutNowDivider) {
      dayJournalEntryElements.push({
        id: `divider-${i}`,
        element: (
          <DiaryAgendaDayEntry
            key={`divider-${i}`}
            iconTxt={
              <span className="text-[10px] font-bold text-[#EDAB00]">NOW</span>
            }
            cotemporality="current"
            className="mt-0.5 mb-2 gap-1.5"
          >
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
              hidden
              className={
                "cursor-not-allowed rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-sm font-semibold text-black/25 shadow-md shadow-black/30"
              }
            >
              <span className="text-xs">➕</span> Event
            </span>
            <ScrollToMe />
          </DiaryAgendaDayEntry>
        ),
      });
      hasPutNowDivider = true;
    }
  };
  for (const journalEntry of dayJournalEntries) {
    const nextJournalEntry =
      i < dayJournalEntries.length - 1 ? dayJournalEntries[i + 1] : undefined;

    const currentIsPassed = getIsJournalEntryPassed(journalEntry);
    const nextIsPassed =
      nextJournalEntry && getIsJournalEntryPassed(nextJournalEntry);
    const shouldPutNowDivider = !currentIsPassed;

    if (shouldPutNowDivider && isToday) putNowDivider();

    if ("type" in journalEntry && journalEntry.type === "VEVENT") {
      const event = journalEntry;
      const isPassed = isBefore(event.end, now);
      const isAllDayEvent =
        differenceInDays(event.end, event.start) >= 0 &&
        event.datetype === "date";

      if (isAllDayEvent) {
        dayJournalEntryElements.push({
          id: event.uid,
          element: (
            <DiaryAgendaDayEntry
              icon={faCalendarWeek}
              cotemporality={cotemporality({
                start: event.start,
                end: event.end,
              })}
              key={event.uid}
            >
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
            </DiaryAgendaDayEntry>
          ),
        });
      } else {
        dayJournalEntryElements.push({
          id: event.uid,
          element: (
            <DiaryAgendaDayEntry
              key={event.uid}
              icon={
                isAllDayEvent
                  ? faCalendarWeek
                  : isPassed
                    ? faCalendarCheck
                    : faCalendar
              }
              cotemporality={cotemporality({
                start: event.start,
                end: event.end,
              })}
            >
              {renderOnDayEvent(event)}
            </DiaryAgendaDayEntry>
          ),
        });
      }
    } else if ("type" in journalEntry && journalEntry.type === "VTODO") {
      const todo = journalEntry;
      dayJournalEntryElements.push({
        id: todo.uid,
        element: (
          <DiaryAgendaDayTodo
            todo={{
              __typename: "Todo",
              id: todo.uid,
              due: todo.due ?? null,
              start: todo.start ?? null,
              completed: todo.completed ?? null,
              summary: todo.summary ?? "",
            }}
            key={todo.uid}
            sortableId={todo.uid}
          />
        ),
      });
    } else if ("scheduleEntry" in journalEntry) {
      const dueSet = journalEntry;

      dayJournalEntryElements.push({
        id: dueSet.scheduleEntry.id,
        element: (
          <DiaryAgendaDayDueSet
            key={dueSet.scheduleEntry.id}
            sortableId={dueSet.scheduleEntry.id}
            userId={user!.id}
            dueSet={dueSet}
            date={dayDate}
            workouts={dayJournalEntries
              .filter((jE): jE is WithId<WorkoutData> => "exercises" in jE)
              .filter((w) => w.source === WorkoutSource.Self)
              .map((d) => ({ ...d, _id: d._id.toString() }))}
            locations={dayLocations.map(({ _id, ...d }) => ({
              ...d,
              id: _id.toString(),
            }))}
          />
        ),
      });
    } else if ("exercises" in journalEntry) {
      const workout = journalEntry as WithId<
        WorkoutData & { materializedAt?: Date }
      >;

      const mostRecentWorkout = workout;
      const workoutDateStr =
        mostRecentWorkout && dateToString(mostRecentWorkout.workedOutAt);

      for (const workoutExercise of workout.exercises) {
        const exercise = exercisesById[workoutExercise.exerciseId];
        if (!exercise) continue;

        const setsWithLocation = workoutExercise.sets.map((set) => {
          const setLocationId = workout.locationId;
          const location = dayLocations.find(
            (loc) => String(loc._id) === setLocationId,
          );
          return [set, location, workout] as const;
        });

        dayJournalEntryElements.push({
          id: String(workout._id) + "-" + String(workoutExercise.exerciseId),
          element: (
            <DiaryAgendaDayEntry
              key={
                String(workout._id) + "-" + String(workoutExercise.exerciseId)
              }
              icon={faDumbbell}
              cotemporality={cotemporality({
                start: min([
                  workout.workedOutAt,
                  ...workoutExercise.sets
                    .map((s) => s.createdAt)
                    .filter(Boolean),
                ]),
                end: max([
                  workout.workedOutAt,
                  ...workoutExercise.sets
                    .map((s) => s.updatedAt)
                    .filter(Boolean),
                ]),
              })}
            >
              <div
                className={
                  "inline-flex h-auto flex-row justify-center rounded-md border border-black/20 bg-white" +
                  (isClimbingExercise(workoutExercise.exerciseId)
                    ? " w-full"
                    : "")
                }
              >
                <div
                  className={
                    "flex w-32 flex-col flex-wrap items-stretch justify-center self-stretch rounded-l-[5px] bg-black/60 px-1.5 text-sm leading-tight text-white opacity-40 " +
                    (!workoutExercise.sets.length ? "rounded-r-[5px]" : "")
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
                        className="text-sm leading-none font-semibold"
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
            </DiaryAgendaDayEntry>
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
