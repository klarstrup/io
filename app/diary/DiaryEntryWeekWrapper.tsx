import { TZDate } from "@date-fns/tz";
import { endOfWeek, setISOWeek, setYear, startOfWeek } from "date-fns";
import type { Session } from "next-auth";
import { DEFAULT_TIMEZONE } from "../../utils";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { getDiaryEntriesShallow } from "./getDiaryEntries";

export async function DiaryEntryWeekWrapper({
  user,
  isoYearAndWeek,
}: {
  user: Session["user"];
  isoYearAndWeek: string;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const [isoYear, isoWeek] = isoYearAndWeek.split("-").map(Number) as [
    number,
    number,
  ];

  const weekDate = setYear(setISOWeek(TZDate.tz(timeZone), isoWeek), isoYear);

  const diaryEntries = await getDiaryEntriesShallow({
    from: startOfWeek(weekDate, { weekStartsOn: 1 }),
    to: endOfWeek(weekDate, { weekStartsOn: 1 }),
  });

  return (
    <DiaryEntryWeek
      user={user}
      isoYearAndWeek={isoYearAndWeek}
      diaryEntries={diaryEntries}
    />
  );
}
