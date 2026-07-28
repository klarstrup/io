import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import {
  faBus,
  faPersonWalking,
  faSubway,
  faTrainTram,
} from "@fortawesome/free-solid-svg-icons";
import { faRoad } from "@fortawesome/free-solid-svg-icons/faRoad";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo } from "react";
import { GQTrip } from "../../graphql.generated/graphql";
import { cotemporality } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayTrip({
  trip,
  cotemporalityOfSurroundingEvent,
}: {
  trip: GQTrip;
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
    id: client.cache.identify(trip) || trip.id,
    data: { trip, date: getJournalEntryPrincipalDate(trip)?.end },
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

  const fromText = trip.legs[0]?.from
    .replace("(Metro)", "")
    .replace(/\(.+\)/, "")
    .trim();
  const fromParanthetical = trip.legs[0]?.from
    .replace("(Metro)", "")
    .match(/\((.+)\)/)?.[1]
    ?.trim();
  const toText = trip.legs[trip.legs.length - 1]?.to
    .replace("(Metro)", "")
    .replace(/\(.+\)/, "")
    .trim();
  const toParanthetical = trip.legs[trip.legs.length - 1]?.to
    .replace("(Metro)", "")
    .match(/\((.+)\)/)?.[1]
    ?.trim();

  return (
    <DiaryAgendaDayEntry
      ref={setNodeRef}
      style={style}
      icon={faRoad}
      cotemporality={cotemporality(trip)}
      key={trip.id}
      id={trip.id}
      __typename={trip.__typename}
      {...listeners}
      {...attributes}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      className={"rounded-tl rounded-tr pr-0.5 pl-0.5 text-sm"}
      iconClassName="w-10 text-[0.666rem]"
    >
      <div className="flex flex-row items-center justify-start gap-1">
        <div className="flex flex-col font-mono text-[0.666rem] text-gray-500 uppercase">
          <span>{fromText}</span>
          {fromParanthetical && "" ? (
            <span className="-mt-1 text-[0.555rem] text-gray-400">
              {fromParanthetical}
            </span>
          ) : null}
        </div>
        {trip.legs.map((leg, index, legs) => (
          <div
            key={index}
            className={
              "flex items-center justify-start text-[0.666rem] text-gray-500 " +
              (fromParanthetical && toParanthetical && "" ? "-mt-2.5" : "")
            }
          >
            {leg.mode === "BUS" || leg.mode === "A_BUS" ? (
              <FontAwesomeIcon icon={faBus} />
            ) : leg.mode === "S_TRAIN" ? (
              <FontAwesomeIcon icon={faTrainTram} />
            ) : leg.mode === "METRO" ? (
              <FontAwesomeIcon icon={faSubway} />
            ) : null}
            {index < legs.length - 1 ? (
              <FontAwesomeIcon
                icon={faPersonWalking}
                className="-mr-1.5 -ml-0.5 text-[0.5rem] text-gray-500"
              />
            ) : /* || (
                          <span className="font-mono text-[0.666rem] text-gray-500 uppercase">
                            {leg.to}
                          </span>
                        )*/
            null}
          </div>
        ))}
        <div className="flex flex-col font-mono text-[0.666rem] text-gray-500 uppercase">
          <span>{toText}</span>
          {toParanthetical && "" ? (
            <span className="-mt-1 text-[0.555rem] text-gray-400">
              {toParanthetical}
            </span>
          ) : null}
        </div>
      </div>
    </DiaryAgendaDayEntry>
  );
}
