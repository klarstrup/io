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
  isAfter,
  isBefore,
  isPast,
  roundToNearestMinutes,
  startOfDay,
  subHours,
} from "date-fns";
import { type WithId } from "mongodb";
import type { Session } from "next-auth";
import Link from "next/link";
import { ScrollToMe } from "../../components/CenterMe";
import { FieldSetX } from "../../components/FieldSet";
import type { MongoVEvent, MongoVTodo } from "../../lib";
import { ExerciseData } from "../../models/exercises";
import { LocationData } from "../../models/location";
import {
  isClimbingExercise,
  WorkoutExerciseSet,
  WorkoutSource,
  type WorkoutData,
} from "../../models/workout";
import {
  calculateClimbingStats,
  getNextSets,
} from "../../models/workout.server";
import {
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  roundToNearestDay,
  uniqueBy,
} from "../../utils";
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
  dayEvents,
  dayDueSets,
  dayTodos,
  dayExerciseSets,
}: {
  date: `${number}-${number}-${number}`;
  dayDate: Date;
  user?: Session["user"];
  dayLocations: WithId<LocationData>[];
  dayEvents: MongoVEvent[];
  dayDueSets: Awaited<ReturnType<typeof getNextSets>>;
  dayTodos: MongoVTodo[];
  dayExerciseSets: (readonly [
    ExerciseData,
    (readonly [
      WorkoutExerciseSet,
      WithId<LocationData> | undefined,
      WithId<WorkoutData>,
    ])[],
    WithId<WorkoutData>[],
  ])[];
}) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const todayStr = dateToString(subHours(now, dayStartHour));
  const isToday = date === todayStr;

  const dayStart = addHours(startOfDay(dayDate), dayStartHour);
  const dayEnd = addHours(endOfDay(dayDate), dayStartHour);
  const dayName = dateToString(dayDate);

  const allDayEvents = dayEvents.filter(
    (event) =>
      differenceInDays(event.end, event.start) >= 0 &&
      event.datetype === "date",
  );
  const onDayEvents = dayEvents.filter(
    (event) =>
      !(
        differenceInDays(event.end, event.start) >= 0 &&
        event.datetype === "date"
      ),
  );
  const passedOnDayEvents = onDayEvents.filter((event) =>
    isBefore(event.end, now),
  );
  const upcomingOnDayEvents = onDayEvents.filter((event) =>
    isAfter(event.end, now),
  );

  const dayTodosTodo = dayTodos.filter((todo) => !todo.completed);
  const dayTodosDone = dayTodos.filter((todo) => todo.completed);

  const isDayEmpty =
    !dayEvents.length &&
    !dayExerciseSets.length &&
    !dayDueSets.length &&
    !dayTodos.length;

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
        (todayStr === dayName ? "mt-1 mb-5 pb-3" : "mb-1 pb-1") +
        " grid flex-0! gap-1.5 px-1 " +
        ((isPast(dayStart) &&
          !(
            dayDueSets.length ||
            dayTodos.length ||
            upcomingOnDayEvents.length
          ) &&
          (dayTodosDone.length ||
            dayExerciseSets.length ||
            passedOnDayEvents.length)) ||
        isPast(dayEnd)
          ? "bg-green-50 pt-1"
          : todayStr === dayName
            ? "bg-yellow-50 pt-1"
            : "bg-slate-50 pt-1")
      }
      style={{ gridTemplateColumns: "1.5rem minmax(0, 1fr)" }}
    >
      {allDayEvents.length ? (
        <>
          <span className="flex justify-center pt-1 text-xl text-black/50">
            <FontAwesomeIcon icon={faCalendarWeek} />
          </span>
          <div className="flex flex-wrap items-stretch gap-0.5">
            {allDayEvents.map(({ start, end, ...event }) => {
              const eventStart =
                event.datetype === "date"
                  ? roundToNearestDay(start, {
                      in: tz(start.tz || DEFAULT_TIMEZONE),
                    })
                  : start;
              const eventEnd =
                event.datetype === "date"
                  ? roundToNearestDay(end, {
                      in: tz(end.tz || DEFAULT_TIMEZONE),
                    })
                  : end;

              const dayNo = differenceInDays(dayDate, eventStart) + 1;
              const numDays = differenceInDays(eventEnd, eventStart);
              const isFirstDay = dayNo === 1;
              const isLastDay = dayNo === numDays;
              return (
                <span
                  key={event.uid}
                  className="inline-flex items-stretch overflow-hidden rounded-md border border-solid border-black/20 bg-white"
                >
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
            })}
          </div>
        </>
      ) : null}
      {upcomingOnDayEvents.length ? (
        <>
          <span className="flex justify-center pt-1 text-xl text-gray-900/50">
            <FontAwesomeIcon icon={faCalendar} />
          </span>
          <div>
            {upcomingOnDayEvents.length
              ? upcomingOnDayEvents.map(renderOnDayEvent)
              : null}
          </div>
        </>
      ) : null}
      {dayDueSets.length ? (
        <>
          <span className="text-md flex justify-center pt-1.5 text-gray-900/50">
            <FontAwesomeIcon icon={faDumbbell} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-0.5">
              {dayDueSets.map((dueSet) => (
                <DiaryAgendaDayDueSet
                  key={JSON.stringify(dueSet.scheduleEntry)}
                  userId={user!.id}
                  dueSet={dueSet}
                  date={dayDate}
                  workouts={uniqueBy(
                    dayExerciseSets.map(([_, __, workouts]) => workouts).flat(),
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
              ))}
            </div>
          </div>
        </>
      ) : null}
      {dayTodosTodo.map((todo) => (
        <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
      ))}
      {(allDayEvents.length ||
        dayTodosTodo.length ||
        upcomingOnDayEvents.length ||
        dayDueSets.length) &&
      (dayExerciseSets.length ||
        dayTodosDone.length ||
        passedOnDayEvents.length) ? (
        <>
          <span></span>
          <span>
            <hr className="border-black/20" />
          </span>
        </>
      ) : null}
      {passedOnDayEvents.length ? (
        <>
          <span className="flex justify-center pt-1 text-xl text-green-400">
            <FontAwesomeIcon icon={faCalendarCheck} />
          </span>
          <div>
            {passedOnDayEvents.length
              ? passedOnDayEvents.map(renderOnDayEvent)
              : null}
          </div>
        </>
      ) : null}
      {dayExerciseSets.length ? (
        <>
          <span className="text-md flex justify-center pt-1 text-green-400">
            <FontAwesomeIcon icon={faDumbbell} />
          </span>
          <div>
            <div className="gap-[0.25%] [column-fill:balance-all] [column-width:200px] [orphans:1] [widows:1] portrait:sm:[column-width:300px]">
              {dayExerciseSets.map(
                ([exercise, setsWithLocation, workouts], exerciseIndex) => {
                  const mostRecentWorkout =
                    workouts.length === 1 ? workouts[0]! : null;
                  const workoutDateStr =
                    mostRecentWorkout &&
                    dateToString(mostRecentWorkout.workedOutAt);

                  return (
                    <div
                      key={exerciseIndex}
                      className={
                        "inline-flex h-auto flex-col justify-center rounded-md border border-black/20 bg-white " +
                        (isClimbingExercise(exercise.id)
                          ? "mr-0 w-full"
                          : "mr-[0.5%] w-[49.5%] last:mr-0")
                      }
                    >
                      <div
                        className={
                          "flex items-center justify-center self-stretch rounded-t-md bg-black/60 px-1.5 text-white opacity-40 " +
                          (!setsWithLocation.length ? "rounded-b-md" : "")
                        }
                      >
                        <div className="flex flex-wrap items-center gap-1 px-0.5 py-0.5 text-sm leading-none">
                          <Link
                            prefetch={false}
                            href={`/diary/exercises/${exercise.id}`}
                          >
                            {[exercise.name, ...exercise.aliases]
                              .filter((name) => name.length >= 4)
                              .sort((a, b) => a.length - b.length)[0]!
                              .replace("Barbell", "")}
                          </Link>
                          {isClimbingExercise(exercise.id)
                            ? calculateClimbingStats(setsWithLocation)
                            : null}
                          {mostRecentWorkout &&
                          (mostRecentWorkout.source === WorkoutSource.Self ||
                            !mostRecentWorkout.source) ? (
                            <Link
                              prefetch={false}
                              href={`/diary/${workoutDateStr}/workout/${mostRecentWorkout.id}`}
                              style={{ color: "#edab00" }}
                              className="text-sm leading-0 font-semibold"
                            >
                              ⏎
                            </Link>
                          ) : null}
                        </div>
                      </div>
                      {setsWithLocation.length > 0 ? (
                        <div className="flex justify-center px-1 py-0.5 pb-1 text-xs">
                          <WorkoutEntryExercise
                            exercise={exercise}
                            setsWithLocations={setsWithLocation}
                            exerciseIndex={exerciseIndex}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </>
      ) : null}
      {dayTodosDone.map((todo) => (
        <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
      ))}
      {isDayEmpty ? (
        <>
          <div />
          <div className="text-gray-400/50 italic">
            {isPast(dayEnd) ? "Nothing logged" : "Nothing scheduled"}
          </div>
        </>
      ) : null}
      {todayStr === dayName ? (
        <>
          <div />
          <div className="mt-1 flex items-center gap-1 leading-normal">
            <ScrollToMe />
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
          </div>
        </>
      ) : null}
    </FieldSetX>
  );
}
