import type { DiaryEntry } from "../../lib";
import { DiaryEntryItem } from "./DiaryEntryItem";

export function DiaryEntryList({
  pickedDate,
  diaryEntries,
}: {
  pickedDate?: `${number}-${number}-${number}`;
  diaryEntries: [`${number}-${number}-${number}`, DiaryEntry][];
}) {
  return diaryEntries.map((diaryEntry) => (
    <DiaryEntryItem
      key={diaryEntry[0]}
      pickedDate={pickedDate}
      diaryEntry={diaryEntry}
    />
  ));
}
