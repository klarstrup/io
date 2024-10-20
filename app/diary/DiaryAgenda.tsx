import { TZDate } from "@date-fns/tz";
import type { Session } from "next-auth";
import type { DiaryEntry } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import {
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
} from "../../utils";
import { DiaryAgendaEvents } from "./DiaryAgendaEvents";
import { DiaryAgendaFood } from "./DiaryAgendaFood";
import { DiaryAgendaWeather } from "./DiaryAgendaWeather";
import { DiaryAgendaWorkouts } from "./DiaryAgendaWorkouts";

export function DiaryAgenda({
  date,
  diaryEntry,
  user,
  locations,
  nextSets,
}: {
  date: `${number}-${number}-${number}`;
  diaryEntry?: DiaryEntry;
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const { food, workouts } = diaryEntry || {};

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

  const isToday =
    date === `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  return (
    <div
      key={date}
      className="flex max-w-full flex-col overflow-x-hidden rounded-3xl bg-white p-4 shadow-lg shadow-slate-600"
    >
      <div className="mb-2 ml-3 flex items-center gap-2 leading-none">
        {isToday ? <span className="text-xl">Today</span> : null}
        <span className="text-xl font-semibold">{date}</span>
        <span className="ml-2 whitespace-nowrap text-xs">
          ☀️
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
          🌙
        </span>
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
        {isToday ? <DiaryAgendaEvents user={user} /> : null}
      </div>
      {isToday ? <DiaryAgendaWeather user={user} /> : null}
    </div>
  );
}
