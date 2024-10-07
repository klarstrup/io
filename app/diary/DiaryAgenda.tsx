"use client";
import { compareAsc, isWithinInterval } from "date-fns";
import type { Session } from "next-auth";
import Image, { StaticImageData } from "next/image";
import { useState } from "react";
import * as weatherIconsByCode from "../../components/weather-icons/index";
import type { DiaryEntry, TomorrowResponseTimelineInterval } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import { EntryAdder } from "./EntryAdder";
import { FoodEntry } from "./FoodEntry";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";

export function DiaryAgenda({
  diaryEntry,
  user,
  locations,
  nextSets,
  weatherIntervals,
  weatherDayInterval,
}: {
  diaryEntry: [`${number}-${number}-${number}`, DiaryEntry];
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  weatherIntervals?: TomorrowResponseTimelineInterval[];
  weatherDayInterval?: TomorrowResponseTimelineInterval;
}) {
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);

  const [date, { food, workouts }] = diaryEntry;

  const dayTotalEnergy = food?.reduce(
    (acc, foodEntry) => acc + foodEntry.nutritional_contents.energy.value,
    0
  );
  const dayTotalProtein = food?.reduce(
    (acc, foodEntry) => acc + (foodEntry.nutritional_contents.protein || 0),
    0
  );

  return (
    <div
      key={date}
      style={{
        boxShadow: "0 0 2em rgba(0, 0, 0, 0.6)",
        borderRadius: "1.5em",
        background: "white",
        display: "flex",
        flexDirection: "column",
        padding: "0.5em",
      }}
    >
      <div
        style={{
          marginBottom: "0.5em",
          marginLeft: "0.5em",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, lineHeight: 1, display: "flex" }}>
          <big>
            <big>
              <big>
                <b>Today</b> <span style={{ fontSize: "0.75em" }}>{date}</span>
              </big>
            </big>
          </big>
        </div>
        <EntryAdder
          diaryEntry={diaryEntry}
          user={user}
          onAddWorkout={() => setIsAddingWorkout(true)}
        />
      </div>
      <div
        style={{
          flex: "1",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1",
            display: "flex",
            flexDirection: "column",
            flexWrap: "wrap",
          }}
        >
          <fieldset
            style={{
              flex: "1",
              borderLeft: 0,
              borderRight: 0,
              borderTop: "0.25em solid #a0a0a0a0",
              paddingTop: "0.5em",
              borderBottom: "0.25em solid #a0a0a0a0",
              paddingBottom: "0.5em",
              borderRadius: "0.5em",
              paddingLeft: "0.25em",
              paddingRight: "0.25em",
            }}
          >
            <legend style={{ marginLeft: "0.5em" }}>
              <big>Food</big>{" "}
              {dayTotalEnergy && dayTotalProtein ? (
                <small>
                  {Math.round(dayTotalEnergy)} kcal,{" "}
                  {Math.round(dayTotalProtein)}g protein
                </small>
              ) : null}
            </legend>
            <FoodEntry foodEntries={food} />
          </fieldset>
          <fieldset
            style={{
              flex: "1",
              borderLeft: 0,
              borderRight: 0,
              borderTop: "0.25em solid #a0a0a0a0",
              paddingTop: "0.5em",
              borderBottom: "0.25em solid #a0a0a0a0",
              paddingBottom: "0.5em",
              borderRadius: "0.5em",
              paddingLeft: "0.25em",
              paddingRight: "0.25em",
            }}
          >
            <legend style={{ marginLeft: "0.5em" }}>
              <big>Workouts</big>
            </legend>
            {workouts?.length
              ? Array.from(workouts)
                  .sort((a, b) => compareAsc(a.workedOutAt, b.workedOutAt))
                  ?.map((workout) => (
                    <WorkoutEntry
                      key={workout._id}
                      user={user}
                      workout={workout}
                      locations={locations}
                      nextSets={nextSets}
                    />
                  ))
              : null}
            {isAddingWorkout ? (
              <fieldset>
                <legend>New workout</legend>
                <WorkoutForm
                  date={date}
                  user={user}
                  locations={locations}
                  nextSets={nextSets}
                  onClose={() => setIsAddingWorkout(false)}
                />
              </fieldset>
            ) : null}
          </fieldset>
        </div>
        {weatherIntervals?.[0] && (
          <fieldset
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "0.5em",
              borderLeft: 0,
              borderRight: 0,
              borderTop: "0.25em solid #a0a0a0a0",
              paddingTop: "0.5em",
              borderBottom: "0.25em solid #a0a0a0a0",
              paddingBottom: "0.5em",
              borderRadius: "0.5em",
              paddingLeft: "0.25em",
              paddingRight: "0.25em",
            }}
          >
            <legend style={{ marginLeft: "0.5em" }}>
              <big>Weather</big>
            </legend>
            {weatherDayInterval && (
              <div>
                Daylight:{" "}
                {new Date(
                  weatherDayInterval.values.sunriseTime
                ).toLocaleTimeString("en-DK", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Europe/Copenhagen",
                })}
                -
                {new Date(
                  weatherDayInterval.values.sunsetTime
                ).toLocaleTimeString("en-DK", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Europe/Copenhagen",
                })}
              </div>
            )}
            <ul
              style={{
                listStyleType: "none",
                paddingInlineStart: 0,
                marginBlockStart: 0,
                marginBlockEnd: 0,
              }}
            >
              {weatherIntervals.map((interval, i) => {
                const extendedWeatherCode = Number(
                  String(interval.values.weatherCode) +
                    String(
                      weatherDayInterval?.values.sunriseTime &&
                        weatherDayInterval?.values.sunsetTime &&
                        isWithinInterval(new Date(interval.startTime), {
                          start: new Date(
                            weatherDayInterval.values.sunriseTime
                          ),
                          end: new Date(weatherDayInterval.values.sunsetTime),
                        })
                        ? 0
                        : 1
                    )
                );
                const weatherIcon =
                  (extendedWeatherCode in weatherIconsByCode &&
                    (weatherIconsByCode[extendedWeatherCode] as
                      | StaticImageData
                      | undefined)) ||
                  (extendedWeatherCode.toString().substring(0, 4) + "0" in
                    weatherIconsByCode &&
                    (weatherIconsByCode[
                      extendedWeatherCode.toString().substring(0, 4) + "0"
                    ] as StaticImageData | undefined)) ||
                  null;
                return (
                  <li key={i}>
                    <big style={{ fontWeight: 800 }}>
                      {new Date(interval.startTime).toLocaleTimeString(
                        "en-DK",
                        {
                          hour: "numeric",
                          timeZone: "Europe/Copenhagen",
                        }
                      )}
                    </big>{" "}
                    {weatherIcon ? (
                      <Image
                        src={weatherIcon}
                        alt={prettyPrintWeatherCode(extendedWeatherCode)}
                        title={prettyPrintWeatherCode(extendedWeatherCode)}
                        width={24}
                        style={{ verticalAlign: "middle" }}
                      />
                    ) : (
                      extendedWeatherCode
                    )}{" "}
                    <span
                      style={{ fontSize: "1.4em", verticalAlign: "middle" }}
                    >
                      {interval.values.temperatureApparent.toFixed(1)}
                    </span>
                    <sup style={{ fontSize: "0.7em" }}>°C</sup>
                    <sub
                      style={{
                        fontSize: "0.7em",
                        marginLeft: "-14px",
                      }}
                    >
                      {interval.values.humidity.toFixed(0)}%
                    </sub>{" "}
                    {interval.values.windSpeed.toFixed(1)}
                    <sup style={{ fontSize: "0.7em" }}>m/s</sup>{" "}
                    {interval.values.precipitationProbability > 0 &&
                    interval.values.precipitationIntensity >= 0.2 ? (
                      <>
                        <span
                          style={{
                            fontSize: "1.4em",
                            verticalAlign: "middle",
                          }}
                        >
                          {interval.values.precipitationIntensity.toFixed(2)}
                        </span>
                        <sup style={{ fontSize: "0.7em" }}>mm</sup>
                        <sub
                          style={{
                            fontSize: "0.7em",
                            marginLeft: "-14px",
                          }}
                        >
                          {interval.values.precipitationProbability.toFixed(0)}%
                        </sub>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
      </div>
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
const prettyPrintWeatherCode = (code: number): string => {
  const truncatedCode = code.toString().slice(0, 4);

  if (truncatedCode in weatherCodes) {
    return weatherCodes[truncatedCode as unknown as keyof typeof weatherCodes];
  }

  return "Unknown";
};
