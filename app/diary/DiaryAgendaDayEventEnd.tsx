import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import { faArrowsDownToLine } from "@fortawesome/free-solid-svg-icons";
import { roundToNearestMinutes } from "date-fns";
import type { Session } from "next-auth";
import { GQEvent } from "../../graphql.generated";
import { cotemporality, DEFAULT_TIMEZONE } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getTodoPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayEventEnd({
  user,
  event,
  cotemporalityOfSurroundingEvent,
}: {
  user?: Session["user"];
  event: GQEvent;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
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
    id: "end-of-" + (client.cache.identify(event) || event.id),
    data: { event, date: getTodoPrincipalDate(event)?.end },
    disabled: true,
  });

  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;

  return (
    <DiaryAgendaDayEntry
      ref={setNodeRef}
      style={{
        transition,
        ...(transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 5,
            }
          : undefined),
        ...(isDragging ? { zIndex: 10 } : {}),
      }}
      {...listeners}
      {...attributes}
      icon={faArrowsDownToLine}
      cotemporality={cotemporality(event)}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      isEventEnd
    >
      <div key={event.id} className="flex items-center gap-1.5 leading-tight">
        <div className="text-center font-semibold tabular-nums">
          {roundToNearestMinutes(event.end).toLocaleTimeString("en-DK", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone,
          })}
        </div>
        <div className="leading-tight">{event.summary}</div>
      </div>
    </DiaryAgendaDayEntry>
  );
}
