import { TZDate } from "@date-fns/tz";
import {
  addMonths,
  eachDayOfInterval,
  endOfISOWeek,
  getISOWeek,
  getYear,
  isWithinInterval,
  setISOWeek,
  setYear,
  startOfISOWeek,
  startOfMonth,
  subWeeks,
} from "date-fns";
import type { Session } from "next-auth";
import { DiaryEntry } from "../../lib";
import {
  calculateClimbingStats,
  isClimbingExercise,
} from "../../models/workout";
import { dateToString, DEFAULT_TIMEZONE, isNonEmptyArray } from "../../utils";
import { DiaryEntryItem } from "./DiaryEntryItem";

export function DiaryEntryWeek({
  user,
  isoYearAndWeek,
  diaryEntries,
}: {
  user: Session["user"];
  isoYearAndWeek: string;
  diaryEntries?: [`${number}-${number}-${number}`, DiaryEntry][];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const [isoYear, isoWeek] = isoYearAndWeek.split("-").map(Number) as [
    number,
    number,
  ];

  const weekDate = setYear(setISOWeek(TZDate.tz(timeZone), isoWeek), isoYear);
  const weekInterval = {
    start: startOfISOWeek(weekDate),
    end: endOfISOWeek(weekDate),
  };

  const weekClimbingSets =
    diaryEntries?.flatMap(
      ([, diaryEntry]) =>
        diaryEntry?.workouts?.flatMap((w) =>
          w.exercises
            .filter((e) => isClimbingExercise(e.exerciseId))
            .flatMap((e) => e.sets.map((set) => [w.location, set] as const)),
        ) || [],
    ) || [];

  return (
    <div
      key={getISOWeek(weekDate)}
      className="grid flex-1 grid-cols-8 bg-white"
    >
      <div
        className="flex flex-1 flex-col items-center justify-center border-[0.5px] border-black/25"
        style={{ background: "#edab00" }}
      >
        <span>{getISOWeek(weekDate)}</span>
        <span className="text-xs font-bold">
          {getYear(weekDate) !== getYear(subWeeks(weekDate, 1))
            ? getYear(weekDate)
            : null}
        </span>
        <span className="text-xs font-bold">
          {isWithinInterval(startOfMonth(weekDate), weekInterval)
            ? weekDate.toLocaleDateString("en-DK", {
                month: "short",
              })
            : isWithinInterval(
                  startOfMonth(addMonths(weekDate, 1)),
                  weekInterval,
                )
              ? addMonths(weekDate, 1).toLocaleDateString("en-DK", {
                  month: "short",
                })
              : null}
        </span>
        {isNonEmptyArray(weekClimbingSets) &&
          calculateClimbingStats(weekClimbingSets)}
      </div>
      {eachDayOfInterval(weekInterval).map((dayte) => {
        const dateStr = dateToString(dayte);

        return (
          <DiaryEntryItem
            key={dateStr}
            user={user}
            diaryEntry={diaryEntries?.find(([date]) => date === dateStr)?.[1]}
            date={dateStr}
          />
        );
      })}
    </div>
  );
}
