import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
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
  isEventWithSeparatedEnd,
  isEventEnd,
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
  isEventWithSeparatedEnd?: boolean;
  isEventEnd?: boolean;
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
      {isEventWithSeparatedEnd ? (
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
      {isEventEnd ? (
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
              icon={icon}
              size="lg"
              className={onIconClick ? "cursor-pointer" : ""}
            />
          ) : iconTxt ? (
            iconTxt
          ) : null}
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
