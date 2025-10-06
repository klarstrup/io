import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
  compareAsc,
  differenceInHours,
  eachDayOfInterval,
  endOfDay,
  intervalToDuration,
  isAfter,
  max,
  min,
  startOfDay,
} from "date-fns";
import type { Session } from "next-auth";
import { FieldSetX, FieldSetY } from "../../components/FieldSet";
import Popover from "../../components/Popover";
import UserStuffSourcesForm from "../../components/UserStuffSourcesForm";
import type { MongoVEventWithVCalendar } from "../../lib";
import { isNextSetDue } from "../../models/workout";
import { getNextSets } from "../../models/workout.server";
import { getUserIcalEventsBetween } from "../../sources/ical";
import { dataSourceGroups } from "../../sources/utils";
import {
  dateToString,
  DEFAULT_TIMEZONE,
  isNonEmptyArray,
  roundToNearestDay,
  uniqueBy,
} from "../../utils";
import { NextSets } from "./NextSets";

export async function DiaryAgendaEvents({
  date,
  user,
  onlyGivenDay,
}: {
  date: `${number}-${number}-${number}`;
  user?: Session["user"];
  onlyGivenDay?: boolean;
}) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const now = TZDate.tz(timeZone);
  const todayStr = dateToString(now);
  const isToday = date === todayStr;

  const fetchingInterval = {
    start: startOfDay(tzDate),
    end: onlyGivenDay ? endOfDay(tzDate) : addDays(endOfDay(tzDate), 7),
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
        isAfter(event.end, isToday ? now : tzDate) &&
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
    <FieldSetY
      className="min-w-[250px] flex-1"
      legend={
        <div className="flex items-center gap-2">
          <Popover control="📡">
            <div className="absolute top-4 left-4 z-30 max-h-[66vh] w-96 max-w-[80vw] overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[yellow_0_0_20px]">
              <UserStuffSourcesForm
                user={user}
                sourceOptions={dataSourceGroups.events}
              />
            </div>
          </Popover>
          Events
        </div>
      }
    >
      {Object.entries(eventsByDate)
        .sort(([a], [b]) => compareAsc(new Date(a), new Date(b)))
        .slice(0, 4)
        .map(([dayName, events], i) => (
          <FieldSetX
            key={i}
            legend={
              !isToday
                ? new TZDate(dayName, timeZone).toLocaleDateString("da-DK")
                : todayStr === dayName
                  ? "Today"
                  : new TZDate(dayName, timeZone).toLocaleDateString("en-DK", {
                      weekday: "long",
                    })
            }
            className="w-full"
          >
            <ul>
              {isNonEmptyArray(events) ? (
                uniqueBy(events, (event) =>
                  "uid" in event
                    ? event.uid
                    : JSON.stringify(event.scheduleEntry),
                ).map((event, i, dateEvents) => {
                  if ("scheduleEntry" in event && i == 0) {
                    return (
                      <li key={event.exerciseId}>
                        <div className="flex items-center gap-1 text-[0.73em] leading-none">
                          <span>Workout:</span>{" "}
                          <NextSets
                            user={user}
                            date={date}
                            nextSets={dateEvents.filter(
                              (e) => "scheduleEntry" in e,
                            )}
                            showDetails={false}
                          />
                        </div>
                        {dateEvents.some((e) => !("scheduleEntry" in e)) ? (
                          <hr className="mt-1 mb-0.5 border-gray-200" />
                        ) : (
                          <div className="mt-1 mb-0.5" />
                        )}
                      </li>
                    );
                  }

                  if ("uid" in event) {
                    const days = eachDayOfInterval(event, {
                      in: tz(timeZone),
                    }).filter((date) => differenceInHours(event.end, date) > 2);
                    const dayNo =
                      days.findIndex((date) => dateToString(date) === dayName) +
                      1;
                    const duration = dayNo === 1 && intervalToDuration(event);
                    const isLastDay = dayNo === days.length;

                    return (
                      <li key={event.uid} className="flex gap-2">
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
            </ul>
          </FieldSetX>
        ))}
    </FieldSetY>
  );
}
