import { TZDate } from "@date-fns/tz";
import { isBefore, isPast } from "date-fns";
import Link from "next/link";
import { Suspense, useMemo } from "react";
import { FieldSetX } from "../../components/FieldSet";
import type { GQLocation, GQUser } from "../../graphql.generated/graphql";
import {
  dateToString,
  DEFAULT_TIMEZONE,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import { DiaryAgendaDayCreateExpander } from "./DiaryAgendaDayCreateExpander";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayDayAllDayEvents } from "./DiaryAgendaDayDayAllDayEvents";
import DiaryAgendaDayDayBacklog from "./DiaryAgendaDayDayBacklog";
import { DiaryAgendaDayDayContents } from "./DiaryAgendaDayDayContents";
import {
  getJournalEntryPrincipalDate,
  isEventEntireDay,
  type JournalEntry,
} from "./diaryUtils";

const getJournalEntryPassed = (journalEntry: JournalEntry, now: Date) => {
  const principalDate = getJournalEntryPrincipalDate(journalEntry);
  return isBefore(principalDate.end, now);
};

export function DiaryAgendaDayDay({
  now,
  date,
  dayRange,
  userTimeZone,
  dayLocations,
  dayJournalEntries,
  isSelectedDay,
  isLoadingEntries,
}: {
  now: Date;
  date: `${number}-${number}-${number}`;
  dayRange: { start: Date; end: Date };
  userTimeZone?: GQUser["timeZone"];
  dayLocations: GQLocation[];
  dayJournalEntries: JournalEntry[];
  isSelectedDay?: boolean;
  isLoadingEntries?: boolean;
}) {
  const timeZone = userTimeZone || DEFAULT_TIMEZONE;
  const todayStr = useMemo(
    () => dateToString(startOfDayButItRespectsDayStartHour(now)),
    [now],
  );
  const isToday = date === todayStr;

  const dayName = dateToString(dayRange.start);

  const allCompleted = dayJournalEntries.every((je) =>
    getJournalEntryPassed(je, now),
  );

  return (
    <div
      className={
        "flex flex-col items-center lg:h-full lg:w-[40vw] lg:max-w-xl lg:items-stretch"
      }
    >
      <div
        className={
          "relative z-5 mx-auto mt-1 -mb-px flex w-full max-w-lg items-center gap-1 pr-2 leading-normal transition-colors xl:max-w-none" +
          (isLoadingEntries ? " animate-pulse bg-blue-300!" : "")
        }
        style={{
          textShadow:
            "0 0 1px rgba(255,255,255,0.5),0 0 2px rgba(255,255,255,0.5),0 0 3px rgba(255,255,255,0.5),0 0 4px rgba(255,255,255,0.5),0 0 5px rgba(255,255,255,0.5),0 0 6px rgba(255,255,255,0.5)",
        }}
      >
        <Link
          href="/calendar"
          className={
            "w-8 text-right font-mono text-xs tracking-[-1px] text-gray-900/70 tabular-nums"
          }
        >
          {new TZDate(dayName, timeZone).toLocaleDateString("da-DK", {
            month: "numeric",
            day: "numeric",
          })}
        </Link>
        <Link href={`/diary/${dayName}`} className="font-bold">
          {isToday
            ? "Today"
            : new TZDate(dayName, timeZone).toLocaleDateString("en-DK", {
                weekday: "long",
              })}
        </Link>
        {todayStr === dayName ? null : (
          <DiaryAgendaDayCreateExpander
            inactiveButtonClassName={
              isPast(dayRange.end) ? "bg-green-200" : "bg-yellow-200"
            }
          >
            <DiaryAgendaDayCreateTodo date={dayRange.start} />
            {isPast(dayRange.start) ? (
              <>
                <Link
                  href={`/diary/${date}/workout`}
                  className={
                    "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold shadow-md shadow-black/30"
                  }
                >
                  <span className="text-xs opacity-25">➕</span> Workout
                </Link>
              </>
            ) : null}
            <span
              hidden
              className={
                "cursor-not-allowed rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-sm font-semibold text-black/25 shadow-md shadow-black/30"
              }
            >
              <span className="text-xs">➕</span> Event
            </span>
          </DiaryAgendaDayCreateExpander>
        )}
        <div className="w-2" />
        <Suspense>
          <DiaryAgendaDayDayAllDayEvents
            now={now}
            date={date}
            dayRange={dayRange}
            userTimeZone={userTimeZone}
            dayJournalEntries={dayJournalEntries.filter(
              (je) =>
                je.__typename === "Event" &&
                (isEventEntireDay(je, dayRange.start) ||
                  je.datetype === "date"),
            )}
            isSelectedDay={isSelectedDay}
          />
        </Suspense>
      </div>
      <FieldSetX
        legend={null}
        className={
          "diary-agenda-day-entry z-4 w-full border-0 backdrop-blur-sm " +
          "mx-auto mb-1 flex max-w-lg flex-0! flex-col items-stretch p-0 transition-colors lg:max-h-[calc(80vh-80px)] lg:overflow-x-hidden lg:overflow-y-auto xl:max-w-none " +
          (isSelectedDay
            ? "bg-white/90"
            : (isPast(dayRange.start) && allCompleted) || isPast(dayRange.end)
              ? "bg-green-100/75"
              : isToday
                ? "bg-yellow-200/75"
                : "bg-slate-100/75") +
          (isLoadingEntries ? " animate-pulse bg-blue-300!" : "")
        }
        style={{
          boxShadow:
            "0 0 16px #edab00, 0 0 8px #edab00, 0 0 4px #edab00, 0 0 4px #edab00, 0 0 20vmax rgba(0, 0, 0, 0.5), 0 0 1px rgba(0, 0, 0, 1)",
        }}
      >
        <Suspense
          fallback={
            <div className={"pl-10 text-gray-400/50 italic"}>Loading...</div>
          }
        >
          <DiaryAgendaDayDayContents
            now={now}
            date={date}
            dayRange={dayRange}
            dayLocations={dayLocations}
            userTimeZone={userTimeZone}
            dayJournalEntries={dayJournalEntries.filter(
              (je) =>
                je.__typename !== "Event" ||
                !isEventEntireDay(je, dayRange.start) ||
                je.datetype !== "date",
            )}
            isSelectedDay={isSelectedDay}
          />
        </Suspense>
      </FieldSetX>
      {isToday ? <DiaryAgendaDayDayBacklog dayRange={dayRange} /> : null}
    </div>
  );
}
