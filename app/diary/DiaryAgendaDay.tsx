import { tz, TZDate } from "@date-fns/tz";
import { faCalendarCheck } from "@fortawesome/free-regular-svg-icons";
import { faCalendar } from "@fortawesome/free-regular-svg-icons/faCalendar";
import { faCalendarWeek, faDumbbell } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  addDays,
  addHours,
  compareAsc,
  differenceInDays,
  eachDayOfInterval,
  endOfDay,
  intervalToDuration,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  max,
  min,
  roundToNearestMinutes,
  startOfDay,
  subHours,
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
import {
  getUserIcalEventsBetween,
  getUserIcalTodosBetween,
} from "../../sources/ical";
import {
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  rangeToQuery,
  roundToNearestDay,
  unique,
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
  const todayStr = dateToString(subHours(now, dayStartHour));
  const isToday = date === todayStr;

  const fetchingInterval = {
    start: addHours(addDays(startOfDay(tzDate), -3), dayStartHour),
    end: addHours(addDays(endOfDay(tzDate), 10), dayStartHour),
  };
  const [
    calendarEvents = [],
    calendarTodos = [],
    nextSets = [],
    workouts = [],
  ] = await Promise.all([
    user && getUserIcalEventsBetween(user.id, fetchingInterval),
    user && getUserIcalTodosBetween(user.id, fetchingInterval),
    user && getNextSets({ user, to: fetchingInterval.end }),
    user &&
      MaterializedWorkoutsView.find(
        {
          userId: user.id,
          $or: [
            {
              workedOutAt: rangeToQuery(
                fetchingInterval.start,
                fetchingInterval.end,
              ),
            },
            {
              // All-Day workouts are stored with workedOutAt at UTC 00:00 of the day
              workedOutAt: startOfDay(fetchingInterval.start, {
                in: tz("UTC"),
              }),
            },
          ],
          deletedAt: { $exists: false },
        },
        { sort: { workedOutAt: -1 } },
      ).toArray(),
  ]);

  const eventsByDate: Record<string, MongoVEvent[]> = {};
  const todosByDate: Record<string, MongoVTodo[]> = {};
  const dueSetsByDate: Record<
    string,
    Awaited<ReturnType<typeof getNextSets>>
  > = { [date]: [] };

  const daysOfInterval = eachDayOfInterval(fetchingInterval).filter(
    (date) => addHours(date, dayStartHour) <= fetchingInterval.end,
  );
  for (const date of daysOfInterval) {
    const dayEnd = addHours(endOfDay(date), dayStartHour);
    const dueSets = nextSets.filter(
      (nextSet) => isFuture(dayEnd) && isNextSetDue(date, nextSet),
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
            subHours(
              max(
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
              dayStartHour,
            ),
            fetchingInterval.start,
          ].filter(Boolean),
        ),
        end: min(
          [
            subHours(
              min(
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
              dayStartHour,
            ),
            fetchingInterval.end,
          ].filter(Boolean),
        ),
      },
      { in: tz(timeZone) },
    )) {
      const dayStart = addHours(startOfDay(date), dayStartHour);
      const dayEnd = addHours(endOfDay(date), dayStartHour);

      const calName = dateToString(addHours(date, dayStartHour));

      if (event.datetype === "date") {
        if (
          isBefore(dayEnd, addHours(event.start, dayStartHour)) ||
          isAfter(dayStart, addHours(event.end, dayStartHour))
        ) {
          continue;
        }
      }

      if (!eventsByDate[calName]) eventsByDate[calName] = [];
      eventsByDate[calName].push(event);
    }
  }

  for (const todo of calendarTodos) {
    for (const date of eachDayOfInterval(
      {
        start: subHours(
          max(
            [
              todo.completed || todo.due,
              todo.completed || todo.start,
              fetchingInterval.start,
            ].filter(Boolean),
          ),
          dayStartHour,
        ),
        end: subHours(
          min(
            [
              todo.completed || todo.due,
              todo.completed || todo.start,
              fetchingInterval.end,
            ].filter(Boolean),
          ),
          dayStartHour,
        ),
      },
      { in: tz(timeZone) },
    )) {
      const dayEnd = addHours(endOfDay(date), dayStartHour);

      const calName = dateToString(addHours(date, dayStartHour));
      if (
        isPast(dayEnd) ||
        Object.values(todosByDate)
          .flat()
          .some((e) => e.uid === todo.uid)
      ) {
        continue;
      }
      if (!todosByDate[calName]) todosByDate[calName] = [];
      todosByDate[calName].push(todo);
    }
  }

  return (
    <div className="flex flex-col items-stretch justify-start">
      {await Promise.all(
        daysOfInterval.map(async (dayDate, dayI) => {
          const dayStart = addHours(startOfDay(dayDate), dayStartHour);
          const dayEnd = addHours(endOfDay(dayDate), dayStartHour);

          const dayEvents = eventsByDate[dateToString(dayDate)] || [];
          const dayName = dateToString(dayDate);
          const dayWorkouts = workouts.filter((workout) =>
            workout.source === WorkoutSource.Self
              ? workout.workedOutAt >= startOfDay(dayDate) &&
                workout.workedOutAt <= endOfDay(dayDate)
              : workout.workedOutAt >= dayStart &&
                workout.workedOutAt <= dayEnd,
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
                  exerciseWorkouts.map(([_, workout]) => workout),
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

          const isDayEmpty =
            !dayEvents.length &&
            !dayWorkouts.length &&
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
              key={dayI}
              legend={
                <div className="-ml-1 flex items-center gap-1 leading-normal">
                  <span
                    className={
                      "font-mono text-xs tracking-[-1px] text-gray-900/70 tabular-nums text-shadow-md text-shadow-white"
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
                          "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-xs font-semibold shadow-sm"
                        }
                      >
                        <span className="text-xs">➕</span> Workout
                      </Link>
                      <DiaryAgendaDayCreateTodo date={dayStart} />
                      <span
                        className={
                          "cursor-not-allowed rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-xs font-semibold text-black/25 shadow-sm"
                        }
                      >
                        <span className="text-xs">➕</span> Event
                      </span>
                    </>
                  ) : (
                    <DiaryAgendaDayCreateExpander>
                      {isPast(dayStart) ? (
                        <>
                          <Link
                            prefetch={false}
                            href={`/diary/${date}/workout`}
                            className={
                              "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-xs font-semibold shadow-sm"
                            }
                          >
                            <span className="text-xs opacity-25">➕</span>{" "}
                            Workout
                          </Link>
                        </>
                      ) : null}
                      <DiaryAgendaDayCreateTodo date={dayStart} />
                      <span
                        className={
                          "cursor-not-allowed rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-xs font-semibold text-black/25 shadow-sm"
                        }
                      >
                        <span className="text-xs">➕</span> Event
                      </span>
                    </DiaryAgendaDayCreateExpander>
                  )}
                </div>
              }
              className={
                "mb-1 flex-0! px-1 pb-2 " +
                ((isPast(dayStart) &&
                  !(
                    dayDueSets.length ||
                    dayTodos.length ||
                    upcomingOnDayEvents.length
                  ) &&
                  (dayDones.length ||
                    dayWorkouts.length ||
                    passedOnDayEvents.length)) ||
                isPast(dayEnd)
                  ? "bg-green-50 pt-1"
                  : todayStr === dayName
                    ? "bg-yellow-50 pt-1"
                    : "bg-slate-50 pt-1")
              }
            >
              <ul>
                {allDayEvents.length ? (
                  <li
                    className="grid gap-1.5 pb-1.5"
                    style={{ gridTemplateColumns: "1.25rem minmax(0, 1fr)" }}
                  >
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
                                <span className="text-[0.666rem] leading-tight italic">
                                  {event.location}
                                </span>
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
                  style={{ gridTemplateColumns: "1.25rem minmax(0, 1fr)" }}
                >
                  {upcomingOnDayEvents.length ? (
                    <Fragment>
                      <span className="flex justify-center pt-1 text-xl text-gray-900/50">
                        <FontAwesomeIcon icon={faCalendar} />
                      </span>
                      <div>
                        {upcomingOnDayEvents.length
                          ? upcomingOnDayEvents.map(renderOnDayEvent)
                          : null}
                      </div>
                    </Fragment>
                  ) : null}
                  {dayDueSets.length ? (
                    <Fragment>
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
                              workouts={dayWorkouts
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
                    </Fragment>
                  ) : null}
                  {dayTodos.map((todo) => (
                    <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
                  ))}
                  {(allDayEvents.length ||
                    dayTodos.length ||
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
                  {dayWorkouts.length ? (
                    <>
                      <span className="text-md flex justify-center pt-1 text-green-400">
                        <FontAwesomeIcon icon={faDumbbell} />
                      </span>
                      <div>
                        <div className="gap-[0.25%] [column-fill:balance-all] [column-width:200px] [orphans:1] [widows:1] portrait:sm:[column-width:300px]">
                          {dayExerciseSets.map(
                            (
                              [exercise, setsWithLocation, workouts],
                              exerciseIndex,
                            ) => {
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
                                      : "mr-[0.5%] w-[49.5%] last:mr-0")
                                  }
                                >
                                  <div
                                    className={
                                      "flex items-center justify-center self-stretch rounded-t-md bg-black/60 px-1.5 text-white opacity-40 " +
                                      (!setsWithLocation.length
                                        ? "rounded-b-md"
                                        : "")
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
                  {dayDones.map((todo) => (
                    <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
                  ))}
                </li>
                {isDayEmpty ? (
                  <li className="text-gray-400/50 italic">
                    {isPast(dayEnd) ? "Nothing logged" : "Nothing scheduled"}
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
