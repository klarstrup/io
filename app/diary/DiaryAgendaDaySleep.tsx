"use client";
import { faBed, faBedPulse } from "@fortawesome/free-solid-svg-icons";
import { type Interval, intervalToDuration } from "date-fns";
import { useCallback, useRef, useState } from "react";
import SourceWidget from "../../components/SourceWidget";
import type { GQSleep, GQUser } from "../../graphql.generated";
import { useClickOutside } from "../../hooks";
import { formatShortDuration } from "../../models/workout";
import { DataSource } from "../../sources/utils";
import { cotemporality, DEFAULT_TIMEZONE } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export default function DiaryAgendaDaySleep({
  sleep,
  userTimeZone,
  principalDate,
  cotemporalityOfSurroundingEvent,
}: {
  sleep: GQSleep | (GQSleep & { _this_is_the_end_of_a_sleep: true });
  userTimeZone: GQUser["timeZone"];
  principalDate?: ReturnType<typeof getJournalEntryPrincipalDate>;
  cotemporalityOfSurroundingEvent?: "current" | "past" | "future" | null;
}) {
  const duration = intervalToDuration({
    start: 0,
    end: sleep.totalSleepTime * 1000,
  });

  const timeZone = userTimeZone || DEFAULT_TIMEZONE;

  const [isOpen, setIsOpen] = useState(false);
  const onClickOutside = () => setIsOpen(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClickOutside);

  const handleOnClick = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  const isSleepEnd =
    "_this_is_the_end_of_a_sleep" in sleep && sleep._this_is_the_end_of_a_sleep;

  return (
    <DiaryAgendaDayEntry
      // TODO: smarter way of determining if it's waking up or going to sleep
      icon={isSleepEnd ? faBedPulse : faBed}
      cotemporality={cotemporality(principalDate as Interval<Date, Date>)}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      key={sleep.id}
      ref={ref}
      onClick={handleOnClick}
      className={"cursor-pointer" + (isOpen ? " bg-gray-100" : "")}
    >
      <div className="relative flex items-center gap-1.5 leading-snug">
        {/* Show source widget if open */}
        {isOpen ? (
          <div className="absolute top-full left-1/2 z-10 mt-2 w-max -translate-x-1/2 rounded border bg-white p-2 shadow">
            <SourceWidget dataSource={DataSource.Withings} />
          </div>
        ) : null}
        <div className="text-center font-semibold tabular-nums">
          {!isSleepEnd
            ? new Date(sleep.startedAt).toLocaleTimeString("en-DK", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone,
              })
            : new Date(sleep.endedAt).toLocaleTimeString("en-DK", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone,
              })}
        </div>{" "}
        <div className="flex items-baseline gap-2">
          {!isSleepEnd ? <span>Went to bed</span> : <span>Got out of bed</span>}
          {isSleepEnd ? (
            <span className="text-[0.666rem] whitespace-nowrap tabular-nums opacity-50">
              {duration ? <>{formatShortDuration(duration)} slept</> : null}
            </span>
          ) : null}
        </div>
      </div>
    </DiaryAgendaDayEntry>
  );
}
