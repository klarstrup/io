import dbConnect from "../../dbConnect";
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
  getMyFitnessPalSession,
} from "../../sources/myfitnesspal";

let exercisesById = exercises;

export const dynamic = "force-dynamic";

export default async function Page() {
  // Io is the only user in the database,
  const user = (await User.findOne())!;

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

  const workoutsCollection = (
    await dbConnect()
  ).connection.db.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  console.log(await getMyFitnessPalReport(user.myFitnessPalToken!, 2024));
  console.log(await getMyFitnessPalSession(user.myFitnessPalToken!));

  const diary: Record<
    `${number}-${number}-${number}`,
    {
      workouts?: Fitocracy.MongoWorkout[];
      food?: MyFitnessPal.FoodEntry[];
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

  for (const year of [
    2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013,
    2012, 2011,
  ]) {
    for (const entry of await getMyFitnessPalReport(
      user.myFitnessPalToken!,
      year
    )) {
      for (const foodEntry of entry.food_entries) {
        addDiaryEntry(new Date(entry.date), "food", foodEntry);
      }
    }
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
      {diaryEntries.map(([date, { food, workouts }]) => (
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
        </div>
      ))}
    </div>
  );
}
