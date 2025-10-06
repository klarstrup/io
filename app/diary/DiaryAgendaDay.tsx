import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
  compareAsc,
  differenceInHours,
  eachDayOfInterval,
  endOfDay,
  intervalToDuration,
  isAfter,
  isPast,
  max,
  min,
  startOfDay,
} from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { Fragment } from "react";
import { FieldSetX } from "../../components/FieldSet";
import type { MongoVEventWithVCalendar } from "../../lib";
import { exercisesById } from "../../models/exercises";
import { isClimbingExercise, isNextSetDue } from "../../models/workout";
import {
  getIsSetPR,
  getNextSets,
  MaterializedWorkoutsView,
  noPR,
} from "../../models/workout.server";
import { getUserIcalEventsBetween } from "../../sources/ical";
import {
  dateToString,
  DEFAULT_TIMEZONE,
  isNonEmptyArray,
  rangeToQuery,
  roundToNearestDay,
  uniqueBy,
} from "../../utils";
import WorkoutEntry from "./WorkoutEntry";

const exampleChores = [
  /*
  "Take out the trash",
  "Clean the kitchen",
  "Mow the lawn",
  "Wash the car",
  "Organize the garage",
  */
];

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
    start: addDays(startOfDay(tzDate, { in: tz(timeZone) }), 0),
    end: addDays(endOfDay(tzDate, { in: tz(timeZone) }), 14),
  };
  const calendarEvents = user
    ? await getUserIcalEventsBetween(user.id, fetchingInterval)
    : [];

  const eventsByDate: Record<
    string,
    (
      | MongoVEventWithVCalendar
      | Awaited<ReturnType<typeof getNextSets>>[number]
    )[]
  > = { [date]: [] };

  const nextSets = user
    ? await getNextSets({ user, to: fetchingInterval.end })
    : [];
  for (const date of eachDayOfInterval(fetchingInterval)) {
    const dueSets = nextSets.filter((nextSet) => isNextSetDue(date, nextSet));
    const calName = dateToString(date);

    for (const dueSet of dueSets) {
      if (
        Object.values(eventsByDate)
          .flat()
          .some(
            (e) =>
              "scheduleEntry" in e &&
              JSON.stringify(e.scheduleEntry) ===
                JSON.stringify(dueSet.scheduleEntry),
          )
      ) {
        continue;
      }
      if (!eventsByDate[calName]) eventsByDate[calName] = [];
      eventsByDate[calName].push(dueSet);
    }
  }

  for (const event of calendarEvents) {
    for (const date of eachDayOfInterval(
      {
        start: max([
          event.datetype === "date"
            ? roundToNearestDay(event.start, {
                in: tz(event.start.tz || DEFAULT_TIMEZONE),
              })
            : event.start,
          fetchingInterval.start,
        ]),
        end: min([
          event.datetype === "date"
            ? roundToNearestDay(event.end, {
                in: tz(event.end.tz || DEFAULT_TIMEZONE),
              })
            : event.end,
          fetchingInterval.end,
        ]),
      },
      { in: tz(timeZone) },
    ).filter(
      (date) =>
        isAfter(event.end, fetchingInterval.start) &&
        differenceInHours(event.end, date) > 2,
    )) {
      const calName = dateToString(date);

      if (
        !(
          differenceInHours(event.end, event.start) < 24 &&
          Object.values(eventsByDate).some((events) =>
            events.some((e) => "uid" in e && e.uid === event.uid),
          )
        )
      ) {
        if (!eventsByDate[calName]) eventsByDate[calName] = [];
        eventsByDate[calName].push(event);
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      {await Promise.all(
        Object.entries(eventsByDate)
          .sort(([a], [b]) => compareAsc(new Date(a), new Date(b)))
          .map(async ([dayName, events], dayI) => {
            const dayDate = new Date(dayName);
            const [workouts] = user
              ? await Promise.all([
                  MaterializedWorkoutsView.find(
                    {
                      userId: user.id,
                      workedOutAt: rangeToQuery(
                        startOfDay(dayDate),
                        endOfDay(dayDate),
                      ),
                      deletedAt: { $exists: false },
                    },
                    { sort: { workedOutAt: -1 } },
                  ).toArray(),
                ])
              : [];

            const workoutsExerciseSetPRs =
              user &&
              workouts &&
              (await Promise.all(
                workouts.map((workout) =>
                  Promise.all(
                    workout.exercises.map(async ({ exerciseId, sets }) => {
                      if (isClimbingExercise(exerciseId)) {
                        return Array.from({ length: sets.length }, () => noPR);
                      }

                      const precedingWorkouts =
                        await MaterializedWorkoutsView.find(
                          {
                            userId: user.id,
                            "exercises.exerciseId": exerciseId,
                            workedOutAt: { $lt: workout.workedOutAt },
                            deletedAt: { $exists: false },
                          },
                          { sort: { workedOutAt: -1 } },
                        ).toArray();

                      return sets.map((set) =>
                        getIsSetPR(workout, precedingWorkouts, exerciseId, set),
                      );
                    }),
                  ),
                ),
              ));

            const dayEvents = uniqueBy(events, (event) =>
              "uid" in event ? event.uid : JSON.stringify(event.scheduleEntry),
            );

            const allDayEvents = dayEvents.filter(
              (event): event is MongoVEventWithVCalendar => {
                if (!("uid" in event)) return false;
                const interval = intervalToDuration(event);
                return Boolean(interval.days && interval.days > 0);
              },
            );

            return (
              <FieldSetX
                key={dayI}
                legend={
                  <div className="-ml-2 flex items-center gap-1">
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
                    {todayStr === dayName ? (
                      <>
                        <Link
                          prefetch={false}
                          href={`/diary/${date}/workout`}
                          className={
                            "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold"
                          }
                        >
                          <span className="text-xs">➕</span> Workout
                        </Link>
                        <a
                          href={`https://www.myfitnesspal.com/food/diary?date=${date}`}
                          target="_blank"
                          className={
                            "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold"
                          }
                        >
                          <span className="text-xs">➕</span> Food
                        </a>
                        <span
                          className={
                            "cursor-pointer rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-sm font-semibold"
                          }
                        >
                          <span className="text-xs">➕</span> Todo
                        </span>
                        <span
                          className={
                            "cursor-pointer rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-sm font-semibold"
                          }
                        >
                          <span className="text-xs">➕</span> Event
                        </span>
                      </>
                    ) : (
                      <a
                        href={`https://www.myfitnesspal.com/food/diary?date=${date}`}
                        target="_blank"
                        className={
                          "cursor-pointer rounded-md bg-gray-300 px-1 py-0.5 font-semibold " +
                          (todayStr === dayName ? "text-sm" : "text-xs")
                        }
                      >
                        <span className="text-xs">➕</span>
                      </a>
                    )}
                  </div>
                }
                className={
                  "mb-1 w-full pt-1 pb-1 " +
                  (todayStr === dayName ? "bg-[#ff0]/20" : "bg-gray-100/50")
                }
              >
                <ul>
                  {isNonEmptyArray(allDayEvents) ? (
                    <li
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: "4px minmax(0, 1fr)" }}
                    >
                      <span className="-ml-1 font-mono text-[8px] leading-[2.5em]">
                        📅
                      </span>
                      <div className="flex flex-wrap items-stretch gap-0.5">
                        {allDayEvents.map((event) => {
                          const duration = intervalToDuration(event);
                          const days = eachDayOfInterval(event, {
                            in: tz(timeZone),
                          }).filter(
                            (date) => differenceInHours(event.end, date) > 2,
                          );
                          const dayNo =
                            days.findIndex(
                              (date) => dateToString(date) === dayName,
                            ) + 1;
                          const isLastDay = dayNo === days.length;
                          return (
                            <span
                              key={event.uid}
                              className="inline-flex items-stretch overflow-hidden rounded-sm border border-solid border-black/10 bg-white text-xs"
                            >
                              {days.length > 1 ? (
                                <>
                                  {event.datetype === "date-time" &&
                                  dayNo === 1 ? (
                                    event.start.toLocaleTimeString("en-DK", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      timeZone,
                                    })
                                  ) : (
                                    <div className="flex h-full flex-col items-center justify-center self-stretch bg-black/90 px-px text-[9px] leading-none opacity-40">
                                      <span className="px-px text-white">
                                        {dayNo}
                                      </span>
                                      <hr className="mb-[-0.5px] w-full border-t-[0.5px] border-solid border-white opacity-40" />
                                      <span className="px-px text-white">
                                        {days.length}
                                      </span>
                                    </div>
                                  )}
                                  {dayNo === 1 ? (
                                    <>
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
                                  ) : isLastDay &&
                                    event.datetype === "date-time" ? (
                                    <>
                                      -
                                      {event.end.toLocaleTimeString("en-DK", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone,
                                      })}
                                    </>
                                  ) : null}
                                </>
                              ) : null}
                              <div className="px-1 py-0.5">
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
                  {dayEvents
                    .filter((e) => "uid" in e)
                    .some((e) =>
                      allDayEvents
                        .filter((e) => "uid" in e)
                        .some((e2) => e === e2),
                    ) &&
                  dayEvents
                    .filter((e) => "uid" in e)
                    .some(
                      (e) =>
                        !allDayEvents
                          .filter((e) => "uid" in e)
                          .some((e2) => e === e2),
                    ) ? (
                    <hr className="mt-1 mb-0.5 border-gray-200" />
                  ) : null}
                  {isNonEmptyArray(dayEvents) ? (
                    uniqueBy(events, (event) =>
                      "uid" in event
                        ? event.uid
                        : JSON.stringify(event.scheduleEntry),
                    ).map((event) => {
                      if (
                        allDayEvents.some(
                          (allDayEvent) => allDayEvent === event,
                        )
                      ) {
                        return null;
                      }

                      if ("uid" in event) {
                        const duration = intervalToDuration(event);
                        const days = eachDayOfInterval(event, {
                          in: tz(timeZone),
                        }).filter(
                          (date) => differenceInHours(event.end, date) > 2,
                        );
                        const dayNo =
                          days.findIndex(
                            (date) => dateToString(date) === dayName,
                          ) + 1;
                        const isLastDay = dayNo === days.length;

                        return (
                          <li key={event.uid} className="flex gap-1.5">
                            <div className="text-center">
                              <div className="leading-snug font-semibold tabular-nums">
                                {event.datetype === "date-time" &&
                                dayNo === 1 ? (
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
                                {dayNo === 1 ? (
                                  <>
                                    {duration.days ? `${duration.days}d` : null}
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
                              <div className="leading-snug">
                                {event.summary}
                              </div>
                              <div className="text-[0.666rem] leading-tight italic">
                                {event.location || <>&nbsp;</>}
                              </div>
                            </div>
                          </li>
                        );
                      }

                      return null;
                    })
                  ) : (
                    <li>
                      <i>Nothing scheduled</i>
                    </li>
                  )}
                  {dayEvents.some((e) => !("scheduleEntry" in e)) &&
                  (dayEvents.some((e) => "scheduleEntry" in e) ||
                    isNonEmptyArray(workouts)) ? (
                    <hr className="my-1 border-gray-200" />
                  ) : null}
                  <li
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: "4px minmax(0, 1fr)" }}
                  >
                    {isNonEmptyArray(events)
                      ? dayEvents.map((event, eventI, dateEvents) => {
                          if ("scheduleEntry" in event && eventI == 0) {
                            return (
                              <Fragment
                                key={JSON.stringify(event.scheduleEntry)}
                              >
                                <span className="-ml-1 font-mono leading-none">
                                  ☐
                                </span>
                                <div className="flex flex-wrap items-center gap-0.5">
                                  {[exampleChores[dayI % exampleChores.length]]
                                    .filter(Boolean)
                                    .map((todo, index) => (
                                      <div
                                        key={index}
                                        className="rounded-md border border-solid border-black/10 bg-white px-1 py-0.5 text-xs"
                                      >
                                        {todo}
                                      </div>
                                    ))}
                                  {dateEvents
                                    .filter((e) => "scheduleEntry" in e)
                                    .map((dueSet) => {
                                      const exercise =
                                        exercisesById[dueSet.exerciseId]!;

                                      return (
                                        <div
                                          key={JSON.stringify(
                                            dueSet.scheduleEntry,
                                          )}
                                          className="rounded-md border border-solid border-black/10 bg-white px-1 py-0.5 text-xs"
                                        >
                                          {
                                            [exercise.name, ...exercise.aliases]
                                              .filter(
                                                (name) => name.length >= 4,
                                              )
                                              .sort(
                                                (a, b) => a.length - b.length,
                                              )[0]!
                                          }
                                        </div>
                                      );
                                    })}
                                </div>
                              </Fragment>
                            );
                          }

                          return null;
                        })
                      : null}
                    {isPast(dayDate) &&
                    isNonEmptyArray(workouts) &&
                    dayEvents.some((e) => "scheduleEntry" in e) ? (
                      <>
                        <span></span>
                        <span>
                          <hr className="border-gray-200" />
                        </span>
                      </>
                    ) : null}
                    {isPast(dayDate) && isNonEmptyArray(workouts) ? (
                      <>
                        <span className="-ml-1 font-mono leading-none">☑</span>
                        <div>
                          {isNonEmptyArray(workouts)
                            ? Array.from(workouts)
                                .sort((a, b) =>
                                  compareAsc(a.workedOutAt, b.workedOutAt),
                                )
                                ?.map((workout) => (
                                  <WorkoutEntry
                                    exerciseSetPRs={
                                      workoutsExerciseSetPRs?.[
                                        workouts.indexOf(workout)
                                      ]
                                    }
                                    key={workout._id.toString()}
                                    workout={workout}
                                    showLocation={false}
                                  />
                                ))
                            : null}
                        </div>
                      </>
                    ) : null}
                  </li>
                </ul>
              </FieldSetX>
            );
          }),
      )}
    </div>
  );
}
