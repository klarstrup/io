import { endOfISOWeek, startOfISOWeek } from "date-fns";
import type { IUser } from "../../models/user";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { getDiaryEntriesShallow } from "./getDiaryEntries";

export async function DiaryEntryWeekWrapper({
  user,
  weekDate,
}: {
  user?: IUser;
  weekDate: Date;
}) {
  const diaryEntries =
    user &&
    (await getDiaryEntriesShallow({
      from: startOfISOWeek(weekDate),
      to: endOfISOWeek(weekDate),
    }));
  return (
    <DiaryEntryWeek
      user={user}
      weekDate={weekDate}
      diaryEntries={diaryEntries}
    />
  );
}
