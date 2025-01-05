import { endOfISOWeek, startOfISOWeek } from "date-fns";
import type { Session } from "next-auth";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { getDiaryEntriesShallow } from "./getDiaryEntries";

export async function DiaryEntryWeekWrapper({
  user,
  weekDate,
}: {
  user: Session["user"];
  weekDate: Date;
}) {
  const diaryEntries = await getDiaryEntriesShallow({
    from: startOfISOWeek(weekDate),
    to: endOfISOWeek(weekDate),
  });
  return (
    <DiaryEntryWeek
      user={user}
      weekDate={weekDate}
      diaryEntries={diaryEntries}
    />
  );
}
