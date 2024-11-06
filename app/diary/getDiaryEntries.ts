import { TZDate } from "@date-fns/tz";
import { auth } from "../../auth";
import type { DiaryEntry } from "../../lib";
import { Workouts } from "../../models/workout.server";
import { workoutFromFitocracyWorkout } from "../../sources/fitocracy";
import { FitocracyWorkouts } from "../../sources/fitocracy.server";
import { MyFitnessPalFoodEntries } from "../../sources/myfitnesspal.server";
import { workoutFromRunDouble } from "../../sources/rundouble";
import { RunDoubleRuns } from "../../sources/rundouble.server";
import {
  type TopLogger,
  workoutFromTopLoggerAscends,
} from "../../sources/toplogger";
import {
  TopLoggerAscends,
  TopLoggerClimbs,
  TopLoggerGyms,
  TopLoggerHolds,
} from "../../sources/toplogger.server";
import { allPromises, DEFAULT_TIMEZONE } from "../../utils";

type DayStr = `${number}-${number}-${number}`;

const rangeToQuery = (from: Date, to?: Date) =>
  to ? { $gte: from, $lt: to } : { $gte: from };

export async function getDiaryEntries({ from, to }: { from: Date; to?: Date }) {
  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const now = TZDate.tz(timeZone);
  const todayStr = `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}`;
  const diary: Record<DayStr, DiaryEntry> = !to ? { [todayStr]: {} } : {};
  function addDiaryEntry<K extends keyof (typeof diary)[keyof typeof diary]>(
    date: Date,
    key: K,
    entry: NonNullable<DiaryEntry[K]>[number],
  ) {
    const dayStr: DayStr = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    let day = diary[dayStr];
    if (!day) {
      day = {};
    }
    let dayEntries = day[key];
    if (!dayEntries) {
      dayEntries = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    dayEntries.push(entry as any);
    day[key] = dayEntries;

    diary[dayStr] = day;
  }

  await allPromises(
    async () => {
      for await (const workout of Workouts.find({
        userId: user.id,
        deletedAt: { $exists: false },
        workedOutAt: rangeToQuery(from, to),
      })) {
        addDiaryEntry(workout.workedOutAt, "workouts", {
          ...workout,
          _id: workout._id.toString(),
        });
      }
    },
    async () => {
      if (!user.fitocracyUserId) return;

      for await (const fitocracyWorkout of FitocracyWorkouts.find({
        user_id: user.fitocracyUserId,
        workout_timestamp: rangeToQuery(from, to),
      })) {
        const workout = workoutFromFitocracyWorkout(fitocracyWorkout);
        addDiaryEntry(workout.workedOutAt, "workouts", {
          ...workout,
          _id: workout._id.toString(),
        });
      }
    },
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
      if (!user.topLoggerId) return;

      const [holds, gyms, ascends] = await Promise.all([
        TopLoggerHolds.find().toArray(),
        TopLoggerGyms.find().toArray(),
        TopLoggerAscends.find({
          user_id: user.topLoggerId,
          date_logged: rangeToQuery(from, to),
        }).toArray(),
      ]);

      const climbs = await TopLoggerClimbs.find({
        id: { $in: ascends.map(({ climb_id }) => climb_id) },
      }).toArray();

      const ascendsByDay = Object.values(
        ascends.reduce(
          (acc, ascend) => {
            if (!ascend.date_logged) return acc;
            const date = `${ascend.date_logged.getFullYear()}-${
              ascend.date_logged.getMonth() + 1
            }-${ascend.date_logged.getDate()}`;
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push(ascend);

            return acc;
          },
          {} as Record<string, TopLogger.AscendSingle[]>,
        ),
      );
      for (const dayAscends of ascendsByDay) {
        addDiaryEntry(
          dayAscends[0]!.date_logged,
          "workouts",
          workoutFromTopLoggerAscends(
            dayAscends.map((ascend) => ({
              ...ascend,
              climb: climbs.find(({ id }) => id === ascend.climb_id)!,
            })),
            holds,
            gyms,
          ),
        );
      }
    },
    async () => {
      if (!user.runDoubleId) return;

      for await (const run of RunDoubleRuns.find({
        userId: user.runDoubleId,
        completedAt: rangeToQuery(from, to),
      })) {
        const workout = workoutFromRunDouble(run);
        addDiaryEntry(run.completedAt, "workouts", {
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
