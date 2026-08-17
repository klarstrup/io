import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import { faExternalLink, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo } from "react";
import { GQMeal } from "../../graphql.generated/graphql";
import { cotemporality } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayMeal({
  meal,
  cotemporalityOfSurroundingEvent,
}: {
  meal: GQMeal;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
}) {
  const client = useApolloClient();
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: client.cache.identify(meal) || meal.id,
    data: { meal, date: getJournalEntryPrincipalDate(meal)?.end },
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
      icon={faUtensils}
      cotemporality={cotemporality({
        start: meal.datetime,
        end: meal.datetime,
      })}
      key={meal.id}
      id={meal.id}
      __typename={meal.__typename}
      {...listeners}
      {...attributes}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      className={"rounded-tl rounded-tr pr-0.5 pl-0.5 text-xs"}
      iconClassName="w-10 text-[0.666rem]"
    >
      <div className="text-gray-700 dark:text-gray-400">
        {meal.foodEntries.map((fe) => fe.food.description).join(", ")}
      </div>
      &nbsp;
      {meal.url ? (
        <a
          href={meal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.666rem] text-[#edab00] hover:text-[#edab00]/80"
        >
          <FontAwesomeIcon icon={faExternalLink} />
        </a>
      ) : null}
    </DiaryAgendaDayEntry>
  );
}
