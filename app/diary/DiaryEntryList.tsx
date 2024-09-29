import type { Session } from "next-auth";
import type { DiaryEntry } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import { DiaryEntryItem } from "./DiaryEntryItem";

export function DiaryEntryList({
  diaryEntries,
  user,
  locations,
  nextSets,
}: {
  diaryEntries: [`${number}-${number}-${number}`, DiaryEntry][];
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
}) {
  return diaryEntries.map((diaryEntry) => (
    <DiaryEntryItem
      key={diaryEntry[0]}
      diaryEntry={diaryEntry}
      user={user}
      locations={locations}
      nextSets={nextSets}
    />
  ));
}
