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
import { isNextSetDue } from "../../models/workout";
import {
  getNextSets,
  MaterializedWorkoutsView,
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
    end: addDays(endOfDay(tzDate, { in: tz(timeZone) }), 7),
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

  const eventsByDate: Record<string, MongoVEventWithVCalendar[]> = {
    [date]: [],
  };
  const dueSetsByDate: Record<
    string,
    Awaited<ReturnType<typeof getNextSets>>
  > = { [date]: [] };

  for (const date of daysOfInterval) {
    const dueSets = nextSets.filter((nextSet) => isNextSetDue(date, nextSet));
    const calName = dateToString(date);

    for (const dueSet of dueSets) {
      if (
        Object.values(dueSetsByDate)
          .flat()
          .some(
            (e) =>
              JSON.stringify(e.scheduleEntry) ===
              JSON.stringify(dueSet.scheduleEntry),
          )
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
          differenceInHours(event.end, event.start) <= 24 &&
          Object.values(eventsByDate).some((events) =>
            events.some((e) => e.uid === event.uid),
          )
        )
      ) {
        if (!eventsByDate[calName]) eventsByDate[calName] = [];
        eventsByDate[calName].push(event);
      }
    }
  }

  return (
    <div className="flex h-full flex-col justify-start">
      {daysOfInterval.map((dayDate, dayI) => {
        const events = eventsByDate[dateToString(dayDate)] || [];
        const dayName = dateToString(dayDate);
        const dayEvents = uniqueBy(events, (event) => event.uid);
        const dayWorkouts = workouts.filter(
          (workout) =>
            dateToString(workout.workedOutAt) === dateToString(dayDate),
        );
        const dayDueSets = dueSetsByDate[dayName] || [];

        const allDayEvents = dayEvents.filter(
          (event): event is MongoVEventWithVCalendar =>
            differenceInDays(event.end, event.start) > 0 &&
            event.datetype === "date",
        );

        const isDayEmpty =
          !dayEvents.length && !dayWorkouts.length && !dayDueSets.length;

        return (
          <FieldSetX
            key={dayI}
            legend={
              <div className="-ml-3 flex items-center gap-1">
                <span
                  className={
                    "font-mono text-xs [letter-spacing:-2px] text-gray-900/50 tabular-nums"
                  }
                >
                  {new TZDate(dayName, timeZone).toLocaleDateString("da-DK", {
                    month: "numeric",
                    day: "numeric",
                  })}
                </span>
                {!isToday
                  ? new TZDate(dayName, timeZone).toLocaleDateString("da-DK")
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
                        "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-xs font-semibold"
                      }
                    >
                      <span className="text-xs">➕</span> Workout
                    </Link>
                    <a
                      href={`https://www.myfitnesspal.com/food/diary?date=${date}`}
                      target="_blank"
                      className={
                        "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-xs font-semibold"
                      }
                    >
                      <span className="text-xs">➕</span> Food
                    </a>
                    <span
                      className={
                        "cursor-pointer rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-xs font-semibold"
                      }
                    >
                      <span className="text-xs">➕</span> Todo
                    </span>
                    <span
                      className={
                        "cursor-pointer rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-xs font-semibold"
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
                      "cursor-pointer rounded-md bg-gray-300 px-1 py-0.5 text-xs font-semibold"
                    }
                  >
                    <span className="text-xs">➕</span>
                  </a>
                )}
              </div>
            }
            className={
              "mb-1 w-full flex-0! pb-2 " +
              (todayStr === dayName
                ? "bg-[#ff0]/20 pt-2"
                : "bg-gray-100/80 pt-1")
            }
          >
            <ul>
              {isNonEmptyArray(allDayEvents) ? (
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
                          ? startOfDay(start, {
                              in: tz(start.tz || DEFAULT_TIMEZONE),
                            })
                          : start;
                      const eventEnd =
                        event.datetype === "date"
                          ? endOfDay(end, {
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
                              <span className="px-px text-white">{dayNo}</span>
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
              {dayEvents.some((e) => allDayEvents.some((e2) => e === e2)) &&
              dayEvents.some((e) => !allDayEvents.some((e2) => e === e2)) ? (
                <hr className="mt-1 mb-0.5 border-gray-200" />
              ) : null}
              {isNonEmptyArray(dayEvents)
                ? uniqueBy(events, ({ uid }) => uid).map((event) => {
                    if (
                      allDayEvents.some((allDayEvent) => allDayEvent === event)
                    ) {
                      return null;
                    }

                    const days = eachDayOfInterval(event, {
                      in: tz(timeZone),
                    }).filter((date) => differenceInHours(event.end, date) > 2);
                    const dayNo =
                      days.findIndex((date) => dateToString(date) === dayName) +
                      1;
                    const isLastDay = dayNo === days.length;
                    const duration = dayNo === 1 && intervalToDuration(event);

                    return (
                      <li key={event.uid} className="flex gap-1.5">
                        <div className="text-center">
                          <div className="leading-snug font-semibold tabular-nums">
                            {event.datetype === "date-time" && dayNo === 1 ? (
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
                          <div className="leading-snug">{event.summary}</div>
                          <div className="text-[0.666rem] leading-tight italic">
                            {event.location}
                          </div>
                        </div>
                      </li>
                    );
                  })
                : null}
              {dayEvents.length &&
              (dayDueSets.length || isNonEmptyArray(dayWorkouts)) ? (
                <hr className="my-1 border-gray-200" />
              ) : null}
              <li
                className="grid gap-1.5"
                style={{ gridTemplateColumns: "1rem minmax(0, 1fr)" }}
              >
                {isNonEmptyArray(dayDueSets) ? (
                  <Fragment>
                    <span className="-ml-0.5 pt-[4px] text-right font-mono text-xl text-gray-900/50">
                      <FontAwesomeIcon icon={faCircle} />
                    </span>
                    <div className="flex flex-wrap items-center gap-0.5">
                      {[exampleChores[dayI % exampleChores.length]]
                        .filter(Boolean)
                        .map((todo, index) => (
                          <div
                            key={index}
                            className="rounded-md border border-solid border-black/20 bg-white px-1.5"
                          >
                            {todo}
                          </div>
                        ))}
                      {dayDueSets.map((dueSet) => {
                        const exercise = exercisesById[dueSet.exerciseId]!;

                        return (
                          <div
                            key={JSON.stringify(dueSet.scheduleEntry)}
                            className="rounded-md border border-solid border-black/20 bg-white px-1.5"
                          >
                            {
                              [exercise.name, ...exercise.aliases]
                                .filter((name) => name.length >= 4)
                                .sort((a, b) => a.length - b.length)[0]!
                            }
                          </div>
                        );
                      })}
                    </div>
                  </Fragment>
                ) : null}
                {isPast(dayDate) &&
                isNonEmptyArray(dayWorkouts) &&
                isNonEmptyArray(dayDueSets) ? (
                  <>
                    <span></span>
                    <span>
                      <hr className="border-gray-200" />
                    </span>
                  </>
                ) : null}
                {isPast(dayDate) && isNonEmptyArray(dayWorkouts) ? (
                  <>
                    <span className="-ml-0.5 pt-[4px] text-right font-mono text-xl text-gray-900/50">
                      <FontAwesomeIcon icon={faCircleCheck} />
                    </span>
                    <div>
                      {dayWorkouts
                        .sort((a, b) =>
                          compareAsc(a.workedOutAt, b.workedOutAt),
                        )
                        ?.map((workout) => (
                          <WorkoutEntry
                            key={workout._id.toString()}
                            workout={workout}
                            showLocation={false}
                          />
                        ))}
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
      })}
    </div>
  );
}
