import { TZDate } from "@date-fns/tz";
import {
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  getISOWeek,
  getYear,
  isWithinInterval,
  setISOWeek,
  setYear,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import type { Session } from "next-auth";
import { DiaryEntry } from "../../lib";
import { DEFAULT_TIMEZONE } from "../../utils";
import { DiaryEntryItem } from "./DiaryEntryItem";

const dateToString = (date: Date): `${number}-${number}-${number}` =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

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
    start: startOfWeek(weekDate, { weekStartsOn: 1 }),
    end: endOfWeek(weekDate, { weekStartsOn: 1 }),
  };

  return (
    <div key={getISOWeek(weekDate)} className="flex flex-1">
      <div className="flex w-12 flex-col items-center justify-center border-[0.5px] border-black/25">
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
      </div>
      <div className="flex flex-1 bg-white">
        {eachDayOfInterval(weekInterval).map((dayte) => (
          <DiaryEntryItem
            user={user}
            key={dateToString(dayte)}
            diaryEntry={
              diaryEntries?.find(([date]) => date === dateToString(dayte))?.[1]
            }
            date={dateToString(dayte)}
          />
        ))}
      </div>
    </div>
  );
}
