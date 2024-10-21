import { TZDate } from "@date-fns/tz";
import {
  eachDayOfInterval,
  endOfWeek,
  getISOWeek,
  getMonth,
  getYear,
  setISOWeek,
  setYear,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { auth } from "../../auth";
import { DEFAULT_TIMEZONE } from "../../utils";
import { DiaryEntryItem } from "./DiaryEntryItem";
import { getDiaryEntries } from "./getDiaryEntries";

const dateToString = (date: Date): `${number}-${number}-${number}` =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export async function DiaryEntryWeek({
  isoYearAndWeek,
  pickedDate,
}: {
  isoYearAndWeek: string;
  pickedDate?: `${number}-${number}-${number}`;
}) {
  const user = (await auth())?.user;

  if (!user) {
    return (
      <div>
        <span>Hello, stranger!</span>
        <p>
          <a href="/api/auth/signin">Sign in</a>
        </p>
      </div>
    );
  }

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
  const diaryEntries = await getDiaryEntries({
    from: weekInterval.start,
    to: weekInterval.end,
  });

  return (
    <div key={getISOWeek(weekDate)} className="flex flex-1">
      <div className="flex w-12 flex-col items-center justify-center border-black/25 border-[0.5px]">
        <span>{getISOWeek(weekDate)}</span>
        <span className="text-xs font-bold">
          {getYear(weekDate) !== getYear(subWeeks(weekDate, 1))
            ? getYear(weekDate)
            : null}
        </span>
        <span className="text-xs font-bold">
          {getMonth(weekDate) !== getMonth(subWeeks(weekDate, 1))
            ? weekDate.toLocaleDateString("en-DK", { month: "short" })
            : null}
        </span>
      </div>
      <div className="flex flex-1 bg-white">
        {eachDayOfInterval(weekInterval).map((dayte) => (
          <DiaryEntryItem
            key={dateToString(dayte)}
            diaryEntry={
              diaryEntries.find(([date]) => date === dateToString(dayte))?.[1]
            }
            date={dateToString(dayte)}
            pickedDate={pickedDate}
          />
        ))}
      </div>
    </div>
  );
}
