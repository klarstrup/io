import Link from "next/link";
import type { cotemporality } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayLocationChangeWeather } from "./DiaryAgendaDayLocationChangeWeather";
import type { LocationChange } from "./diaryUtils";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayLocationChange({
  locationChange,
  cotemporalityOfSurroundingEvent,
  className,
  timeZone,
}: {
  locationChange: LocationChange;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
  className?: string;
  timeZone: string;
}) {
  return (
    <DiaryAgendaDayEntry
      date={getJournalEntryPrincipalDate(locationChange).start}
      userTimeZone={timeZone}
      entry={locationChange}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      className={className}
    >
      <center
        key={locationChange.id}
        className="flex w-full items-center justify-center gap-1 text-xs leading-none font-medium text-stone-600 [font-variant:small-caps]"
        title={locationChange.location}
      >
        {locationChange.locationId ? (
          <Link href={`/diary/locations/${locationChange.locationId}`}>📍</Link>
        ) : (
          <button
            type="button"
            style={{ letterSpacing: 0, wordSpacing: 0 }}
            onClick={() => {
              // Handle the click event for adding a new location or an address as an alias for an existing location
            }}
          >
            <span
              style={{
                textShadow:
                  "0 0 4px limegreen,0 0 4px limegreen,0 0 4px limegreen",
              }}
            >
              ➕
            </span>
            <span style={{ marginLeft: "-1em" }}>📍</span>
          </button>
        )}
        {locationChange.location
          .replace(/\d\d\d\d (.+), Denmark/g, "$1")
          .replace(/(.+)\(.+\)/, "$1")}
        <DiaryAgendaDayLocationChangeWeather date={locationChange.end} />
      </center>
    </DiaryAgendaDayEntry>
  );
}
