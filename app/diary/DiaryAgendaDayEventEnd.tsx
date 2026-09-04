import { faArrowsDownToLine } from "@fortawesome/free-solid-svg-icons";
import { roundToNearestMinutes } from "date-fns";
import { GQEvent, GQUser } from "../../graphql.generated/graphql";
import { cotemporality, DEFAULT_TIMEZONE } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayEventEnd({
  userTimeZone,
  event,
  cotemporalityOfSurroundingEvent,
}: {
  userTimeZone: GQUser["timeZone"];
  event: GQEvent;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
}) {
  const timeZone = userTimeZone || DEFAULT_TIMEZONE;

  return (
    <DiaryAgendaDayEntry
      date={getJournalEntryPrincipalDate(event)!.end}
      entry={event}
      icon={faArrowsDownToLine}
      cotemporality={cotemporality(event)}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      isEntryEnd
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
