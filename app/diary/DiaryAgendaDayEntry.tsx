import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { forwardRef, ReactElement } from "react";

export const DiaryAgendaDayEntry = forwardRef(function DiaryAgendaDayEntry(
  {
    icon,
    iconTxt,
    children,
    isActive,
    isDragging,
    onContentClick,
    onIconClick,
    cotemporality,
    className,
    ...props
  }: {
    icon?: IconDefinition;
    iconTxt?: string | ReactElement;
    children: React.ReactNode;
    isActive?: boolean;
    isDragging?: boolean;
    onContentClick?: () => void;
    onIconClick?: (
      e: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent>,
    ) => void;
    cotemporality?: "past" | "current" | "future";
  } & React.HTMLAttributes<HTMLDivElement>,
  ref: React.Ref<HTMLDivElement>,
) {
  const IconContainer = onIconClick ? "button" : "div";

  return (
    <div ref={ref} className="flex" {...props}>
      <IconContainer
        className={
          "text-md flex w-10 items-center justify-center " +
          (cotemporality
            ? cotemporality === "past"
              ? " text-green-400"
              : cotemporality === "current"
                ? " text-orange-400"
                : " text-gray-900/50"
            : "text-gray-900/50") +
          (onIconClick ? " cursor-pointer" : "")
        }
        onClick={onIconClick}
      >
        {icon ? <FontAwesomeIcon icon={icon} /> : iconTxt ? iconTxt : null}
      </IconContainer>
      <div
        className={
          "relative flex flex-1 items-start justify-start " + className
        }
        onClick={onContentClick}
      >
        {children}
      </div>
    </div>
  );
});
