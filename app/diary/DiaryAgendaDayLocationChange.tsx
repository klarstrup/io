import { useSortable } from "@dnd-kit/sortable";
import type { cotemporality } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayLocationChange({
  locationChange,
  cotemporalityOfSurroundingEvent,
  className,
}: {
  locationChange: {
    __typename: "LocationChange";
    id: string;
    location: string;
    date: Date;
  };
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
  className?: string;
}) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: "location-change-" + locationChange.id,
    data: {
      locationChange,
      date: getJournalEntryPrincipalDate(locationChange)?.end,
    },
    disabled: true,
  });

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
      key={locationChange.id}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      className={className}
    >
      <center
        key={locationChange.id}
        className="-ml-6 w-full text-xs leading-none font-medium opacity-75 [font-variant:small-caps]"
      >
        {locationChange.location.replace(/\d\d\d\d (.+), Denmark/g, "$1")}
      </center>
    </DiaryAgendaDayEntry>
  );
}
