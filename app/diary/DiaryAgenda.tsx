import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay, subDays } from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import type { DiaryEntry } from "../../lib";
import { getNextSets, Workouts } from "../../models/workout.server";
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

const getAllWorkoutLocations = async (user: Session["user"]) =>
  (
    await Workouts.distinct("location", {
      userId: user.id,
      deletedAt: { $exists: false },
    })
  ).filter((loc): loc is string => Boolean(loc));

const dateToString = (date: Date): `${number}-${number}-${number}` =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
export async function DiaryAgenda({
  date,
  diaryEntry,
  user,
}: {
  date: `${number}-${number}-${number}`;
  diaryEntry?: DiaryEntry;
  user: Session["user"];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const { food, workouts } = diaryEntry || {};

  const userLocation = user.geohash ? decodeGeohash(user.geohash) : null;
  const sunrise = getSunrise(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    new TZDate(date, timeZone),
  );
  const sunset = getSunset(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    new TZDate(date, timeZone),
  );

  const now = TZDate.tz(timeZone);
  const isToday =
    date === `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const [locations, nextSets] = await Promise.all([
    getAllWorkoutLocations(user),
    getNextSets({ user, to: startOfDay(new TZDate(date, timeZone)) }),
  ]);

  return (
    <div
      key={date}
      className="flex h-full max-h-full w-full max-w-full flex-col overflow-x-hidden overflow-y-scroll overscroll-contain bg-white p-2 shadow-lg shadow-slate-600"
    >
      <div className="flex-0 mb-2 ml-3 flex items-center justify-between gap-2 text-xl leading-none">
        {isToday ? <span>Today</span> : null}
        <span className="font-semibold">{date}</span>
        <span className="ml-2 whitespace-nowrap">
          ☀️
          {sunrise.toLocaleTimeString("en-DK", {
            hour: "numeric",
            minute: "2-digit",
          })}
          -
          {sunset.toLocaleTimeString("en-DK", {
            hour: "numeric",
            minute: "2-digit",
          })}
          🌙
        </span>
        <span>
          <Link href={`/diary/${dateToString(subDays(new Date(date), 1))}`}>
            ⬅️
          </Link>
          <Link href={`/diary`}>🗓️</Link>
          <Link href={`/diary/${dateToString(addDays(new Date(date), 1))}`}>
            ➡️
          </Link>
        </span>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        <div className="flex flex-1 flex-col">
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
