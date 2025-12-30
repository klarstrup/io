import { endOfISOWeek, startOfISOWeek } from "date-fns";
import type { Session } from "next-auth";
import type { LocationData } from "../../models/location";
import { getDiaryEntriesShallow } from "./getDiaryEntries";
import { DiaryEntryWeek } from "./DiaryEntryWeek";

export async function DiaryEntryWeekWrapper({
  user,
  weekDate,
  locations,
}: {
  user?: Session["user"];
  weekDate: Date;
  locations?: (LocationData & { id: string })[];
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
      locations={locations}
    />
  );
}
