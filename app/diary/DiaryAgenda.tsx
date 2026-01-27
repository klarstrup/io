import { TZDate } from "@date-fns/tz";
import { addDays, isFuture, subDays } from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { Suspense } from "react";
import { FieldSetY } from "../../components/FieldSet";
import { DataSource } from "../../sources/utils";
import {
  dateToString,
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
} from "../../utils";
import { DiaryAgendaFood } from "./DiaryAgendaFood";
import { DiaryAgendaWeather } from "./DiaryAgendaWeather";
import { DiaryAgendaWorkoutsWrapper } from "./DiaryAgendaWorkoutsWrapper";

export function DiaryAgenda({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user?: Session["user"];
}) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);

  const userGeohash = user?.dataSources?.find(
    (source) => source.source === DataSource.Tomorrow,
  )?.config?.geohash;
  const userLocation = userGeohash ? decodeGeohash(userGeohash) : null;
  const sunrise = getSunrise(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    tzDate,
  );
  const sunset = getSunset(
    userLocation?.latitude ?? 55.658693,
    userLocation?.longitude ?? 12.489322,
    tzDate,
  );

  const isToday = date === dateToString(TZDate.tz(timeZone));

  return (
    <div key={date} className="flex h-full flex-col">
      <div className="mb-2 ml-3 flex flex-0 items-center justify-between gap-1 text-lg leading-none">
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
            href={`/diary/${dateToString(subDays(tzDate, 1))}`}
          >
            ⬅️
          </Link>
          <Link prefetch={false} href={`/diary`}>
            🗓️
          </Link>
          {!(isToday || isFuture(tzDate)) ? (
            <Link
              prefetch={false}
              href={`/diary/${dateToString(addDays(tzDate, 1))}`}
            >
              ➡️
            </Link>
          ) : null}
        </span>
      </div>
      <Suspense
        fallback={
          <FieldSetY
            className="flex-1"
            legend={<div className="flex items-center gap-2">Workouts</div>}
          />
        }
      >
        <DiaryAgendaWorkoutsWrapper date={date} user={user} />
      </Suspense>
      <div className="flex flex-1 flex-wrap gap-2">
        <div className="flex flex-1 flex-col">
          <Suspense
            fallback={
              <FieldSetY
                className="flex-1"
                legend={<div className="flex items-center gap-2">Food</div>}
              />
            }
          >
            <DiaryAgendaFood date={date} user={user} />
          </Suspense>
        </div>
      </div>
      <Suspense
        fallback={
          <FieldSetY
            className="flex min-h-32 flex-none flex-col"
            legend={<div className="flex items-center gap-2">Weather</div>}
          />
        }
      >
        <DiaryAgendaWeather date={date} user={user} />
      </Suspense>
    </div>
  );
}
