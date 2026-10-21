"use client";
import { addSeconds } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { dateMidpoint, dateToString, type cotemporality } from "../../utils";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { NowDividerEntry } from "./diaryUtils";

export function DiaryAgendaDayNow({
  date,
  cotemporalityOfSurroundingEvent,
  now,
  nextEntryDate,
  timeZone,
  className,
}: {
  date?: `${number}-${number}-${number}`;
  cotemporalityOfSurroundingEvent: ReturnType<typeof cotemporality> | null;
  now: Date;
  nextEntryDate: Date | null;
  timeZone: string;
  className?: string;
}) {
  const iconTxt = useMemo(
    () => <span className="text-[10px] font-bold text-[#EDAB00]">NOW</span>,
    [],
  );

  const entry = useMemo(
    () =>
      ({
        __typename: "NowDivider",
        id: "now-divider",
        start: now,
        end: now,
      }) satisfies NowDividerEntry,
    [now],
  );

  const newTodoDate = useMemo(
    () =>
      nextEntryDate ? dateMidpoint(nextEntryDate, now) : addSeconds(now, 69),
    [nextEntryDate, now],
  );

  return (
    <DiaryAgendaDayEntry
      date={now}
      entry={entry}
      userTimeZone={timeZone}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      iconTxt={iconTxt}
      cotemporality="current"
      className={twMerge("now-divider pt-0.5 pb-1.5", className)}
      contentClassName="gap-2"
    >
      <DiaryAgendaDayCreateTodo date={newTodoDate} />
      <Link
        href={`/diary/${date ?? dateToString(now)}/workout`}
        className={
          "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold shadow-md shadow-black/30"
        }
      >
        <span className="text-xs">➕</span> Workout
      </Link>
      <span
        hidden
        className={
          "cursor-not-allowed rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-sm font-semibold text-black/25 shadow-md shadow-black/30"
        }
      >
        <span className="text-xs">➕</span> Event
      </span>
      <span>
        {now.toLocaleTimeString("en-DK", {
          hour: "numeric",
          minute: "2-digit",
          timeZone,
        })}
      </span>
    </DiaryAgendaDayEntry>
  );
}
