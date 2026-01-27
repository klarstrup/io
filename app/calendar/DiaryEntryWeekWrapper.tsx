import { endOfISOWeek, startOfISOWeek } from "date-fns";
import type { Session } from "next-auth";
import type { LocationData } from "../../models/location";
import { getDiaryEntriesShallow } from "./getDiaryEntries";
import { DiaryEntryWeek } from "./DiaryEntryWeek";

export async function DiaryEntryWeekWrapper({
  user,
  weekDate,
}: {
  user?: Session["user"];
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
