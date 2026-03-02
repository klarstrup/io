import { useApolloClient } from "@apollo/client/react";
import { TZDate } from "@date-fns/tz";
import { useSortable } from "@dnd-kit/sortable";
import {
  faCalendar,
  faCalendarCheck,
  faExternalLink,
} from "@fortawesome/free-solid-svg-icons";
import {
  addHours,
  differenceInDays,
  intervalToDuration,
  isBefore,
  roundToNearestMinutes,
  startOfDay,
} from "date-fns";
import { useMemo } from "react";
import type { GQEvent, GQUser } from "../../graphql.generated";
import { formatShortDuration } from "../../models/workout";
import {
  cotemporality,
  dayStartHour,
  DEFAULT_TIMEZONE,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getTodoPrincipalDate } from "./diaryUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function DiaryAgendaDayEvent({
  dayDate,
  userTimeZone,
  event,
  isEventWithSeparatedEnd,
  cotemporalityOfSurroundingEvent,
  isEventEnd,
}: {
  dayDate: Date;
  userTimeZone?: GQUser["timeZone"];
  event: GQEvent;
  isEventWithSeparatedEnd?: boolean;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
  isEventEnd?: boolean;
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
    id: client.cache.identify(event) || event.id,
    data: { event, date: getTodoPrincipalDate(event)?.start },
    disabled: true,
  });

  const timeZone = userTimeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);

  const dayStart = addHours(startOfDay(dayDate), dayStartHour);

  const isPassed = isBefore(event.end, now);

  const duration = intervalToDuration({
    start: event.start,
    end: roundToNearestMinutes(event.end, {
      roundingMethod: "ceil",
    }),
  });
  const startDay = startOfDayButItRespectsDayStartHour(event.start);
  const endDay = startOfDayButItRespectsDayStartHour(event.end);
  const days = differenceInDays(endDay, startDay) + 1;
  const dayNo = differenceInDays(dayStart, startDay) + 1;
  const isLastDay = dayNo === days;

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
      key={event.id}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      isEventWithSeparatedEnd={isEventWithSeparatedEnd}
      isEventEnd={isEventEnd}
      icon={isPassed ? faCalendarCheck : faCalendar}
      cotemporality={cotemporality(event)}
    >
      <div className="flex items-center gap-1.5 leading-snug">
        <div className="text-center font-semibold tabular-nums">
          {event.datetype === "date-time" && dayNo <= 1 ? (
            new Date(event.start).toLocaleTimeString("en-DK", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone,
            })
          ) : (
            <>Day {dayNo}</>
          )}
        </div>
        <div className="leading-tight">
          {event.summary}{" "}
          <span className="text-[0.666rem] whitespace-nowrap tabular-nums opacity-50">
            {dayNo === 1 && duration ? (
              formatShortDuration(duration)
            ) : isLastDay ? (
              <>
                -
                {new Date(event.end).toLocaleTimeString("en-DK", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone,
                })}
              </>
            ) : null}
          </span>{" "}
          {event.url ? (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.666rem] text-[#edab00] hover:text-[#edab00]/80"
            >
              <FontAwesomeIcon icon={faExternalLink} />
            </a>
          ) : null}{" "}
        </div>
      </div>
    </DiaryAgendaDayEntry>
  );
}
