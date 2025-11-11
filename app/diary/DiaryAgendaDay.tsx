import { tz, TZDate } from "@date-fns/tz";
import { faCalendar } from "@fortawesome/free-regular-svg-icons/faCalendar";
import { faCircle } from "@fortawesome/free-regular-svg-icons/faCircle";
import { faCircleCheck } from "@fortawesome/free-regular-svg-icons/faCircleCheck";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  addDays,
  compareAsc,
  differenceInDays,
  differenceInHours,
  eachDayOfInterval,
  endOfDay,
  intervalToDuration,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  max,
  min,
  startOfDay,
} from "date-fns";
import { ObjectId, type WithId } from "mongodb";
import type { Session } from "next-auth";
import Link from "next/link";
import { Fragment } from "react";
import { ScrollToMe } from "../../components/CenterMe";
import { FieldSetX } from "../../components/FieldSet";
import type { MongoVEvent, MongoVTodo } from "../../lib";
import { exercisesById } from "../../models/exercises";
import { Locations } from "../../models/location.server";
import {
  isClimbingExercise,
  isNextSetDue,
  WorkoutSource,
  type WorkoutData,
  type WorkoutExercise,
} from "../../models/workout";
import {
  calculateClimbingStats,
  getNextSets,
  MaterializedWorkoutsView,
} from "../../models/workout.server";
import { getUserIcalEventsBetween } from "../../sources/ical";
import {
  dateToString,
  DEFAULT_TIMEZONE,
  rangeToQuery,
  roundToNearestDay,
  unique,
  uniqueBy,
} from "../../utils";
import { DiaryAgendaDayCreateExpander } from "./DiaryAgendaDayCreateExpander";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayDueSet } from "./DiaryAgendaDayDueSet";
import { DiaryAgendaDayTodo } from "./DiaryAgendaDayTodo";
import { WorkoutEntryExercise } from "./WorkoutEntry";

export async function DiaryAgendaDay({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user?: Session["user"];
}) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const now = TZDate.tz(timeZone);
  const todayStr = dateToString(now);
  const isToday = date === todayStr;

  const fetchingInterval = {
    start: addDays(startOfDay(tzDate, { in: tz(timeZone) }), -2),
    end: addDays(endOfDay(tzDate, { in: tz(timeZone) }), 10),
  };
  const daysOfInterval = eachDayOfInterval(fetchingInterval, {
    in: tz(timeZone),
  });
  const [calendarEvents = [], nextSets = [], workouts = []] = await Promise.all(
    [
      user && getUserIcalEventsBetween(user.id, fetchingInterval),
      user && getNextSets({ user, to: fetchingInterval.end }),
      user &&
        MaterializedWorkoutsView.find(
          {
            userId: user.id,
            workedOutAt: rangeToQuery(
              fetchingInterval.start,
              fetchingInterval.end,
            ),
            deletedAt: { $exists: false },
          },
          { sort: { workedOutAt: -1 } },
        ).toArray(),
    ],
  );

  const eventsByDate: Record<string, MongoVEvent[]> = {};
  const todosByDate: Record<string, MongoVTodo[]> = {};
  const dueSetsByDate: Record<
    string,
    Awaited<ReturnType<typeof getNextSets>>
  > = { [date]: [] };

  for (const date of daysOfInterval) {
    const dueSets = nextSets.filter(
      (nextSet) => isFuture(endOfDay(date)) && isNextSetDue(date, nextSet),
    );
    const calName = dateToString(date);

    for (const dueSet of dueSets) {
      if (
        Object.values(dueSetsByDate)
          .flat()
          .some((e) => e.scheduleEntry.id === dueSet.scheduleEntry.id)
      ) {
        continue;
      }
      if (!dueSetsByDate[calName]) dueSetsByDate[calName] = [];
      dueSetsByDate[calName].push(dueSet);
    }
  }

  for (const event of calendarEvents) {
    for (const date of eachDayOfInterval(
      {
        start: max(
          [
            "datetype" in event && event.datetype === "date"
              ? roundToNearestDay(event.start, {
                  in: tz(event.start.tz || DEFAULT_TIMEZONE),
                })
              : null,

            "completed" in event ? event.completed : null,
            "due" in event ? event.due : null,
            "start" in event ? event.start : null,
            fetchingInterval.start,
          ].filter(Boolean),
        ),
        end: min(
          [
            "datetype" in event && event.datetype === "date"
              ? roundToNearestDay(event.end, {
                  in: tz(event.end.tz || DEFAULT_TIMEZONE),
                })
              : null,
            "completed" in event ? event.completed : null,
            "due" in event ? event.due : null,
            "end" in event ? event.end : null,
            fetchingInterval.end,
          ].filter(Boolean),
        ),
      },
      { in: tz(timeZone) },
    ).sort((a, b) => a.getTime() - b.getTime())) {
      const calName = dateToString(date);

      if (event.type !== "VTODO") {
        if (!eventsByDate[calName]) eventsByDate[calName] = [];
        eventsByDate[calName].push(event);
        continue;
      }
      if (
        isPast(endOfDay(date)) ||
        Object.values(todosByDate)
          .flat()
          .some((e) => e.uid === event.uid)
      ) {
        continue;
      }
      if (!todosByDate[calName]) todosByDate[calName] = [];
      todosByDate[calName].push(event);
    }
  }

  return (
    <div className="flex flex-col justify-start">
      {await Promise.all(
        daysOfInterval.map(async (dayDate, dayI) => {
          const events = eventsByDate[dateToString(dayDate)] || [];
          const dayName = dateToString(dayDate);
          const dayEvents = uniqueBy(events, (event) => event.uid);
          const dayWorkouts = workouts.filter(
            (workout) =>
              dateToString(workout.workedOutAt) === dateToString(dayDate),
          );
          const dayLocations = await Locations.find({
            _id: {
              $in: unique(dayWorkouts.map((workout) => workout.locationId)).map(
                (id) => new ObjectId(id),
              ),
            },
          }).toArray();
          const dayExercisesById = dayWorkouts
            .flatMap((workout) =>
              workout.exercises.map((exercise) => [exercise, workout] as const),
            )
            .sort(([, a], [, b]) => compareAsc(a.workedOutAt, b.workedOutAt))
            // Group by exerciseId to merge multiple workouts of the same exercise on the same day
            .reduce<Record<string, [WorkoutExercise, WithId<WorkoutData>][]>>(
              (acc, [exercise, workout]) => {
                const key = exercise.exerciseId;
                if (!acc[key]) acc[key] = [];
                acc[key].push([exercise, workout]);
                return acc;
              },
              {},
            );

          const dayExerciseSets = Object.entries(dayExercisesById)
            .map(
              ([exerciseId, exerciseWorkouts]) =>
                [
                  exercisesById[parseInt(exerciseId)]!,
                  exerciseWorkouts.flatMap(([{ sets }, workout]) =>
                    sets.map(
                      (set) =>
                        [
                          set,
                          dayLocations.find(
                            (loc) => loc._id.toString() === workout.locationId,
                          ),
                          workout,
                        ] as const,
                    ),
                  ),
                ] as const,
            )
            .sort(([, a], [, b]) => b.length - a.length);

          const dayDueSets = dueSetsByDate[dayName] || [];
          const dayTodos = (todosByDate[dayName] || []).filter(
            (todo) => !todo.completed,
          );
          const dayDones = (todosByDate[dayName] || []).filter(
            (todo) => todo.completed,
          );
          const allDayEvents = dayEvents.filter(
            (event) =>
              differenceInDays(event.end, event.start) > 0 &&
              event.datetype === "date",
          );
          const onDayEvents = dayEvents.filter(
            (event) =>
              !(
                differenceInDays(event.end, event.start) > 0 &&
                event.datetype === "date"
              ),
          );
          const passedOnDayEvents = onDayEvents.filter((event) =>
            isBefore(event.end, now),
          );
          const upcomingOnDayEvents = onDayEvents.filter((event) =>
            isAfter(event.end, now),
          );

          const isDayEmpty =
            !dayEvents.length &&
            !dayWorkouts.length &&
            !dayDueSets.length &&
            !dayTodos.length;

          return (
            <FieldSetX
              key={dayI}
              legend={
                <div className="-ml-3 flex items-center gap-1 leading-normal">
                  <span
                    className={
                      "font-mono text-xs [letter-spacing:-2px] text-gray-900/50 tabular-nums text-shadow-md text-shadow-white"
                    }
                  >
                    {new TZDate(dayName, timeZone).toLocaleDateString("da-DK", {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </span>
                  <b className="text-shadow-md text-shadow-white">
                    {!isToday
                      ? new TZDate(dayName, timeZone).toLocaleDateString(
                          "da-DK",
                        )
                      : todayStr === dayName
                        ? "Today"
                        : new TZDate(dayName, timeZone).toLocaleDateString(
                            "en-DK",
                            { weekday: "long" },
                          )}
                  </b>
                  {todayStr === dayName ? (
                    <>
                      <ScrollToMe />
                      <Link
                        prefetch={false}
                        href={`/diary/${date}/workout`}
                        className={
                          "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-xs font-semibold"
                        }
                      >
                        <span className="text-xs">➕</span> Workout
                      </Link>
                      <DiaryAgendaDayCreateTodo date={dayDate} />
                      <span
                        className={
                          "cursor-pointer rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-xs font-semibold"
                        }
                      >
                        <span className="text-xs">➕</span> Event
                      </span>
                    </>
                  ) : (
                    <DiaryAgendaDayCreateExpander>
                      {isPast(startOfDay(dayDate)) ? (
                        <>
                          <Link
                            prefetch={false}
                            href={`/diary/${date}/workout`}
                            className={
                              "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-xs font-semibold"
                            }
                          >
                            <span className="text-xs">➕</span> Workout
                          </Link>
                        </>
                      ) : null}
                      <DiaryAgendaDayCreateTodo date={dayDate} />
                      <span
                        className={
                          "cursor-pointer rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-xs font-semibold"
                        }
                      >
                        <span className="text-xs">➕</span> Event
                      </span>
                    </DiaryAgendaDayCreateExpander>
                  )}
                </div>
              }
              className={
                "mb-1 w-full flex-0! pb-2 " +
                (isPast(dayDate) &&
                !(
                  dayDueSets.length ||
                  dayTodos.length ||
                  upcomingOnDayEvents.length
                )
                  ? "bg-green-100 pt-1"
                  : todayStr === dayName
                    ? "bg-yellow-100 pt-2"
                    : "bg-slate-50 pt-1")
              }
            >
              <ul>
                {allDayEvents.length ? (
                  <li
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: "1rem minmax(0, 1fr)" }}
                  >
                    <span className="-ml-0.5 pt-[4px] text-right font-mono text-xs text-gray-900/50">
                      <FontAwesomeIcon icon={faCalendar} />
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
                            className="inline-flex items-stretch overflow-hidden rounded-sm border border-solid border-black/20 bg-white"
                          >
                            {numDays > 1 ? (
                              <div className="flex h-full flex-col items-center justify-center self-stretch bg-black/60 px-px text-xs leading-none opacity-40">
                                <span className="px-px text-white">
                                  {dayNo}
                                </span>
                                <hr className="w-full border-t-[0.5px] border-solid border-white opacity-40" />
                                <span className="px-px text-white">
                                  {numDays}
                                </span>
                              </div>
                            ) : null}
                            <div className="flex items-center gap-1 px-1.5">
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
                                ) : isLastDay &&
                                  event.datetype === "date-time" ? (
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
                                <span>{event.location}</span>
                              ) : null}
                            </div>
                          </span>
                        );
                      })}
                    </div>
                  </li>
                ) : null}

                <li
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: "1rem minmax(0, 1fr)" }}
                >
                  {dayDueSets.length ||
                  dayTodos.length ||
                  upcomingOnDayEvents.length ? (
                    <Fragment>
                      <span className="-ml-0.5 pt-[4px] text-right font-mono text-xl text-gray-900/50">
                        <FontAwesomeIcon icon={faCircle} />
                      </span>
                      <div>
                        {upcomingOnDayEvents.length
                          ? uniqueBy(upcomingOnDayEvents, ({ uid }) => uid).map(
                              (event) => {
                                const days = eachDayOfInterval(event, {
                                  in: tz(timeZone),
                                }).filter(
                                  (date) =>
                                    differenceInHours(event.end, date) > 2,
                                );
                                const dayNo =
                                  days.findIndex(
                                    (date) => dateToString(date) === dayName,
                                  ) + 1;
                                const isLastDay = dayNo === days.length;
                                const duration =
                                  dayNo === 1 && intervalToDuration(event);

                                return (
                                  <div key={event.uid} className="flex gap-1.5">
                                    <div className="text-center">
                                      <div className="leading-snug font-semibold tabular-nums">
                                        {event.datetype === "date-time" &&
                                        dayNo === 1 ? (
                                          event.start.toLocaleTimeString(
                                            "en-DK",
                                            {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              timeZone,
                                            },
                                          )
                                        ) : (
                                          <>Day {dayNo}</>
                                        )}{" "}
                                      </div>
                                      <div className="text-[0.666rem] whitespace-nowrap tabular-nums">
                                        {dayNo === 1 && duration ? (
                                          <>
                                            {duration.days
                                              ? `${duration.days}d`
                                              : null}
                                            {duration.hours
                                              ? `${duration.hours}h`
                                              : null}
                                            {duration.minutes
                                              ? `${duration.minutes}m`
                                              : null}
                                            {duration.seconds
                                              ? `${duration.seconds}s`
                                              : null}
                                          </>
                                        ) : isLastDay ? (
                                          <>
                                            -
                                            {event.end.toLocaleTimeString(
                                              "en-DK",
                                              {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                timeZone,
                                              },
                                            )}
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <div className="leading-snug">
                                        {event.summary}
                                      </div>
                                      <div className="text-[0.666rem] leading-tight italic">
                                        {event.location}
                                      </div>
                                    </div>
                                  </div>
                                );
                              },
                            )
                          : null}
                        <div className="flex flex-wrap items-center gap-0.5">
                          {dayTodos.map((todo) => (
                            <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
                          ))}
                          {dayDueSets.map((dueSet) => (
                            <DiaryAgendaDayDueSet
                              key={JSON.stringify(dueSet.scheduleEntry)}
                              userId={user!.id}
                              dueSet={dueSet}
                              date={dayDate}
                            />
                          ))}
                        </div>
                      </div>
                    </Fragment>
                  ) : null}
                  {(dayTodos.length ||
                    upcomingOnDayEvents.length ||
                    dayDueSets.length) &&
                  (dayWorkouts.length ||
                    dayDones.length ||
                    passedOnDayEvents.length) ? (
                    <>
                      <span></span>
                      <span>
                        <hr className="border-gray-200" />
                      </span>
                    </>
                  ) : null}
                  {isPast(dayDate) &&
                  (dayWorkouts.length ||
                    dayDones.length ||
                    passedOnDayEvents.length) ? (
                    <>
                      <span className="-ml-0.5 pt-[4px] text-right font-mono text-xl text-gray-900/50">
                        <FontAwesomeIcon icon={faCircleCheck} />
                      </span>
                      <div>
                        {passedOnDayEvents.length
                          ? uniqueBy(passedOnDayEvents, ({ uid }) => uid).map(
                              (event) => {
                                const days = eachDayOfInterval(event, {
                                  in: tz(timeZone),
                                }).filter(
                                  (date) =>
                                    differenceInHours(event.end, date) > 2,
                                );
                                const dayNo =
                                  days.findIndex(
                                    (date) => dateToString(date) === dayName,
                                  ) + 1;
                                const isLastDay = dayNo === days.length;
                                const duration =
                                  dayNo === 1 && intervalToDuration(event);

                                return (
                                  <div key={event.uid} className="flex gap-1.5">
                                    <div className="text-center">
                                      <div className="leading-snug font-semibold tabular-nums">
                                        {event.datetype === "date-time" &&
                                        dayNo === 1 ? (
                                          event.start.toLocaleTimeString(
                                            "en-DK",
                                            {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              timeZone,
                                            },
                                          )
                                        ) : (
                                          <>Day {dayNo}</>
                                        )}{" "}
                                      </div>
                                      <div className="text-[0.666rem] whitespace-nowrap tabular-nums">
                                        {dayNo === 1 && duration ? (
                                          <>
                                            {duration.days
                                              ? `${duration.days}d`
                                              : null}
                                            {duration.hours
                                              ? `${duration.hours}h`
                                              : null}
                                            {duration.minutes
                                              ? `${duration.minutes}m`
                                              : null}
                                            {duration.seconds
                                              ? `${duration.seconds}s`
                                              : null}
                                          </>
                                        ) : isLastDay ? (
                                          <>
                                            -
                                            {event.end.toLocaleTimeString(
                                              "en-DK",
                                              {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                timeZone,
                                              },
                                            )}
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <div className="leading-snug">
                                        {event.summary}
                                      </div>
                                      <div className="text-[0.666rem] leading-tight italic">
                                        {event.location}
                                      </div>
                                    </div>
                                  </div>
                                );
                              },
                            )
                          : null}
                        <div className="gap-0.5 [column-fill:balance-all] [column-width:200px] [orphans:1] [widows:1] portrait:md:[column-width:300px]">
                          {dayDones.map((todo) => (
                            <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
                          ))}
                          {dayExerciseSets.map(
                            ([exercise, setsWithLocation], exerciseIndex) => {
                              const workouts = uniqueBy(
                                setsWithLocation.map(
                                  ([, , workout]) => workout,
                                ),
                                (workout) => workout.id,
                              );
                              const mostRecentWorkout =
                                workouts.length === 1 ? workouts[0]! : null;
                              const workoutDateStr =
                                mostRecentWorkout &&
                                dateToString(mostRecentWorkout.workedOutAt);

                              return (
                                <div
                                  key={exerciseIndex}
                                  className={
                                    "inline-flex h-auto flex-col justify-center rounded-md border border-black/10 bg-white " +
                                    (isClimbingExercise(exercise.id)
                                      ? "mr-0 w-full"
                                      : "mr-0.5 w-auto last:mr-0")
                                  }
                                >
                                  <div
                                    className={
                                      "flex items-center justify-center self-stretch rounded-t-md bg-black/60 px-1.5 text-white opacity-40"
                                    }
                                  >
                                    <div className="flex flex-wrap items-center gap-1 px-0.5 py-0.5 text-sm leading-none">
                                      <Link
                                        prefetch={false}
                                        href={`/diary/exercises/${exercise.id}`}
                                      >
                                        {[exercise.name, ...exercise.aliases]
                                          .filter((name) => name.length >= 4)
                                          .sort(
                                            (a, b) => a.length - b.length,
                                          )[0]!
                                          .replace("Barbell", "")}
                                      </Link>
                                      {isClimbingExercise(exercise.id)
                                        ? calculateClimbingStats(
                                            setsWithLocation,
                                          )
                                        : null}
                                      {mostRecentWorkout &&
                                      (mostRecentWorkout.source ===
                                        WorkoutSource.Self ||
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
                                  <div className="flex justify-center px-1 py-0.5 pb-1 text-xs">
                                    <WorkoutEntryExercise
                                      exercise={exercise}
                                      setsWithLocations={setsWithLocation}
                                      exerciseIndex={exerciseIndex}
                                    />
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </li>
                {isDayEmpty ? (
                  <li className="text-gray-400/50 italic">
                    No events, workouts or todos
                  </li>
                ) : null}
              </ul>
            </FieldSetX>
          );
        }),
      )}
    </div>
  );
}
