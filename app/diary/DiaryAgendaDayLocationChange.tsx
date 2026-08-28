import type { cotemporality } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayLocationChangeWeather } from "./DiaryAgendaDayLocationChangeWeather";
import type { LocationChange } from "./diaryUtils";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayLocationChange({
  locationChange,
  cotemporalityOfSurroundingEvent,
  className,
}: {
  locationChange: LocationChange;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
  className?: string;
}) {
  return (
    <DiaryAgendaDayEntry
      date={getJournalEntryPrincipalDate(locationChange)!.start}
      entry={locationChange}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      className={className}
    >
      <center
        key={locationChange.id}
        className="flex w-full items-center justify-center gap-1 text-xs leading-none font-medium opacity-75 [font-variant:small-caps]"
      >
        {locationChange.location.replace(/\d\d\d\d (.+), Denmark/g, "$1")}{" "}
        <DiaryAgendaDayLocationChangeWeather date={locationChange.end} />
      </center>
    </DiaryAgendaDayEntry>
  );
}
