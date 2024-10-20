import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
  differenceInHours,
  eachDayOfInterval,
  endOfDay,
  intervalToDuration,
  isWithinInterval,
  max,
  min,
  startOfDay,
} from "date-fns";
import type { Session } from "next-auth";
import Image from "next/image";
import * as weatherIconsByCode from "../../components/weather-icons/index";
import type {
  DiaryEntry,
  MongoTomorrowInterval,
  MongoVEventWithVCalendar,
} from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import {
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
  roundToNearestDay,
} from "../../utils";
import { DiaryAgendaFood } from "./DiaryAgendaFood";
import { DiaryAgendaWorkouts } from "./DiaryAgendaWorkouts";

export function DiaryAgenda({
  diaryEntry,
  calendarEvents,
  user,
  locations,
  nextSets,
  weatherIntervals,
}: {
  diaryEntry: [`${number}-${number}-${number}`, DiaryEntry];
  calendarEvents: MongoVEventWithVCalendar[];
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  weatherIntervals?: MongoTomorrowInterval[];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const [date, { food, workouts }] = diaryEntry;

  const now = TZDate.tz(timeZone);
  const userLocation = user.geohash ? decodeGeohash(user.geohash) : null;
  const sunrise = getSunrise(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    now,
  );
  const sunset = getSunset(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    now,
  );

  return (
    <div
      key={date}
      className="flex max-w-full flex-col overflow-x-hidden rounded-3xl bg-white p-4 shadow-lg shadow-slate-600"
    >
      <div className="mb-2 ml-2 flex items-center">
        <div className="flex flex-1 leading-none">
          <big>
            <big>
              <big>
                <b>Today</b> <span className="text-base">{date}</span>
                <span className="ml-4 whitespace-nowrap text-xs">
                  Daylight:{" "}
                  {sunrise.toLocaleTimeString("en-DK", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone,
                  })}
                  -
                  {sunset.toLocaleTimeString("en-DK", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone,
                  })}
                </span>
              </big>
            </big>
          </big>
        </div>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        <div className="flex flex-[2] flex-col">
          <DiaryAgendaFood date={date} food={food} />
          <DiaryAgendaWorkouts
            date={date}
            workouts={workouts}
            user={user}
            locations={locations}
            nextSets={nextSets}
          />
        </div>
        {calendarEvents?.length ? (
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
                                    (date) =>
                                      differenceInHours(event.end, date) > 2,
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
        ) : null}
      </div>
      {weatherIntervals?.[0] && (
        <fieldset className="flex flex-1 flex-col rounded-lg border-x-0 border-y-4 border-gray-200 px-1 py-2">
          <legend className="ml-2">
            <big>Weather</big>
          </legend>
          <ul className="flex justify-around overflow-x-hidden">
            {weatherIntervals.map((interval, i) => {
              const extendedWeatherCode = `${interval.values.weatherCode}${
                isWithinInterval(new Date(interval.startTime), {
                  start: sunrise,
                  end: sunset,
                })
                  ? 0
                  : 1
              }`;
              const dayWeatherCode = extendedWeatherCode.substring(0, 4) + "0";
              const weatherIcon =
                (extendedWeatherCode in weatherIconsByCode &&
                  weatherIconsByCode[
                    extendedWeatherCode as keyof typeof weatherIconsByCode
                  ]) ||
                (dayWeatherCode in weatherIconsByCode &&
                  weatherIconsByCode[
                    dayWeatherCode as keyof typeof weatherIconsByCode
                  ]);
              return (
                <li key={i} className="flex flex-col items-center">
                  <div className="flex items-center">
                    <big className="text-lg font-bold">
                      {new TZDate(
                        interval.startTime,
                        timeZone,
                      ).toLocaleTimeString("en-DK", {
                        hour: "numeric",
                        timeZone,
                      })}
                    </big>
                    {weatherIcon ? (
                      <Image
                        src={weatherIcon}
                        alt={prettyPrintWeatherCode(extendedWeatherCode)}
                        title={prettyPrintWeatherCode(extendedWeatherCode)}
                        width={24}
                        className="align-middle"
                      />
                    ) : (
                      extendedWeatherCode
                    )}
                  </div>
                  <div>
                    <span className="align-middle text-lg">
                      {interval.values.temperatureApparent.toFixed(0)}
                    </span>
                    <sup className="text-base">c</sup>
                    <sub className="-ml-2 text-sm" title="Humidity">
                      {interval.values.humidity.toFixed(0)}%
                    </sub>{" "}
                  </div>
                  <div>
                    <span className="align-middle text-lg">
                      {interval.values.windSpeed.toFixed(0)}
                    </span>
                    <sup className="text-sm">m/s</sup>{" "}
                  </div>
                  {interval.values.precipitationProbability > 0 &&
                  interval.values.precipitationIntensity >= 0.2 ? (
                    <div>
                      <span className="align-middle text-lg">
                        {interval.values.precipitationIntensity.toFixed(2)}
                      </span>
                      <sup className="text-sm">mm</sup>
                      <sub
                        className="-ml-2 text-sm"
                        title="Precipitation Probability"
                      >
                        {interval.values.precipitationProbability.toFixed(0)}%
                      </sub>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
    </div>
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
