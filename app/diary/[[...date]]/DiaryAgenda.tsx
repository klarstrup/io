import { TZDate } from "@date-fns/tz";
import { addDays, subDays } from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { Suspense } from "react";
import { FieldSetY } from "../../../components/FieldSet";
import {
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
} from "../../../utils";
import { DiaryAgendaEvents } from "./DiaryAgendaEvents";
import { DiaryAgendaFood } from "./DiaryAgendaFood";
import { DiaryAgendaWeather } from "./DiaryAgendaWeather";
import { DiaryAgendaWorkoutsWrapper } from "./DiaryAgendaWorkoutsWrapper";

const dateToString = (date: Date): `${number}-${number}-${number}` =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
export function DiaryAgenda({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

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

  return (
    <div
      key={date}
      className="flex h-full max-h-full w-full max-w-full flex-col overflow-x-hidden overflow-y-scroll overscroll-contain bg-white p-2"
    >
      <div className="flex-0 mb-2 ml-3 flex items-center justify-between gap-1 text-lg leading-none">
        {isToday ? <span>Today</span> : null}
        <span className={"font-semibold " + isToday ? "text-sm" : ""}>
          {date}
        </span>
        <span className="ml-2 whitespace-nowrap">
          ☀️
          <small>
            {sunrise.toLocaleTimeString("en-DK", {
              hour: "numeric",
              minute: "2-digit",
            })}
            -
            {sunset.toLocaleTimeString("en-DK", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </small>
          🌙
        </span>
        <span className="whitespace-nowrap">
          <Link
            prefetch={false}
            href={`/diary/${dateToString(subDays(new Date(date), 1))}`}
          >
            ⬅️
          </Link>
          <Link prefetch={false} href={`/diary`}>
            🗓️
          </Link>
          <Link
            prefetch={false}
            href={`/diary/${dateToString(addDays(new Date(date), 1))}`}
          >
            ➡️
          </Link>
        </span>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {isToday ? (
          <Suspense
            fallback={
              <FieldSetY className="flex flex-1 flex-col" legend="Events" />
            }
          >
            <DiaryAgendaEvents user={user} />
          </Suspense>
        ) : null}
        <div className="flex flex-1 flex-col">
          <Suspense
            fallback={
              <FieldSetY className="flex flex-1 flex-col" legend="Workouts" />
            }
          >
            <DiaryAgendaWorkoutsWrapper date={date} user={user} />
          </Suspense>
          <Suspense
            fallback={
              <FieldSetY className="flex flex-1 flex-col" legend="Food" />
            }
          >
            <DiaryAgendaFood date={date} user={user} />
          </Suspense>
        </div>
      </div>
      {isToday ? (
        <Suspense
          fallback={
            <FieldSetY className="flex flex-1 flex-col" legend="Weather" />
          }
        >
          <DiaryAgendaWeather user={user} />
        </Suspense>
      ) : null}
    </div>
  );
}
