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
import type { MongoVEventWithVCalendar } from "../../lib";
import { DEFAULT_TIMEZONE, roundToNearestDay } from "../../utils";

export function DiaryAgendaEvents({
  calendarEvents,
  user,
}: {
  calendarEvents: MongoVEventWithVCalendar[];
  user: Session["user"];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const now = TZDate.tz(timeZone);

  return (
    <fieldset className="flex flex-1 flex-col rounded-lg border-x-0 border-y-4 border-gray-200 px-1 py-2">
      <legend className="ml-2">
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
        <fieldset
          key={i}
          className="flex-1 rounded-lg border-x-4 border-y-0 border-gray-200 px-2 py-1"
        >
          <legend className="ml-2">
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
        </fieldset>
      ))}
    </fieldset>
  );
}

const weatherCodes = {
  0: "Unknown",
  1000: "Clear",
  1001: "Cloudy",
  1100: "Mostly Clear",
  1101: "Partly Cloudy",
  1102: "Mostly Cloudy",
  2000: "Fog",
  2100: "Light Fog",
  3000: "Light Wind",
  3001: "Wind",
  3002: "Strong Wind",
  4000: "Drizzle",
  4001: "Rain",
  4200: "Light Rain",
  4201: "Heavy Rain",
  5000: "Snow",
  5001: "Flurries",
  5100: "Light Snow",
  5101: "Heavy Snow",
  6000: "Freezing Drizzle",
  6001: "Freezing Rain",
  6200: "Light Freezing Rain",
  6201: "Heavy Freezing Rain",
  7000: "Ice Pellets",
  7101: "Heavy Ice Pellets",
  7102: "Light Ice Pellets",
  8000: "Thunderstorm",
} as const;
const prettyPrintWeatherCode = (code: string) => {
  const truncatedCode = code.slice(0, 4);

  if (truncatedCode in weatherCodes) {
    return weatherCodes[truncatedCode as unknown as keyof typeof weatherCodes];
  }

  return "Unknown";
};
