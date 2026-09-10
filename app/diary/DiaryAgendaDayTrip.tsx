import {
  faBus,
  faPersonWalking,
  faSubway,
  faTrain,
  faTrainTram,
} from "@fortawesome/free-solid-svg-icons";
import { faRoad } from "@fortawesome/free-solid-svg-icons/faRoad";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter } from "next/navigation";
import { useEffectEvent } from "react";
import { GQTrip } from "../../graphql.generated/graphql";
import { cotemporality } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate, isSeparatedEnd } from "./diaryUtils";

export function DiaryAgendaDayTrip({
  trip,
  cotemporalityOfSurroundingEvent,
  isEntryWithSeparatedEnd,
  timeZone,
}: {
  trip: GQTrip;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
  isEntryWithSeparatedEnd: boolean;
  timeZone: string;
}) {
  const router = useRouter();
  const fromText = trip.legs[0]?.from
    .replace("(Metro)", "")
    .replace(/\(.+\)/, "")
    .trim()
    .replace(/st\.$/gi, "")
    .trim();
  const fromParanthetical = trip.legs[0]?.from
    .replace("(Metro)", "")
    .match(/\((.+)\)/)?.[1]
    ?.trim();
  const toText = trip.legs[trip.legs.length - 1]?.to
    .replace("(Metro)", "")
    .replace(/\(.+\)/, "")
    .trim()
    .replace(/st\.$/gi, "")
    .trim();
  const toParanthetical = trip.legs[trip.legs.length - 1]?.to
    .replace("(Metro)", "")
    .match(/\((.+)\)/)?.[1]
    ?.trim();

  const handleOnClick = useEffectEvent(() => {
    router.push(`/diary/entries/${trip.__typename}:${trip.id}`);
  });

  return (
    <DiaryAgendaDayEntry
      date={
        isSeparatedEnd(trip)
          ? getJournalEntryPrincipalDate(trip).end
          : getJournalEntryPrincipalDate(trip).start
      }
      userTimeZone={timeZone}
      entry={trip}
      icon={faRoad}
      cotemporality={cotemporality(trip)}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      className="cursor-pointer text-sm"
      iconClassName="w-10 text-[0.666rem]"
      isEntryWithSeparatedEnd={isEntryWithSeparatedEnd}
      onClick={handleOnClick}
    >
      <div className="flex flex-row flex-wrap items-center justify-start gap-1">
        <div className="flex flex-col font-mono text-[0.666rem] text-gray-500 uppercase">
          <span>{fromText}</span>
          {fromParanthetical && "" ? (
            <span className="-mt-1 text-[0.555rem] text-gray-400">
              {fromParanthetical}
            </span>
          ) : null}
        </div>
        <div className="-mt-0.5 flex">
          {trip.legs.map((leg, index, legs) => (
            <div
              key={index}
              className={
                "flex items-center justify-start text-[0.666rem] text-gray-500 " +
                (fromParanthetical && toParanthetical && "" ? "-mt-2.5" : "")
              }
            >
              {leg.mode === "BUS" ||
              leg.mode === "A_BUS" ||
              leg.mode === "S_BUS" ? (
                <FontAwesomeIcon icon={faBus} />
              ) : leg.mode === "S_TRAIN" ||
                leg.mode === "LIGHT_RAIL_COPENHAGEN" ? (
                <FontAwesomeIcon icon={faTrainTram} />
              ) : leg.mode === "METRO" ? (
                <FontAwesomeIcon icon={faSubway} />
              ) : leg.mode === "REGIONAL_TRAIN" ||
                leg.mode === "INTERCITY" ||
                leg.mode === "INTERCITY_LYN" ? (
                <FontAwesomeIcon icon={faTrain} />
              ) : (
                (console.warn(`missing icon for leg mode: ${leg.mode}`), null)
              )}
              {index < legs.length - 1 ? (
                <FontAwesomeIcon
                  icon={faPersonWalking}
                  className="-mr-0.5 -ml-0.5 text-[0.5rem] text-gray-500"
                />
              ) : /* || (
                          <span className="font-mono text-[0.666rem] text-gray-500 uppercase">
                            {leg.to}
                          </span>
                        )*/
              null}
            </div>
          ))}
        </div>
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
