import { TZDate } from "@date-fns/tz";
import { endOfWeek, setISOWeek, setYear, startOfWeek } from "date-fns";
import { auth } from "../../../auth";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { getDiaryEntries } from "./getDiaryEntries";

export async function DiaryEntryWeekWrapper({
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
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
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

  const diaryEntries = await getDiaryEntries({
    from: startOfWeek(weekDate, { weekStartsOn: 1 }),
    to: endOfWeek(weekDate, { weekStartsOn: 1 }),
  });

  return (
    <DiaryEntryWeek
      isoYearAndWeek={isoYearAndWeek}
      pickedDate={pickedDate}
      diaryEntries={diaryEntries}
    />
  );
}
