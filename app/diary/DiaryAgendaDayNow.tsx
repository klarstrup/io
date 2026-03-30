import { useSortable } from "@dnd-kit/sortable";
import Link from "next/link";
import { useMemo } from "react";
import type { cotemporality } from "../../utils";
import { DiaryAgendaDayCreateTodo } from "./DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";

export function DiaryAgendaDayNow({
  date,
  cotemporalityOfSurroundingEvent,
  now,
}: {
  date: `${number}-${number}-${number}`;
  cotemporalityOfSurroundingEvent: ReturnType<typeof cotemporality> | null;
  now: Date;
}) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: "now-divider", data: { date: now }, disabled: true });

  const iconTxt = useMemo(
    () => <span className="text-[10px] font-bold text-[#EDAB00]">NOW</span>,
    [],
  );

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
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      iconTxt={iconTxt}
      cotemporality="current"
      className="pt-0.5 pb-1.5"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <Link
        prefetch={false}
        href={`/diary/${date}/workout`}
        className={
          "mr-2 cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold shadow-md shadow-black/30"
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
    </DiaryAgendaDayEntry>
  );
}
