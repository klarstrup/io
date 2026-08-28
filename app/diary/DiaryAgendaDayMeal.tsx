import { faExternalLink, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  return (
    <DiaryAgendaDayEntry
      entry={meal}
      date={getJournalEntryPrincipalDate(meal)!.start}
      icon={faUtensils}
      cotemporality={cotemporality({
        start: meal.datetime,
        end: meal.datetime,
      })}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      className={"pr-0.5 pl-0.5 text-xs"}
      iconClassName="w-10 text-[0.666rem]"
      contentClassName="block text-gray-700 dark:text-gray-400"
    >
      {meal.foodEntries.map((fe) => fe.food.description).join(", ")}
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
