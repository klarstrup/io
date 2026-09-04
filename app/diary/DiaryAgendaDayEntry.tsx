import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import {
  faArrowsDownToLine,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { isSeparatedEnd, JournalEntry } from "./diaryUtils";

export function DiaryAgendaDayEntry({
  entry,
  date,
  isDraggable = false,
  icon,
  iconTxt,
  iconDisabled,
  children,
  onContentClick,
  onIconClick,
  cotemporality,
  className,
  iconClassName,
  contentClassName,
  cotemporalityOfSurroundingEvent,
  isEntryWithSeparatedEnd,
  ...props
}: {
  isDraggable?: boolean;
  icon?: IconDefinition;
  iconTxt?: string | ReactElement;
  iconDisabled?: boolean;
  iconClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
  onContentClick?: () => void;
  onIconClick?: (
    e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>,
  ) => void;
  cotemporality?: "past" | "current" | "future" | "backlog";
  cotemporalityOfSurroundingEvent?: "past" | "current" | "future" | null;
  isEntryWithSeparatedEnd?: boolean;
  entry: JournalEntry;
  date: Date;
} & React.HTMLAttributes<HTMLDivElement>) {
  const client = useApolloClient();
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id:
      (isSeparatedEnd(entry) ? "end-of-" : "") +
      (entry.__typename !== "LocationChange" &&
      entry.__typename !== "NowDivider"
        ? client.cache.identify(entry)
        : entry.id),
    data: { date, entry },
    disabled: !isDraggable,
  });

  const IconContainer = onIconClick ? "button" : "div";

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

  const isEntryEnd = isSeparatedEnd(entry);

  return (
    <div
      {...props}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ ...style, ...props.style }}
      className={twMerge(
        "relative flex",
        isDraggable && "cursor-grab select-none",
        className,
      )}
    >
      {cotemporalityOfSurroundingEvent && !isDragging ? (
        <div
          className={
            "absolute -top-1 -bottom-1 left-0.5 w-2 border-l-2 " +
            (cotemporalityOfSurroundingEvent === "past"
              ? " border-green-400"
              : cotemporalityOfSurroundingEvent === "current"
                ? " border-[#EDAB00]"
                : " border-gray-500")
          }
        />
      ) : null}
      {isEntryWithSeparatedEnd ? (
        <div
          className={
            "absolute top-1/2 -bottom-1 left-0.5 w-1.5 rounded-tl border-t-2 border-l-2 " +
            (cotemporality
              ? cotemporality === "past"
                ? " border-green-400"
                : cotemporality === "current"
                  ? " border-[#EDAB00]"
                  : " border-gray-500"
              : " border-gray-500")
          }
        />
      ) : null}
      {isEntryEnd ? (
        <div
          className={
            "absolute -top-1 bottom-1/2 left-0.5 w-1.5 rounded-bl border-b-2 border-l-2 " +
            (cotemporality
              ? cotemporality === "past"
                ? " border-green-400"
                : cotemporality === "current"
                  ? " border-[#EDAB00]"
                  : " border-gray-500"
              : " border-gray-500")
          }
        />
      ) : null}
      {icon || iconTxt ? (
        <IconContainer
          disabled={iconDisabled}
          title={date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
          className={twMerge(
            "text-md flex w-10 items-center justify-center",
            cotemporality
              ? cotemporality === "past"
                ? "text-green-400"
                : cotemporality === "current"
                  ? "text-[#EDAB00]"
                  : cotemporality === "backlog"
                    ? "text-white"
                    : "text-gray-500"
              : "text-gray-500",
            onIconClick ? "cursor-pointer" : "",
            iconClassName ?? "",
          )}
          onClick={onIconClick}
        >
          {icon ? (
            <FontAwesomeIcon
              icon={isEntryEnd ? faArrowsDownToLine : icon}
              size="lg"
              className={onIconClick ? "cursor-pointer" : ""}
            />
          ) : (
            iconTxt
          )}
        </IconContainer>
      ) : null}
      <div
        className={twMerge(
          "relative flex flex-1 items-start justify-start",
          contentClassName,
        )}
        onClick={onContentClick}
      >
        {children}
      </div>
    </div>
  );
}
