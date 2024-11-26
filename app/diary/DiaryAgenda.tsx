import { TZDate } from "@date-fns/tz";
import { addDays, subDays } from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { Suspense } from "react";
import { FieldSetY } from "../../components/FieldSet";
import {
  dateToString,
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
} from "../../utils";
import { DiaryAgendaEvents } from "./DiaryAgendaEvents";
import { DiaryAgendaFood } from "./DiaryAgendaFood";
import { DiaryAgendaWeather } from "./DiaryAgendaWeather";
import { DiaryAgendaWorkoutsWrapper } from "./DiaryAgendaWorkoutsWrapper";

export function DiaryAgenda({
  date,
  user,
  isModal,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
  isModal?: boolean;
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

  const isToday = date === dateToString(TZDate.tz(timeZone));

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
      <Suspense
        fallback={
          <FieldSetY
            className="flex-1"
            legend={<div className="flex items-center">Workouts</div>}
          />
        }
      >
        <DiaryAgendaWorkoutsWrapper date={date} user={user} />
      </Suspense>
      <div className="flex flex-1 flex-wrap gap-2">
        <Suspense
          fallback={
            <FieldSetY className="min-w-[250px] flex-1" legend="Events" />
          }
        >
          <DiaryAgendaEvents user={user} date={date} onlyGivenDay={isModal} />
        </Suspense>
        <div className="flex flex-1 flex-col">
          <Suspense
            fallback={
              <FieldSetY className="min-w-[250px] flex-[1]" legend={<>Food</>} />
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
            legend="Weather"
          />
        }
      >
        <DiaryAgendaWeather date={date} user={user} />
      </Suspense>
    </div>
  );
}
