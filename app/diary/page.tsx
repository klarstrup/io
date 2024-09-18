import { isAfter, isWithinInterval, subMonths } from "date-fns";
import { auth } from "../../auth";
import { getDB } from "../../dbConnect";
import type { DiaryEntry } from "../../lib";
import { User } from "../../models/user";
import { Workout } from "../../models/workout";
import {
  type Fitocracy,
  workoutFromFitocracyWorkout,
} from "../../sources/fitocracy";
import {
  getMyFitnessPalSession,
  MyFitnessPal,
} from "../../sources/myfitnesspal";
import { getRuns } from "../../sources/rundouble";
import type { TopLogger } from "../../sources/toplogger";
import { allPromises, HOUR_IN_SECONDS } from "../../utils";
import LoadMore from "../[[...slug]]/LoadMore";
import UserStuff from "../[[...slug]]/UserStuff";
import "../page.css";
import { DiaryEntryList } from "./DiaryEntryList";
import { WorkoutForm } from "./WorkoutForm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const monthsPerPage = 1;

async function getDiaryEntries({ from, to }: { from: Date; to?: Date }) {
  const user = (await auth())?.user;

  if (!user) {
    return [];
  }
  const DB = await getDB();

  const workoutsCollection =
    DB.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  const foodEntriesCollection = DB.collection<MyFitnessPal.MongoFoodEntry>(
    "myfitnesspal_food_entries"
  );
  const diary: Record<`${number}-${number}-${number}`, DiaryEntry> = {};
  function addDiaryEntry<K extends keyof (typeof diary)[keyof typeof diary]>(
    date: Date,
    key: K,
    entry: NonNullable<(typeof diary)[keyof typeof diary][K]>[number]
  ) {
    const dayStr: `${number}-${number}-${number}` = `${date.getFullYear()}-${
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
      for await (const workout of Workout.find({
        user_id: user.id,
      })) {
        if (
          isWithinInterval(workout.worked_out_at, {
            start: from,
            end: to || new Date(),
          })
        ) {
          addDiaryEntry(workout.worked_out_at, "workouts", {
            ...workout.toJSON(),
            _id: workout._id.toString(),
          });
        }
      }
      if (user.fitocracyUserId) {
        for await (const fitocracyWorkout of workoutsCollection.find({
          user_id: user.fitocracyUserId,
          workout_timestamp: { $gte: from, $lt: to },
        })) {
          const workout = workoutFromFitocracyWorkout(fitocracyWorkout);
          addDiaryEntry(workout.worked_out_at, "workouts", workout);
        }
      }
    },
    async () => {
      if (user.myFitnessPalUserId) {
        for await (const foodEntry of foodEntriesCollection.find({
          user_id: user.myFitnessPalUserId,
          datetime: { $gte: from, $lt: to },
        })) {
          addDiaryEntry(foodEntry.datetime, "food", foodEntry);
        }
      }
    },
    async () => {
      if (user.topLoggerId) {
        const ascends = await DB.collection<TopLogger.AscendSingle>(
          "toplogger_ascends"
        )
          .find({
            user_id: user.topLoggerId,
            date_logged: { $gte: from, $lt: to },
          })
          .toArray();

        const climbs = await DB.collection<TopLogger.ClimbMultiple>(
          "toplogger_climbs"
        )
          .find({ id: { $in: ascends.map(({ climb_id }) => climb_id) } })
          .toArray();

        for (const ascend of ascends) {
          if (!ascend.date_logged) continue;
          addDiaryEntry(ascend.date_logged, "ascends", {
            ...ascend,
            climb: climbs.find(({ id }) => id === ascend.climb_id)!,
          });
        }
      }
    },
    async () => {
      if (user.runDoubleId) {
        for (const run of await getRuns(user.runDoubleId, {
          maxAge: HOUR_IN_SECONDS * 12,
        })) {
          if (
            isWithinInterval(new Date(run.completedLong), {
              start: from,
              end: to || new Date(),
            })
          ) {
            addDiaryEntry(new Date(run.completed), "runs", run);
          }
        }
      }
    }
  );

  const diaryEntries = Object.entries(diary).sort(
    ([a], [b]) =>
      new Date(
        Number(b.split("-")[0]),
        Number(b.split("-")[1]) - 1,
        Number(b.split("-")[2])
      ).getTime() -
      new Date(
        Number(a.split("-")[0]),
        Number(a.split("-")[1]) - 1,
        Number(a.split("-")[2])
      ).getTime()
  ) as [`${number}-${number}-${number}`, DiaryEntry][];

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

  const isAtLimit = isAfter(new Date(2013, 9), to || from || new Date());

  if (isAtLimit) return [null, null] as const;

  const diaryEntries = await getDiaryEntries({
    from: new Date(from),
    to: new Date(to),
  });

  return [
    <DiaryEntryList
      diaryEntries={diaryEntries}
      user={user}
      key={JSON.stringify({ from, to })}
    />,
    JSON.stringify({ from: subMonths(from, monthsPerPage), to: from }),
  ] as const;
}

export default async function Page() {
  const user = (await auth())?.user;

  if (!user)
    return (
      <div>
        <span>Hello, stranger!</span>
        <p>
          <a href="/api/auth/signin">Sign in</a>
        </p>
      </div>
    );

  if (!user.myFitnessPalUserId || !user.myFitnessPalUserName) {
    const myFitnessPalToken = user?.myFitnessPalToken;
    if (!myFitnessPalToken) return null;
    let session: MyFitnessPal.Session;
    try {
      session = await getMyFitnessPalSession(myFitnessPalToken);
    } catch {
      return null;
    }
    if (session) {
      await User.updateOne(
        { _id: user.id },
        {
          myFitnessPalUserId: session.userId,
          myFitnessPalUserName: session.user.name,
        }
      );
    }
  }

  const from = subMonths(new Date(), monthsPerPage);
  const to = undefined;
  const diaryEntries = await getDiaryEntries({ from, to });

  const initialCursor = JSON.stringify({
    from: subMonths(from, monthsPerPage),
    to: from,
  });

  return (
    <div>
      <UserStuff />
      <fieldset>
        <legend>New workout</legend>
        <WorkoutForm user={user} />
      </fieldset>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(20em, 1fr))",
          gridTemplateRows: "masonry",
          gap: "1em",
          padding: "1em",
        }}
      >
        <LoadMore loadMoreAction={loadMoreData} initialCursor={initialCursor}>
          <DiaryEntryList diaryEntries={diaryEntries} user={user} />
        </LoadMore>
      </div>
    </div>
  );
}
