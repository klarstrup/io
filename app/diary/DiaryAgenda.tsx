import { TZDate } from "@date-fns/tz";
import type { Session } from "next-auth";
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
import { DiaryAgendaWeather } from "./DiaryAgendaWeather";
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
      <DiaryAgendaWeather user={user} weatherIntervals={weatherIntervals} />
    </div>
  );
}
