"use client";
import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import { faBed, faBedPulse } from "@fortawesome/free-solid-svg-icons";
import type { Interval } from "date-fns";
import { intervalToDuration } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { GQSleep, GQUser } from "../../graphql.generated/graphql";
import { formatShortDuration } from "../../models/workout";
import { cotemporality, DEFAULT_TIMEZONE } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import type { WithOrWithoutSeparatedEnd } from "./diaryUtils";
import { getJournalEntryPrincipalDate, isSeparatedEnd } from "./diaryUtils";

export default function DiaryAgendaDaySleep({
  sleep,
  userTimeZone,
  principalDate,
  cotemporalityOfSurroundingEvent,
  hasSeparatedEnd,
}: {
  sleep: WithOrWithoutSeparatedEnd<GQSleep>;
  userTimeZone: GQUser["timeZone"];
  principalDate?: ReturnType<typeof getJournalEntryPrincipalDate>;
  cotemporalityOfSurroundingEvent?: "current" | "past" | "future" | null;
  hasSeparatedEnd?: boolean;
}) {
  const client = useApolloClient();
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id:
      (isSeparatedEnd(sleep) ? "end-of-" : "") +
      (client.cache.identify(sleep) || sleep.id),
    data: {
      event: sleep,
      date: isSeparatedEnd(sleep) ? sleep.endedAt : sleep.startedAt,
    },
    disabled: true,
  });

  const router = useRouter();
  const duration = intervalToDuration({
    start: 0,
    end: sleep.totalSleepTime * 1000,
  });

  const timeZone = userTimeZone || DEFAULT_TIMEZONE;

  const handleOnClick = useCallback(() => {
    router.push(`/diary/entries/${sleep.__typename}:${sleep.id}`);
  }, [router, sleep.__typename, sleep.id]);

  const isSleepEnd = isSeparatedEnd(sleep);

  const style = useMemo(
    () => ({
      transition,
      ...(transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 5,
          }
        : undefined),
      ...(isDragging ? { zIndex: 10 } : {}),
    }),
    [isDragging, transform, transition],
  );

  return (
    <DiaryAgendaDayEntry
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      // TODO: smarter way of determining if it's waking up or going to sleep
      icon={isSleepEnd ? faBedPulse : faBed}
      cotemporality={cotemporality(principalDate as Interval<Date, Date>)}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      isEventWithSeparatedEnd={hasSeparatedEnd}
      isEventEnd={isSleepEnd}
      key={sleep.id}
      id={sleep.id}
      __typename={sleep.__typename}
      onClick={handleOnClick}
      className={"cursor-pointer"}
    >
      <div className="relative flex items-center gap-1.5 leading-snug">
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
