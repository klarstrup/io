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
import { dateToString } from "../../utils";
import { DiaryEntryItem } from "./DiaryEntryItem";

export async function DiaryEntryWeek({
  user,
  weekDate,
  diaryEntries,
}: {
  user?: Session["user"];
  weekDate: Date;
  diaryEntries?: [`${number}-${number}-${number}`, DiaryEntry][];
}) {
  const weekInterval = {
    start: startOfISOWeek(weekDate),
    end: endOfISOWeek(weekDate),
  };

  return (
    <div
      key={`${getISOWeekYear(weekDate)}-${getISOWeek(weekDate)}`}
      className="grid flex-1 grid-cols-8"
    >
      <div className="flex flex-1 flex-col flex-wrap items-center justify-center border-r-[0.5px] border-b-[0.5px] border-black/10 border-r-black bg-white p-[5%]">
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
