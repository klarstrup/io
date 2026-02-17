import { useSortable } from "@dnd-kit/sortable";
import Link from "next/link";
import { ScrollToMe } from "../../components/CenterMe";
import type { cotemporality } from "../../utils";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";

export function DiaryAgendaDayNow({
  date,
  cotemporalityOfSurroundingEvent,
}: {
  date: `${number}-${number}-${number}`;
  cotemporalityOfSurroundingEvent: ReturnType<typeof cotemporality> | null;
}) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: "now-divider",
    data: { date: new Date() },
    disabled: true,
  });

  return (
    <DiaryAgendaDayEntry
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      iconTxt={
        <span className="text-[10px] font-bold text-[#EDAB00]">NOW</span>
      }
      cotemporality="current"
      className="pt-0.5 pb-1.5 gap-1.5"
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
    >
      <Link
        prefetch={false}
        href={`/diary/${date}/workout`}
        className={
          "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold shadow-md shadow-black/30"
        }
      >
        <span className="text-xs">➕</span> Workout
      </Link>
      <DiaryAgendaDayCreateTodo date={new Date()} />
      <span
        hidden
        className={
          "cursor-not-allowed rounded-md bg-gray-300 px-1 py-0.5 pr-1.5 text-sm font-semibold text-black/25 shadow-md shadow-black/30"
        }
      >
        <span className="text-xs">➕</span> Event
      </span>
      <ScrollToMe />
    </DiaryAgendaDayEntry>
  );
}
