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
  isEventWithSeparatedEnd,
  cotemporalityOfSurroundingEvent,
  isEventEnd,
}: {
  dayDate: Date;
  user?: Session["user"];
  event: Event;
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
              <>
                {duration.days ? `${duration.days}d` : null}
                {duration.hours ? `${duration.hours}h` : null}
                {duration.minutes ? `${duration.minutes}m` : null}
                {duration.seconds ? `${duration.seconds}s` : null}
              </>
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
          </span>
        </div>
      </div>
    </DiaryAgendaDayEntry>
  );
}
