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
import { FieldSetX, FieldSetY } from "../../../components/FieldSet";
import type { MongoVEventWithVCalendar } from "../../../lib";
import { getUserIcalEventsBetween } from "../../../sources/ical";
import { DEFAULT_TIMEZONE, roundToNearestDay } from "../../../utils";

export async function DiaryAgendaEvents({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const now = TZDate.tz(timeZone);
  const todayDate = `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}`;
  const isToday = date === todayDate;
  const calendarEvents = await getUserIcalEventsBetween(user.id, {
    start: startOfDay(tzDate),
    end: addDays(endOfDay(tzDate), 7),
  });

  return (
    <FieldSetY className="flex min-w-[50%] flex-1 flex-col" legend="Events">
      {Object.entries(
        calendarEvents.reduce(
          (memo: Record<string, MongoVEventWithVCalendar[]>, event) => {
            for (const date of eachDayOfInterval(
              {
                start: max([
                  event.datetype === "date"
                    ? roundToNearestDay(event.start)
                    : event.start,
                  startOfDay(tzDate),
                ]),
                end: min([
                  event.datetype === "date"
                    ? roundToNearestDay(event.end)
                    : event.end,
                  addDays(endOfDay(tzDate), 7),
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
              memo[calName].push(event);
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
        >
          <ul>
            {events.length ? (
              events.map((event, i) => {
                const duration = intervalToDuration(event);

                return (
                  <li key={i} className="flex items-center gap-2">
                    <div className="text-center">
                      <div className="font-semibold tabular-nums">
                        {event.datetype === "date-time" ? (
                          event.start.toLocaleTimeString("en-DK", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone,
                          })
                        ) : (
                          <>
                            Day{" "}
                            {eachDayOfInterval(event, { in: tz(timeZone) })
                              .filter(
                                (date) =>
                                  differenceInHours(event.end, date) > 2,
                              )
                              .findIndex(
                                (date) =>
                                  `${date.getFullYear()}-${
                                    date.getMonth() + 1
                                  }-${date.getDate()}` === dayName,
                              ) + 1}
                          </>
                        )}{" "}
                      </div>
                      <div className="whitespace-nowrap text-xs">
                        {duration.days ? `${duration.days}d` : null}
                        {duration.hours ? `${duration.hours}h` : null}
                        {duration.minutes ? `${duration.minutes}m` : null}
                        {duration.seconds ? `${duration.seconds}s` : null}
                      </div>
                    </div>{" "}
                    <div className="max-w-52">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {event.summary}
                      </div>
                      <div
                        className="overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                        title={event.location}
                      >
                        <i>{event.location || <>&nbsp;</>}</i>
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
