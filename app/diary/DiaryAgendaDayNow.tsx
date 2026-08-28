import Link from "next/link";
import { useMemo } from "react";
import { useIsSSR } from "../../hooks/useIsSSR";
import type { cotemporality } from "../../utils";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { NowDividerEntry } from "./diaryUtils";

export function DiaryAgendaDayNow({
  date,
  cotemporalityOfSurroundingEvent,
  now,
}: {
  date: `${number}-${number}-${number}`;
  cotemporalityOfSurroundingEvent: ReturnType<typeof cotemporality> | null;
  now: Date;
}) {
  const isSSR = useIsSSR();

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

  return (
    <DiaryAgendaDayEntry
      date={now}
      entry={entry}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      iconTxt={iconTxt}
      cotemporality="current"
      className="now-divider pt-0.5 pb-1.5"
      contentClassName="gap-2"
    >
      <DiaryAgendaDayCreateTodo date={new Date()} />
      <Link
        href={`/diary/${date}/workout`}
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
      {!isSSR ? (
        <span>
          {now.toLocaleTimeString("en-DK", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      ) : null}
    </DiaryAgendaDayEntry>
  );
}
