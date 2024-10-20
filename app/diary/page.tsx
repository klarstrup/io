import { TZDate } from "@date-fns/tz";
import { isAfter, startOfDay, subWeeks } from "date-fns";
import { ObjectId } from "mongodb";
import type { Session } from "next-auth";
import { auth } from "../../auth";
import { getDB } from "../../dbConnect";
import type { DiaryEntry } from "../../lib";
import type { IUser } from "../../models/user";
import type { WorkoutData } from "../../models/workout";
import { getNextSets } from "../../models/workout.server";
import {
  type Fitocracy,
  workoutFromFitocracyWorkout,
} from "../../sources/fitocracy";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import { getMyFitnessPalSession } from "../../sources/myfitnesspal.server";
import { type RunDouble, workoutFromRunDouble } from "../../sources/rundouble";
import {
  type TopLogger,
  workoutFromTopLoggerAscends,
} from "../../sources/toplogger";
import { allPromises, DEFAULT_TIMEZONE } from "../../utils";
import LoadMore from "../[[...slug]]/LoadMore";
import UserStuff from "../[[...slug]]/UserStuff";
import "../page.css";
import { DiaryAgenda } from "./DiaryAgenda";
import { DiaryEntryList } from "./DiaryEntryList";

export const maxDuration = 60;
export const revalidate = 3600; // 1 hour

const weeksPerPage = 4;

type DayStr = `${number}-${number}-${number}`;

const rangeToQuery = (from: Date, to?: Date) =>
  to ? { $gte: from, $lt: to } : { $gte: from };

const getAllWorkoutLocations = async (user: Session["user"]) => {
  const DB = await getDB();
  const workoutsCollection = DB.collection<WorkoutData>("workouts");

  return (
    await workoutsCollection.distinct("location", {
      userId: user.id,
      deletedAt: { $exists: false },
    })
  ).filter((loc): loc is string => Boolean(loc));
};

async function getDiaryEntries({ from, to }: { from: Date; to?: Date }) {
  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const DB = await getDB();

  const workoutsCollection =
    DB.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  const runsCollection =
    DB.collection<RunDouble.MongoHistoryItem>("rundouble_runs");

  const foodEntriesCollection = DB.collection<MyFitnessPal.MongoFoodEntry>(
    "myfitnesspal_food_entries",
  );

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
      for await (const workout of DB.collection<WorkoutData>("workouts").find({
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

      for await (const fitocracyWorkout of workoutsCollection.find({
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

      for await (const foodEntry of foodEntriesCollection.find({
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
        DB.collection<TopLogger.Hold>("toplogger_holds").find().toArray(),
        DB.collection<TopLogger.GymSingle>("toplogger_gyms").find().toArray(),
        DB.collection<TopLogger.AscendSingle>("toplogger_ascends")
          .find({
            user_id: user.topLoggerId,
            date_logged: rangeToQuery(from, to),
          })
          .toArray(),
      ]);

      const climbs = await DB.collection<TopLogger.ClimbMultiple>(
        "toplogger_climbs",
      )
        .find({ id: { $in: ascends.map(({ climb_id }) => climb_id) } })
        .toArray();

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

      for await (const run of runsCollection.find({
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

async function loadMoreData(cursor: string) {
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

  const [diaryEntries, allLocations, nextSets] = await Promise.all([
    getDiaryEntries({ from: new Date(from), to: new Date(to) }),
    getAllWorkoutLocations(user),
    getNextSets({ user, to: startOfDay(new Date()) }),
  ]);

  return [
    <DiaryEntryList
      diaryEntries={diaryEntries}
      user={user}
      locations={allLocations}
      nextSets={nextSets}
      key={JSON.stringify({ from, to })}
    />,
    JSON.stringify({ from: subWeeks(from, weeksPerPage), to: from }),
  ] as const;
}

export default async function Page() {
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

  const DB = await getDB();

  const from = subWeeks(now, weeksPerPage);
  const [[todayDiaryEntry, ...diaryEntries], allLocations, nextSets] =
    await Promise.all([
      getDiaryEntries({ from }),
      getAllWorkoutLocations(user),
      getNextSets({ user, to: startOfDay(now) }),
      (async () => {
        if (!user.myFitnessPalUserId || !user.myFitnessPalUserName) {
          const myFitnessPalToken = user?.myFitnessPalToken;
          if (myFitnessPalToken) {
            try {
              const session = await getMyFitnessPalSession(myFitnessPalToken);
              await DB.collection<IUser>("users").updateOne(
                { _id: new ObjectId(user.id) },
                {
                  $set: {
                    myFitnessPalUserId: session.userId,
                    myFitnessPalUserName: session.user.name,
                  },
                },
              );
            } catch {
              /* empty */
            }
          }
        }
      })(),
    ]);

  const initialCursor = JSON.stringify({
    from: subWeeks(from, weeksPerPage),
    to: from,
  });

  return (
    <div>
      <UserStuff />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 1fr)",
          gridTemplateRows: "masonry",
          gap: "1em",
          padding: "1em",
          maxWidth: "64em",
          margin: "0 auto",
        }}
      >
        <DiaryAgenda
          diaryEntry={todayDiaryEntry!}
          user={user}
          locations={allLocations}
          nextSets={nextSets}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(12em, 1fr))",
          gridTemplateRows: "masonry",
          gap: "1em",
          padding: "1em",
        }}
      >
        <LoadMore loadMoreAction={loadMoreData} initialCursor={initialCursor}>
          <DiaryEntryList
            diaryEntries={diaryEntries}
            user={user}
            locations={allLocations}
            nextSets={nextSets}
          />
        </LoadMore>
      </div>
    </div>
  );
}
