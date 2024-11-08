import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
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
import type { MongoVEventWithVCalendar } from "../../lib";
import { getUserIcalEventsBetween } from "../../sources/ical";
import { DEFAULT_TIMEZONE, roundToNearestDay } from "../../utils";

export async function DiaryAgendaEvents({
  date,
  user,
  onlyGivenDay,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
  onlyGivenDay?: boolean;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const now = TZDate.tz(timeZone);
  const todayDate = `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}`;
  const isToday = date === todayDate;

  const fetchingInterval = {
    start: startOfDay(tzDate),
    end: onlyGivenDay ? endOfDay(tzDate) : addDays(endOfDay(tzDate), 7),
  };
  const calendarEvents = await getUserIcalEventsBetween(
    user.id,
    fetchingInterval,
  );

  return (
    <FieldSetY className="min-w-[50%] flex-1" legend="Events">
      {Object.entries(
        calendarEvents.reduce(
          (memo: Record<string, MongoVEventWithVCalendar[]>, event) => {
            for (const date of eachDayOfInterval(
              {
                start: max([
                  event.datetype === "date"
                    ? roundToNearestDay(event.start)
                    : event.start,
                  fetchingInterval.start,
                ]),
                end: min([
                  event.datetype === "date"
                    ? roundToNearestDay(event.end)
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
              const calName = `${date.getFullYear()}-${
                date.getMonth() + 1
              }-${date.getDate()}`;

              if (!memo[calName]) memo[calName] = [];
              if (
                !(
                  differenceInHours(event.end, event.start) < 24 &&
                  Object.values(memo).some((events) =>
                    events.some((e) => e.uid === event.uid),
                  )
                )
              ) {
                memo[calName].push(event);
              }
            }
            return memo;
          },
          { [date]: [] },
        ),
      )
        .slice(0, 4)
        .map(([dayName, events], i) => (
          <FieldSetX
            key={i}
            legend={
              !isToday
                ? new TZDate(dayName, timeZone).toLocaleDateString("da-DK")
                : `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}` ===
                    dayName
                  ? "Today"
                  : new TZDate(dayName, timeZone).toLocaleDateString("en-DK", {
                      weekday: "long",
                    })
            }
            className="w-full"
          >
            <ul>
              {events.length ? (
                events.map((event) => {
                  const duration = intervalToDuration(event);

                  const days = eachDayOfInterval(event, {
                    in: tz(timeZone),
                  }).filter((date) => differenceInHours(event.end, date) > 2);
                  const dayNo =
                    days.findIndex(
                      (date) =>
                        `${date.getFullYear()}-${
                          date.getMonth() + 1
                        }-${date.getDate()}` === dayName,
                    ) + 1;
                  const isLastDay = dayNo === days.length;

                  return (
                    <li key={event.uid} className="flex gap-2">
                      <div className="text-center">
                        <div className="font-semibold tabular-nums leading-snug">
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
                        <div className="whitespace-nowrap text-[0.666rem] tabular-nums">
                          {dayNo === 1 ? (
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
                        <div className="text-[0.666rem] italic leading-tight">
                          {event.location || <>&nbsp;</>}
                        </div>
                      </div>
                    </li>
                  );
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
