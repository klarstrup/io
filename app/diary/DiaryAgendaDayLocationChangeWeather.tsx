"use client";
import { TZDate } from "@date-fns/tz";
import { isWithinInterval } from "date-fns";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import * as weatherIconsByCode from "../../components/weather-icons/index";
import { decodeGeohash, getSunrise, getSunset } from "../../utils";
import { getClosestTomorrowInterval } from "./actions";

export function DiaryAgendaDayLocationChangeWeather({
  date,
  geohash,
}: {
  date: Date;
  geohash?: string;
}) {
  const [weather, setWeather] = useState<Awaited<
    ReturnType<typeof getClosestTomorrowInterval>
  > | null>(null);

  const { data: session } = useSession();
  const user = session?.user;
  const userGeohash = user?.dataSources?.find(
    (source) => source.source === "tomorrow",
  )?.config.geohash;

  const finalGeohash = geohash || userGeohash;
  const memoDate = date.toISOString(); // avoid unnecessary re-fetches
  const userLocation = finalGeohash ? decodeGeohash(finalGeohash) : null;

  const sunrise = getSunrise(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    date as TZDate,
  );
  const sunset = getSunset(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    date as TZDate,
  );

  useEffect(() => {
    void getClosestTomorrowInterval(
      new Date(memoDate),
      decodeGeohash(finalGeohash || "u4pruyd"),
    )
      .then((interval) => {
        if (interval) setWeather(interval);
      })
      .catch((err: unknown) => {
        console.error("Error fetching weather:", err);
      });
  }, [memoDate, finalGeohash]);

  const extendedWeatherCode = weather
    ? `${weather.values.weatherCode}${Number(
        !isWithinInterval(weather.startTime, {
          start: sunrise,
          end: sunset,
        }),
      )}`
    : "0000";
  const dayWeatherCode = extendedWeatherCode.substring(0, 4) + "0";
  const weatherIcon =
    (extendedWeatherCode in weatherIconsByCode &&
      weatherIconsByCode[
        extendedWeatherCode as keyof typeof weatherIconsByCode
      ]) ||
    (dayWeatherCode in weatherIconsByCode &&
      weatherIconsByCode[dayWeatherCode as keyof typeof weatherIconsByCode]);

  return (
    <span className="inline-flex items-center gap-1">
      {weatherIcon ? (
        <Image
          src={weatherIcon}
          alt={prettyPrintWeatherCode(extendedWeatherCode)}
          title={prettyPrintWeatherCode(extendedWeatherCode) + " " + memoDate}
          width={20}
          className="align-middle"
        />
      ) : (
        extendedWeatherCode
      )}{" "}
      {Math.floor(weather?.values?.temperatureApparent ?? 0)}℃
      {weather &&
      weather?.values.precipitationProbability > 0 &&
      weather?.values.precipitationIntensity >= 0.2 ? (
        <div>
          <span className="align-middle text-lg">
            {weather?.values.precipitationIntensity.toFixed(2)}
          </span>
          <sup className="text-sm">mm</sup>
          <sub className="-ml-2 text-sm" title="Precipitation Probability">
            {weather?.values.precipitationProbability.toFixed(0)}%
          </sub>
        </div>
      ) : null}
    </span>
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
