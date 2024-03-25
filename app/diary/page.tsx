import { getServerSession } from "next-auth";
import { authOptions } from "../../auth";
import dbConnect from "../../dbConnect";
import Grade from "../../grades";
import { User } from "../../models/user";
import {
  Fitocracy,
  exercises,
  getExercises,
  getUserProfileBySessionId,
} from "../../sources/fitocracy";
import {
  MyFitnessPal,
  getMyFitnessPalReport,
} from "../../sources/myfitnesspal";
import { RunDouble, getRuns } from "../../sources/rundouble";
import { TopLogger, getAscends, getUser } from "../../sources/toplogger";
import { HOUR_IN_SECONDS } from "../../utils";

let exercisesById = exercises;

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);

  const user = await User.findOne({ _id: session?.user.id });

  const fitocracySessionId = user?.fitocracySessionId;
  if (!fitocracySessionId) return null;

  let fitocracyUserId = user.fitocracyUserId;
  if (!fitocracyUserId) {
    const fitocracySessionId = user?.fitocracySessionId;
    if (!fitocracySessionId) return null;
    let fitocracyProfile: Fitocracy.ProfileData;
    try {
      fitocracyProfile = await getUserProfileBySessionId(fitocracySessionId);
    } catch (e) {
      return null;
    }
    fitocracyUserId = fitocracyProfile.id;
    await user.updateOne({ fitocracyUserId });
  }

  if (!exercisesById) {
    exercisesById = await getExercises(fitocracySessionId);
  }

  const topLoggerId = user?.topLoggerId;
  let topLoggerUser: TopLogger.UserSingle | null = null;
  try {
    topLoggerUser = topLoggerId ? await getUser(topLoggerId) : null;
  } catch (e) {
    /* */
  }
  const topLoggerUserId = topLoggerUser?.id;

  const workoutsCollection = (
    await dbConnect()
  ).connection.db.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  const diary: Record<
    `${number}-${number}-${number}`,
    {
      workouts?: Fitocracy.MongoWorkout[];
      food?: MyFitnessPal.FoodEntry[];
      ascends?: (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[];
      runs?: RunDouble.HistoryItem[];
    }
  > = {};
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
  for await (const workout of workoutsCollection.find(
    { user_id: fitocracyUserId },
    { sort: { workout_timestamp: -1 } }
  )) {
    addDiaryEntry(workout.workout_timestamp, "workouts", workout);
  }

  for (const year of [2024, 2023, 2022, 2021, 2020, 2019, 2018]) {
    for (const entry of await getMyFitnessPalReport(
      user.myFitnessPalToken!,
      year
    )) {
      for (const foodEntry of entry.food_entries) {
        addDiaryEntry(new Date(entry.date), "food", foodEntry);
      }
    }
  }

  for (const ascend of (await getAscends(
    { filters: { user_id: topLoggerUserId }, includes: ["climb"] },
    { maxAge: HOUR_IN_SECONDS }
  )) as (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[]) {
    if (!ascend.date_logged) continue;
    addDiaryEntry(new Date(ascend.date_logged), "ascends", ascend);
  }

  for (const run of await getRuns(user.runDoubleId!)) {
    addDiaryEntry(new Date(run.completed), "runs", run);
  }

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
  );

  return (
    <div>
      {diaryEntries.map(([date, { food, workouts, ascends, runs }]) => (
        <div key={date}>
          <h3>{date}</h3>
          {food?.length ? (
            <ol>
              {[
                MyFitnessPal.MealName.Breakfast,
                MyFitnessPal.MealName.Lunch,
                MyFitnessPal.MealName.Dinner,
                MyFitnessPal.MealName.Snacks,
              ]
                .filter((mealName) =>
                  food.some((foodEntry) => foodEntry.meal_name === mealName)
                )
                .map((mealName) => (
                  <li key={mealName}>
                    <b>{mealName}</b>
                    <ul>
                      {food
                        .filter((foodEntry) => foodEntry.meal_name === mealName)
                        .map((foodEntry) => (
                          <li key={foodEntry.id}>
                            {foodEntry.food.description}{" "}
                            {foodEntry.nutritional_contents.energy.value}kcal
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
            </ol>
          ) : null}
          {workouts?.map((workout) => (
            <ol key={workout.id} style={{ display: "flex", gap: "4em" }}>
              {workout.root_group.children.map((exercise) => (
                <li key={exercise.id}>
                  <b>
                    {
                      exercisesById?.find(
                        ({ id }) => exercise.exercise.exercise_id === id
                      )?.name
                    }
                  </b>
                  <ol>
                    {exercise.exercise.sets.map((set) => (
                      <li key={set.id}>
                        {set.description_string} {set.points}pts
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          ))}
          {ascends?.length ? (
            <ol>
              {ascends.map((ascend) => (
                <li key={ascend.climb.id}>
                  <b>{new Grade(Number(ascend.climb.grade)).name}</b>
                </li>
              ))}
            </ol>
          ) : null}
          {runs?.length ? (
            <ol>
              {runs.map((run) => (
                <li key={run.key}>
                  {run.runDistance}m {run.runTime}ms
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ))}
    </div>
  );
}
