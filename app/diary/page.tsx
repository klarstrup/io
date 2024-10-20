import { TZDate } from "@date-fns/tz";
import { endOfDay, isAfter, startOfDay, subWeeks } from "date-fns";
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
import LoadMore from "../[[...slug]]/LoadMore";
import UserStuff from "../[[...slug]]/UserStuff";
import "../page.css";
import { DiaryAgenda } from "./DiaryAgenda";
import { DiaryEntryList } from "./DiaryEntryList";

export const maxDuration = 60;
export const revalidate = 3600; // 1 hour

const weeksPerPage = 24;

type DayStr = `${number}-${number}-${number}`;

const rangeToQuery = (from: Date, to?: Date) =>
  to ? { $gte: from, $lt: to } : { $gte: from };

async function getDiaryEntries({ from, to }: { from: Date; to?: Date }) {
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
        addDiaryEntry(run.completedAt, "workouts", workoutFromRunDouble(run));
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

async function loadMoreData(cursor: string, params: Record<string, string>) {
  "use server";

  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");

  const { from, to } = JSON.parse(cursor) as {
    from?: string;
    to?: string;
  };
  if (!from) throw new Error("From not found");
  if (!to) throw new Error("To not found");

  const isAtLimit = isAfter(new Date(2013, 9), to || from);

  if (isAtLimit) return [null, null] as const;

  const [diaryEntries] = await Promise.all([
    getDiaryEntries({ from: new Date(from), to: new Date(to) }),
  ]);

  return [
    <DiaryEntryList
      diaryEntries={diaryEntries}
      pickedDate={params.date as `${number}-${number}-${number}`}
      key={JSON.stringify({ from, to })}
    />,
    JSON.stringify({ from: subWeeks(from, weeksPerPage), to: from }),
  ] as const;
}

export default async function Page({
  params,
}: {
  params: { date?: `${number}-${number}-${number}` };
}) {
  const user = (await auth())?.user;

  if (!user) {
    return (
      <div>
        <span>Hello, stranger!</span>
        <p>
          <a href="/api/auth/signin">Sign in</a>
        </p>
      </div>
    );
  }

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const now = TZDate.tz(timeZone);

  const date =
    params.date ||
    `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const from = subWeeks(now, weeksPerPage);
  const diaryEntries = await getDiaryEntries({ from });

  const initialCursor = JSON.stringify({
    from: subWeeks(from, weeksPerPage),
    to: from,
  });

  return (
    <div className="min-h-[100vh]">
      <UserStuff />
      <div className="flex min-h-[100vh] items-start">
        <div className="max-h-[100vh] w-1/3 self-stretch">
          <DiaryAgenda
            date={date}
            diaryEntry={
              (
                await getDiaryEntries({
                  from: startOfDay(new Date(date)),
                  to: endOfDay(new Date(date)),
                })
              )[0]?.[1]
            }
            user={user}
          />
        </div>
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(8em, 1fr))",
            gridTemplateRows: "repeat(auto-fit, 8em)",
            gap: "1em",
            padding: "1em",
            overflowY: "scroll",
            maxHeight: "100vh",
          }}
        >
          <LoadMore
            params={params}
            loadMoreAction={loadMoreData}
            initialCursor={initialCursor}
          >
            <DiaryEntryList
              diaryEntries={diaryEntries.slice(1)}
              pickedDate={params.date}
            />
          </LoadMore>
        </div>
      </div>
    </div>
  );
}
