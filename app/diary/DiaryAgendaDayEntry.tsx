import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { forwardRef, ReactElement } from "react";
import { twMerge } from "tailwind-merge";

export const DiaryAgendaDayEntry = forwardRef(function DiaryAgendaDayEntry(
  {
    icon,
    iconTxt,
    iconDisabled,
    children,
    isActive,
    isDragging,
    onContentClick,
    onIconClick,
    cotemporality,
    className,
    cotemporalityOfSurroundingEvent,
    isEventWithSeparatedEnd,
    isEventEnd,
    ...props
  }: {
    icon?: IconDefinition;
    iconTxt?: string | ReactElement;
    iconDisabled?: boolean;
    children: React.ReactNode;
    isActive?: boolean;
    isDragging?: boolean;
    onContentClick?: () => void;
    onIconClick?: (
      e: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent>,
    ) => void;
    cotemporality?: "past" | "current" | "future" | "backlog";
    cotemporalityOfSurroundingEvent?: "past" | "current" | "future" | null;
    isEventWithSeparatedEnd?: boolean;
    isEventEnd?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>,
  ref: React.Ref<HTMLDivElement>,
) {
  const IconContainer = onIconClick ? "button" : "div";

  return (
    <div
      ref={ref}
      className={twMerge(
        "relative flex",
        /*
        isBetweenAnEventAndItsEnd || isEventWithSeparatedEnd || isEventEnd
          ? "border-l-8 border-blue-300"
          : "",
        isEventWithSeparatedEnd ? "border-t-8 border-blue-300" : "",
        isEventEnd ? "border-b-8 border-blue-300" : "",
        isBetweenAnEventAndItsEnd || isEventWithSeparatedEnd ? "-mb-1.5" : "",
        */
      )}
      {...props}
    >
      <IconContainer
        disabled={iconDisabled}
        className={
          "text-md flex w-10 items-center justify-center " +
          (cotemporality
            ? cotemporality === "past"
              ? " text-green-400"
              : cotemporality === "current"
                ? " text-[#EDAB00]"
                : cotemporality === "backlog"
                  ? " text-blue-400"
                  : " text-gray-500"
            : "text-gray-500") +
          (onIconClick ? " cursor-pointer" : "")
        }
        onClick={onIconClick}
      >
        {cotemporalityOfSurroundingEvent ? (
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
              "absolute top-1/2 -bottom-1 left-0.5 w-2 rounded-tl-2xl border-t-2 border-l-2 " +
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
              "absolute -top-1 bottom-1/2 left-0.5 w-2 rounded-bl-2xl border-b-2 border-l-2 " +
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
      <div
        className={
          "relative flex flex-1 items-start justify-start " + (className || "")
        }
        onClick={onContentClick}
      >
        {children}
      </div>
    </div>
  );
});
