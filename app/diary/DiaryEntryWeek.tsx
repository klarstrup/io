import {
  addMonths,
  eachDayOfInterval,
  endOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  isWithinInterval,
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
import { dateToString, isNonEmptyArray } from "../../utils";
import { DiaryEntryItem } from "./DiaryEntryItem";

export function DiaryEntryWeek({
  user,
  weekDate,
  diaryEntries,
}: {
  user: Session["user"];
  weekDate: Date;
  diaryEntries?: [`${number}-${number}-${number}`, DiaryEntry][];
}) {
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
      key={`${getISOWeekYear(weekDate)}-${getISOWeek(weekDate)}`}
      className="grid flex-1 grid-cols-8 bg-white"
    >
      <div
        className="flex flex-1 flex-col flex-wrap items-center justify-center border-[0.5px] border-black/25"
        style={{ background: "#edab00" }}
      >
        <span>{getISOWeek(weekDate)}</span>
        <span className="text-xs font-bold">
          {getISOWeekYear(weekDate) !== getISOWeekYear(subWeeks(weekDate, 1))
            ? getISOWeekYear(weekDate)
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
