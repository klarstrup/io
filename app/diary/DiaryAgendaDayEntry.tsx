"use client";
import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import {
  faArrowsDownToLine,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isEqual } from "date-fns";
import { ReactElement, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { DEFAULT_TIMEZONE } from "../../utils";
import {
  getJournalEntryPrincipalDate,
  isSeparatedEnd,
  JournalEntry,
  omitSeparatedEnd,
} from "./diaryUtils";

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
  userTimeZone,
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
  userTimeZone: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const timeZone = userTimeZone || DEFAULT_TIMEZONE;
  const client = useApolloClient();
  const id = useMemo(
    () =>
      (isSeparatedEnd(entry) ? "end-of-" : "") +
      (entry.__typename !== "LocationChange" &&
      entry.__typename !== "NowDivider" &&
      entry.__typename !== "DateChange"
        ? client.cache.identify(entry)!
        : entry.id),
    [client.cache, entry],
  );
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    over,
    index,
    activeIndex,
  } = useSortable({
    id,
    data: { date, entry },
    disabled: !isDraggable,
  });

  const IconContainer = onIconClick ? "button" : "div";

  const style = useMemo(
    () => ({
      transition,
      ...(transform && isDragging
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
  const entryPrincipalInterval = getJournalEntryPrincipalDate(
    omitSeparatedEnd(entry),
  );

  return (
    <div
      {...props}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ ...style, ...props.style }}
      className={twMerge(
        "relative flex py-1 pr-1 bg-white/85 ",
        isDraggable && "cursor-grab select-none",
        className,
      )}
    >
      {over?.id === id && !isDragging ? (
        <div
          className={
            "absolute right-0 left-0 z-6 h-1 bg-red-600/90 " +
            (index > activeIndex ? " bottom-0" : " top-0")
          }
        />
      ) : undefined}
      {cotemporalityOfSurroundingEvent && !isDragging ? (
        <div
          className={
            "absolute top-0 bottom-0 left-0.5 w-1.5 border-l-2 " +
            (cotemporalityOfSurroundingEvent === "past"
              ? " z-2 border-green-400"
              : cotemporalityOfSurroundingEvent === "current"
                ? " z-3 border-[#EDAB00]"
                : " z-1 border-gray-500")
          }
        />
      ) : null}
      {isEntryWithSeparatedEnd && cotemporality ? (
        <div
          className={
            "absolute top-1/2 bottom-0 left-0.5 w-1.5 rounded-tl border-t-2 border-l-2 " +
            (cotemporality === "past"
              ? " z-2 border-green-400"
              : cotemporality === "current"
                ? " z-3 border-[#EDAB00]"
                : " z-1 border-gray-500")
          }
        />
      ) : null}
      {isEntryEnd && cotemporality ? (
        <div
          className={
            "absolute top-0 bottom-1/2 left-0.5 w-1.5 rounded-bl border-b-2 border-l-2 " +
            (cotemporality === "past"
              ? " z-2 border-green-400"
              : cotemporality === "current"
                ? " z-3 border-[#EDAB00]"
                : " z-1 border-gray-500")
          }
        />
      ) : null}
      {icon || iconTxt ? (
        <IconContainer
          disabled={iconDisabled}
          title={`${!isEqual(date, entryPrincipalInterval.start) ? date.toLocaleTimeString("en-DK", { timeZone, hour: "numeric", minute: "numeric", second: undefined }) + ", " : ""}${Intl.DateTimeFormat(
            "en-DK",
            { timeZone, hour: "numeric", minute: "numeric", second: undefined },
          ).formatRange(
            entryPrincipalInterval.start,
            entryPrincipalInterval.end,
          )}`}
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
