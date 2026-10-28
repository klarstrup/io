import {
  faBus,
  faSubway,
  faTrain,
  faTrainTram,
} from "@fortawesome/free-solid-svg-icons";
import { faRoad } from "@fortawesome/free-solid-svg-icons/faRoad";
import { useRouter } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { GQTrip } from "../../graphql.generated/graphql";
import { useEvent } from "../../hooks";
import { cotemporality } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate, isSeparatedEnd } from "./diaryUtils";

export function DiaryAgendaDayTrip({
  className,
  trip,
  cotemporalityOfSurroundingEvent,
  isEntryWithSeparatedEnd,
  timeZone,
}: {
  className?: string;
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

  const handleOnClick = useEvent(() => {
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
      icon={
        // if all legs have the same mode use a specific icon for that mode
        trip.legs.every(
          (leg) =>
            leg.mode === "BUS" || leg.mode === "A_BUS" || leg.mode === "S_BUS",
        )
          ? faBus
          : trip.legs.every(
                (leg) =>
                  leg.mode === "S_TRAIN" ||
                  leg.mode === "LIGHT_RAIL_COPENHAGEN",
              )
            ? faTrainTram
            : trip.legs.every((leg) => leg.mode === "METRO")
              ? faSubway
              : trip.legs.every(
                    (leg) =>
                      leg.mode === "REGIONAL_TRAIN" ||
                      leg.mode === "INTERCITY" ||
                      leg.mode === "INTERCITY_LYN",
                  )
                ? faTrain
                : faRoad
      }
      cotemporality={cotemporality(trip)}
      cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
      className={twMerge("cursor-pointer text-sm", className)}
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
        <div className="-mt-0.5 flex gap-0.5">
          {trip.legs.map((leg, index) => (
            <div
              // eslint-disable-next-line @eslint-react/no-array-index-key
              key={index}
              className={
                "flex min-h-3 min-w-3 items-center justify-center rounded-sm px-0.5 text-[0.555rem] leading-0 font-bold text-gray-500 " +
                (fromParanthetical && toParanthetical && "" ? "-mt-2.5" : "")
              }
              style={{
                color: leg.badgeTextColor,
                backgroundColor: leg.badgeColor,
              }}
            >
              {leg.badgeText}
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
