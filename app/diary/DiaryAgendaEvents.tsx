import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
  differenceInHours,
  eachDayOfInterval,
  endOfDay,
  intervalToDuration,
  max,
  min,
  startOfDay,
} from "date-fns";
import type { Session } from "next-auth";
import { FieldSetX, FieldSetY } from "../../components/FieldSet";
import type { MongoVEventWithVCalendar } from "../../lib";
import { getUserIcalEventsBetween } from "../../sources/ical";
import { DEFAULT_TIMEZONE, roundToNearestDay } from "../../utils";

export async function DiaryAgendaEvents({ user }: { user: Session["user"] }) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const now = TZDate.tz(timeZone);

  const calendarEvents = await getUserIcalEventsBetween(user.id, {
    start: startOfDay(now),
    end: addDays(endOfDay(now), 2),
  });

  return (
    <FieldSetY className="flex flex-1 flex-col">
      <legend className="ml-3">
        <big>Events</big>
      </legend>
      {Object.entries(
        calendarEvents.reduce(
          (memo: Record<string, MongoVEventWithVCalendar[]>, event) => {
            for (const date of eachDayOfInterval(
              {
                start: max([
                  event.datetype === "date"
                    ? roundToNearestDay(event.start)
                    : event.start,
                  startOfDay(now),
                ]),
                end: min([
                  event.datetype === "date"
                    ? roundToNearestDay(event.end)
                    : event.end,
                  addDays(endOfDay(now), 2),
                ]),
              },
              { in: tz(timeZone) },
            ).filter((date) => differenceInHours(event.end, date) > 2)) {
              const calName = date.toLocaleDateString("da-DK", {
                timeZone,
              });

              if (!memo[calName]) memo[calName] = [];
              memo[calName].push(event);
            }
            return memo;
          },
          {},
        ),
      ).map(([dayName, events], i) => (
        <FieldSetX key={i}>
          <legend>
            <big>{dayName}</big>
          </legend>
          <ul>
            {events.map((event, i) => {
              const duration = intervalToDuration(event);

              return (
                <li key={i} className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="font-semibold">
                      {event.datetype === "date-time" ? (
                        event.start.toLocaleTimeString("en-DK", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone,
                        })
                      ) : (
                        <>
                          Day{" "}
                          {eachDayOfInterval(event, { in: tz(timeZone) })
                            .filter(
                              (date) => differenceInHours(event.end, date) > 2,
                            )
                            .findIndex(
                              (date) =>
                                date.toLocaleDateString("da-DK", {
                                  timeZone,
                                }) === dayName,
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
                  <div className="max-w-64">
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
            })}
          </ul>
        </FieldSetX>
      ))}
    </FieldSetY>
  );
}
