import { TZDate } from "@date-fns/tz";
import { auth } from "../../auth";
import type { DiaryEntry } from "../../lib";
import { getAllWorkouts } from "../../models/workout.server";
import { MyFitnessPalFoodEntries } from "../../sources/myfitnesspal.server";
import { allPromises, dateToString, DEFAULT_TIMEZONE } from "../../utils";

type DayStr = `${number}-${number}-${number}`;

const rangeToQuery = (from: Date, to?: Date) =>
  to ? { $gte: from, $lt: to } : { $gte: from };

export async function getDiaryEntries({ from, to }: { from: Date; to?: Date }) {
  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const now = TZDate.tz(timeZone);
  const todayStr = dateToString(now);
  const diary: Record<DayStr, DiaryEntry> = !to ? { [todayStr]: {} } : {};
  function addDiaryEntry<K extends keyof (typeof diary)[keyof typeof diary]>(
    date: Date,
    key: K,
    entry: NonNullable<DiaryEntry[K]>[number],
  ) {
    const dayStr: DayStr = dateToString(date);
    let day = diary[dayStr];
    if (!day) day = {};

    let dayEntries = day[key];
    if (!dayEntries) dayEntries = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    dayEntries.push(entry as any);
    day[key] = dayEntries;

    diary[dayStr] = day;
  }

  await allPromises(
    async () => {
      if (!user.myFitnessPalUserId) return;

      for await (const foodEntry of MyFitnessPalFoodEntries.find({
        user_id: user.myFitnessPalUserId,
        datetime: rangeToQuery(from, to),
      })) {
        addDiaryEntry(foodEntry.datetime, "food", {
          ...foodEntry,
          _id: foodEntry._id.toString(),
        });
      }
    },
    async () => {
      for (const workout of await getAllWorkouts({
        user,
        workedOutAt: rangeToQuery(from, to),
      })) {
        addDiaryEntry(workout.workedOutAt, "workouts", {
          ...workout,
          _id: workout._id.toString(),
        });
      }
    },
  );

  const diaryEntries = Object.entries(diary).sort(
    ([a], [b]) =>
      new Date(
        Number(b.split("-")[0]),
        Number(b.split("-")[1]) - 1,
        Number(b.split("-")[2]),
      ).getTime() -
      new Date(
        Number(a.split("-")[0]),
        Number(a.split("-")[1]) - 1,
        Number(a.split("-")[2]),
      ).getTime(),
  ) as [DayStr, DiaryEntry][];

  return diaryEntries;
}
