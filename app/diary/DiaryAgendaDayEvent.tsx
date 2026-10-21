"use client";
import { TZDate } from "@date-fns/tz";
import { faCalendar as faCalendarAlt } from "@fortawesome/free-regular-svg-icons";
import {
  faCalendar,
  faCalendarCheck,
  faExternalLink,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  differenceInDays,
  intervalToDuration,
  isBefore,
  roundToNearestMinutes,
} from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { twMerge } from "tailwind-merge";
import type { GQEvent, GQUser } from "../../graphql.generated/graphql";
import { durationToMs, formatShortDuration } from "../../models/workout";
import {
  cotemporality,
  DEFAULT_TIMEZONE,
  endOfDayButItRespectsDayStartHour,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate, isSeparatedEnd } from "./diaryUtils";

export function DiaryAgendaDayEvent({
  date,
  dayRange,
  userTimeZone,
  event,
  isEntryWithSeparatedEnd,
  cotemporalityOfSurroundingEvent,
  className,
}: {
  date?: `${number}-${number}-${number}`;
  dayRange?: { start: Date; end: Date };
  userTimeZone: GQUser["timeZone"];
  event: GQEvent;
  isEntryWithSeparatedEnd?: boolean;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
  className?: string;
}) {
  const router = useRouter();
  const timeZone = userTimeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);

  const isPassed = isBefore(event.end, now);

  const duration = intervalToDuration({
    start: event.start,
    end: roundToNearestMinutes(event.end, { roundingMethod: "ceil" }),
  });
  const startOfEventDay = startOfDayButItRespectsDayStartHour(event.start);
  const dayNo =
    date && dayRange && differenceInDays(dayRange.start, startOfEventDay) + 1;
  const numDays =
    differenceInDays(
      endOfDayButItRespectsDayStartHour(event.end),
      startOfEventDay,
    ) + 1;
  const isFirstDay = dayNo === 1;
  const isLastDay = dayNo === numDays;

  const durationInHours = durationToMs(duration) / 1000 / 60 / 60;

  const handleOnClick = useCallback(() => {
    router.push(`/diary/entries/${event.__typename}:${event.id}`);
  }, [router, event.__typename, event.id]);

  const isEntryEnd = isSeparatedEnd(event);

  return (
    <DiaryAgendaDayEntry
      date={
        isEntryEnd
          ? getJournalEntryPrincipalDate(event).end
          : getJournalEntryPrincipalDate(event).start
      }
      userTimeZone={timeZone}
      entry={event}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      isEntryWithSeparatedEnd={isEntryWithSeparatedEnd}
      icon={
        isPassed
          ? faCalendarCheck
          : event.transparency === "TRANSPARENT"
            ? faCalendarAlt
            : faCalendar
      }
      cotemporality={cotemporality(event)}
      contentClassName="flex items-center gap-1.5 leading-none"
      onClick={handleOnClick}
      className={twMerge("cursor-pointer", className)}
    >
      {isEntryEnd ? (
        <>
          <div className="text-center font-semibold tabular-nums">
            {roundToNearestMinutes(event.end).toLocaleTimeString("en-DK", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone,
            })}
          </div>
          <div className="leading-tight">{event.summary}</div>
        </>
      ) : (
        <>
          <div className="text-center leading-none font-semibold tabular-nums">
            {event.start.toLocaleTimeString("en-DK", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone,
            })}
          </div>
          <div>
            <span
              style={{
                fontSize: !isEntryWithSeparatedEnd
                  ? `${16 + durationInHours * 1.25}px`
                  : undefined,
                fontWeight: !isEntryWithSeparatedEnd
                  ? durationInHours >= 18
                    ? 800
                    : durationInHours >= 14
                      ? 700
                      : durationInHours >= 10
                        ? 600
                        : durationInHours >= 6
                          ? 500
                          : durationInHours >= 2
                            ? 400
                            : 300
                  : undefined,
              }}
            >
              {event.summary}
            </span>
            &nbsp;
            <span className="text-[0.666rem] whitespace-nowrap text-stone-500 tabular-nums">
              {isFirstDay && duration ? (
                formatShortDuration(duration)
              ) : isLastDay ? (
                <>
                  -
                  {event.end.toLocaleTimeString("en-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone,
                  })}
                </>
              ) : null}
            </span>
            &nbsp;
            {event.url ? (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.666rem] text-[#edab00] hover:text-[#edab00]/80"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent the click from propagating to the parent div and triggering the onClick handler
                }}
              >
                <FontAwesomeIcon icon={faExternalLink} />
              </a>
            ) : null}
          </div>
        </>
      )}
    </DiaryAgendaDayEntry>
  );
}
