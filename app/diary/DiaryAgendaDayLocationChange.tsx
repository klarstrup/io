import { useSortable } from "@dnd-kit/sortable";
import { useMemo } from "react";
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
    id: locationChange.id,
    data: {
      locationChange,
      date: getJournalEntryPrincipalDate(locationChange)?.end,
    },
    disabled: true,
  });

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
