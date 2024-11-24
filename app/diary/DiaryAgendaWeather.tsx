import { TZDate } from "@date-fns/tz";
import { addHours, isWithinInterval } from "date-fns";
import type { Session } from "next-auth";
import Image from "next/image";
import { FieldSetY } from "../../components/FieldSet";
import * as weatherIconsByCode from "../../components/weather-icons/index";
import { getTomorrowForecasts } from "../../sources/tomorrow";
import {
  dateToString,
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
} from "../../utils";

export async function DiaryAgendaWeather({
  user,
  date,
}: {
  user: Session["user"];
  date: `${number}-${number}-${number}`;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const now = TZDate.tz(timeZone);
  const tzDate = new TZDate(date, timeZone);
  const isToday = date === dateToString(now);
  const userLocation = user.geohash ? decodeGeohash(user.geohash) : null;

  const weatherIntervals =
    (await getTomorrowForecasts({
      geohash: user.geohash,
      start: isToday ? now : tzDate,
      end: addHours(isToday ? now : tzDate, 12),
    })) ?? [];

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
    <FieldSetY className="flex flex-none flex-col min-h-32" legend="Weather">
      <ul className="flex justify-around overflow-x-hidden">
        {weatherIntervals?.map((interval, i) => {
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
                  {new TZDate(interval.startTime, timeZone).toLocaleTimeString(
                    "en-DK",
                    {
                      hour: "numeric",
                      timeZone,
                    },
                  )}
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
    </FieldSetY>
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
