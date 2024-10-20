import { TZDate } from "@date-fns/tz";
import { isWithinInterval } from "date-fns";
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
} from "../../utils";
import { DiaryAgendaEvents } from "./DiaryAgendaEvents";
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
        <DiaryAgendaEvents user={user} calendarEvents={calendarEvents} />
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
