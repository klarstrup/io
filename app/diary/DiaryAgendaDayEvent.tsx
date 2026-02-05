import { useApolloClient } from "@apollo/client/react";
import { TZDate } from "@date-fns/tz";
import { useSortable } from "@dnd-kit/sortable";
import { faCalendar, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import {
  addHours,
  differenceInDays,
  intervalToDuration,
  isBefore,
  roundToNearestMinutes,
  startOfDay,
} from "date-fns";
import type { Session } from "next-auth";
import { Event } from "../../graphql.generated";
import { cotemporality, dayStartHour, DEFAULT_TIMEZONE } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getTodoPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayEvent({
  dayDate,
  user,
  event,
}: {
  dayDate: Date;
  user?: Session["user"];
  event: Event;
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

  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);

  const dayStart = addHours(startOfDay(dayDate), dayStartHour);

  const isPassed = isBefore(event.end, now);

  const duration = intervalToDuration({
    start: event.start,
    end: roundToNearestMinutes(event.end, {
      roundingMethod: "ceil",
    }),
  });
  const startDay = startOfDay(addHours(event.start, -dayStartHour));
  const endDay = startOfDay(addHours(event.end, -dayStartHour));
  const days = differenceInDays(endDay, startDay) + 1;
  const dayNo = differenceInDays(dayStart, startDay) + 1;
  const isLastDay = dayNo === days;

  return (
    <DiaryAgendaDayEntry
      ref={setNodeRef}
      style={{
        transition,
        ...(transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 100,
            }
          : undefined),
      }}
      {...listeners}
      {...attributes}
      isDragging={isDragging}
      key={event.id}
      icon={isPassed ? faCalendarCheck : faCalendar}
      cotemporality={cotemporality({
        start: event.start,
        end: event.end,
      })}
    >
      <div key={event.id} className="flex gap-1.5 leading-snug">
        <div className="text-center">
          <div className="font-semibold tabular-nums">
            {event.datetype === "date-time" && dayNo <= 1 ? (
              event.start.toLocaleTimeString("en-DK", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone,
              })
            ) : (
              <>Day {dayNo}</>
            )}{" "}
          </div>
          <div className="text-[0.666rem] whitespace-nowrap tabular-nums">
            {dayNo === 1 && duration ? (
              <>
                {duration.days ? `${duration.days}d` : null}
                {duration.hours ? `${duration.hours}h` : null}
                {duration.minutes ? `${duration.minutes}m` : null}
                {duration.seconds ? `${duration.seconds}s` : null}
              </>
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
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {event.summary}
            {
              // figure out how to know that the end has a separated end showing
              /*<div className="text-[0.666rem] whitespace-nowrap tabular-nums">
              START
            </div>*/
            }
          </div>
          <div className="text-[0.666rem] leading-snug italic">
            {event.location}
          </div>
        </div>
      </div>
    </DiaryAgendaDayEntry>
  );
}
