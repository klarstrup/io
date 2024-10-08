"use client";
import { TZDate } from "@date-fns/tz";
import {
  compareAsc,
  differenceInDays,
  formatDistance,
  isWithinInterval,
} from "date-fns";
import type { Session } from "next-auth";
import Image, { type StaticImageData } from "next/image";
import type { VCalendar, VEvent } from "node-ical";
import { useState } from "react";
import * as weatherIconsByCode from "../../components/weather-icons/index";
import type { DiaryEntry, TomorrowResponseTimelineInterval } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import { EntryAdder } from "./EntryAdder";
import { FoodEntry } from "./FoodEntry";
import { NextSets } from "./NextSets";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";

export function DiaryAgenda({
  diaryEntry,
  calendarEvents,
  user,
  locations,
  nextSets,
  weatherIntervals,
  weatherDayInterval,
}: {
  diaryEntry: [`${number}-${number}-${number}`, DiaryEntry];
  calendarEvents: [VCalendar, VEvent[]][];
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

  const dueSets = nextSets?.filter(
    (nextSet) => differenceInDays(new Date(), nextSet.workedOutAt) > 2
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
                <span
                  style={{
                    fontSize: "0.5em",
                    marginLeft: "1em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {weatherDayInterval && (
                    <>
                      Daylight:{" "}
                      {new TZDate(
                        weatherDayInterval.values.sunriseTime,
                        "Europe/Copenhagen"
                      ).toLocaleTimeString("en-DK", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Europe/Copenhagen",
                      })}
                      -
                      {new TZDate(
                        weatherDayInterval.values.sunsetTime,
                        "Europe/Copenhagen"
                      ).toLocaleTimeString("en-DK", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Europe/Copenhagen",
                      })}
                    </>
                  )}
                </span>
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
          flex: 1,
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <fieldset
            style={{
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
            {food ? (
              <FoodEntry foodEntries={food} />
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  flexDirection: "column",
                }}
              >
                <p style={{ marginTop: 0 }}>No food logged</p>
                <div>
                  <button
                    onClick={() => {
                      window.open(
                        `https://www.myfitnesspal.com/food/diary?date=${date}`
                      );
                    }}
                    style={{
                      fontSize: "1.25em",
                      padding: "0.5em 0.75em",
                      paddingRight: "1em",
                      borderRadius: "1em",
                      border: "none",
                      background: "#ff0",
                      textAlign: "center",
                      fontWeight: 600,
                      cursor: "pointer",
                      marginBottom: "1em",
                    }}
                  >
                    ➕ Food
                  </button>
                </div>
              </div>
            )}
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
            {isAddingWorkout ? null : workouts?.length ? (
              Array.from(workouts)
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
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "center",
                  height: "100%",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                  }}
                >
                  <p style={{ marginTop: 0 }}>No workout logged </p>
                  <div>
                    <button
                      onClick={() => setIsAddingWorkout(true)}
                      style={{
                        fontSize: "1.25em",
                        padding: "0.5em 0.75em",
                        paddingRight: "1em",
                        borderRadius: "1em",
                        border: "none",
                        background: "#ff0",
                        textAlign: "center",
                        fontWeight: 600,
                        cursor: "pointer",
                        marginBottom: "1em",
                      }}
                    >
                      ➕ Workout
                    </button>
                  </div>
                </div>
                {dueSets?.length ? (
                  <div>
                    <b>Due Sets:</b>
                    <NextSets nextSets={dueSets} />
                  </div>
                ) : null}
              </div>
            )}
            {isAddingWorkout ? (
              <fieldset style={{ width: "100%" }}>
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
        {calendarEvents?.length ? (
          <fieldset
            style={{
              flex: 1,
              borderLeft: 0,
              borderRight: 0,
              borderTop: "0.25em solid #a0a0a0a0",
              paddingTop: "0.5em",
              borderBottom: "0.25em solid #a0a0a0a0",
              paddingBottom: "0.5em",
              borderRadius: "0.5em",
              paddingLeft: "0.25em",
              paddingRight: "0.25em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <legend style={{ marginLeft: "0.5em" }}>
              <big>Events</big>
            </legend>
            {calendarEvents.map(([calendar, events], i) => (
              <fieldset
                key={i}
                style={{
                  flex: 1,
                  borderTop: 0,
                  borderBottom: 0,
                  borderLeft: "0.25em solid #a0a0a0a0",
                  paddingLeft: "0.5em",
                  borderRight: "0.25em solid #a0a0a0a0",
                  paddingRight: "0.5em",
                  borderRadius: "0.5em",
                  paddingTop: "0.25em",
                  paddingBottom: "0.25em",
                }}
              >
                <legend style={{ marginLeft: "0.5em" }}>
                  <big>{calendar["WR-CALNAME"]}</big>
                </legend>
                <ul
                  style={{
                    listStyleType: "none",
                    paddingInlineStart: 0,
                    marginBlockStart: 0,
                    marginBlockEnd: 0,
                  }}
                >
                  {Object.entries(
                    events
                      .sort((a, b) => compareAsc(a.start, b.start))
                      .reduce((acc, event) => {
                        const weekday = new Date(
                          event.start
                        ).toLocaleDateString("en-DK", {
                          weekday: "short",
                          timeZone: "Europe/Copenhagen",
                        });
                        if (!acc[weekday]) acc[weekday] = [];
                        acc[weekday].push(event);
                        return acc;
                      }, [] as unknown as Record<string, VEvent[]>)
                  ).map(([weekday, events]) => (
                    <li key={i}>
                      <big>{weekday} </big>
                      <ul
                        style={{
                          listStyleType: "none",
                          paddingInlineStart: 0,
                          marginBlockStart: 0,
                          marginBlockEnd: 0,
                        }}
                      >
                        {events.map((event, i) => (
                          <li key={i}>
                            <big style={{ fontWeight: 800 }}>
                              {event.datetype === "date-time"
                                ? new Date(event.start).toLocaleTimeString(
                                    "en-DK",
                                    {
                                      hour: "numeric",
                                      timeZone: "Europe/Copenhagen",
                                    }
                                  )
                                : null}
                            </big>{" "}
                            {event.summary}{" "}
                            {event.datetype === "date" ? (
                              <small>
                                ({formatDistance(event.start, event.end)})
                              </small>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ))}
          </fieldset>
        ) : null}
        {weatherIntervals?.[0] && (
          <fieldset
            style={{
              flex: 1,
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
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <big style={{ fontWeight: 800 }}>
                      {new TZDate(
                        interval.startTime,
                        "Europe/Copenhagen"
                      ).toLocaleTimeString("en-DK", {
                        hour: "numeric",
                        timeZone: "Europe/Copenhagen",
                      })}
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
                    <div>
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
                    </div>
                    <div>
                      {interval.values.windSpeed.toFixed(1)}
                      <sup style={{ fontSize: "0.7em" }}>m/s</sup>{" "}
                    </div>
                    {interval.values.precipitationProbability > 0 &&
                    interval.values.precipitationIntensity >= 0.2 ? (
                      <div>
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
                      </div>
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
