import { TZDate } from "@date-fns/tz";
import { endOfWeek, setISOWeek, setYear, startOfWeek } from "date-fns";
import { Session } from "next-auth";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { getDiaryEntries } from "./getDiaryEntries";

export async function DiaryEntryWeekWrapper({
  user,
  isoYearAndWeek,
  pickedDate,
}: {
  user: Session["user"];
  isoYearAndWeek: string;
  pickedDate?: `${number}-${number}-${number}`;
}) {
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
      user={user}
      isoYearAndWeek={isoYearAndWeek}
      pickedDate={pickedDate}
      diaryEntries={diaryEntries}
    />
  );
}
