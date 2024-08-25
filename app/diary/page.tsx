import { getServerSession } from "next-auth";
import { authOptions } from "../../auth";
import dbConnect from "../../dbConnect";
import { User } from "../../models/user";
import { exercises, type Fitocracy } from "../../sources/fitocracy";
import {
  getMyFitnessPalSession,
  MyFitnessPal,
} from "../../sources/myfitnesspal";
import { getRuns, type RunDouble } from "../../sources/rundouble";
import { type TopLogger } from "../../sources/toplogger";
import { allPromises, HOUR_IN_SECONDS } from "../../utils";
import ProblemByProblem from "../[[...slug]]/ProblemByProblem";
import RunByRun from "../[[...slug]]/RunByRun";
import UserStuff from "../[[...slug]]/UserStuff";
import "../page.css";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Page() {
  console.time("diary preamble");
  const DB = (await dbConnect()).connection.db;

  const workoutsCollection =
    DB.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  const foodEntriesCollection = DB.collection<MyFitnessPal.MongoFoodEntry>(
    "myfitnesspal_food_entries"
  );

  const session = await getServerSession(authOptions);

  const user = await User.findOne({ _id: session?.user.id });

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
    } catch (e) {
      return null;
    }
    if (session) {
      await user.updateOne({
        myFitnessPalUserId: session.userId,
        myFitnessPalUserName: session.user.name,
      });
    }
  }

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

  console.timeEnd("diary preamble");

  console.time("diary body");
  const [holds] = await allPromises(
    DB.collection<TopLogger.Hold>("toplogger_holds").find().toArray(),
    async () => {
      if (user.fitocracyUserId) {
        console.time("workouts");
        for await (const workout of workoutsCollection.find({
          user_id: user.fitocracyUserId,
        })) {
          addDiaryEntry(workout.workout_timestamp, "workouts", workout);
        }
        console.timeEnd("workouts");
      }
    },
    async () => {
      if (user.myFitnessPalUserId) {
        console.time("food");
        for await (const foodEntry of foodEntriesCollection.find({
          user_id: user.myFitnessPalUserId,
        })) {
          addDiaryEntry(foodEntry.datetime, "food", foodEntry);
        }
        console.timeEnd("food");
      }
    },
    async () => {
      if (user.topLoggerId) {
        console.time("ascends");
        const ascends = await DB.collection<TopLogger.AscendSingle>(
          "toplogger_ascends"
        )
          .find({ user_id: user.topLoggerId })
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
        console.timeEnd("ascends");
      }
    },
    async () => {
      if (user.runDoubleId) {
        console.time("runs");
        for (const run of await getRuns(user.runDoubleId, {
          maxAge: HOUR_IN_SECONDS * 12,
        })) {
          addDiaryEntry(new Date(run.completed), "runs", run);
        }
        console.timeEnd("runs");
      }
    }
  );

  console.time("diary sort");
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
  //  console.log(diary["2024-8-20"]);
  //  console.log(diaryEntries);
  console.timeEnd("diary sort");

  console.timeEnd("diary body");
  return (
    <div>
      <UserStuff />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(20em, 1fr))",
          gap: "1em",
          padding: "1em",
        }}
      >
        {diaryEntries.map(([date, { food, workouts, ascends, runs }]) => {
          const dayTotalEnergy = food?.reduce(
            (acc, foodEntry) =>
              acc + foodEntry.nutritional_contents.energy.value,
            0
          );
          const dayTotalProtein = food?.reduce(
            (acc, foodEntry) =>
              acc + (foodEntry.nutritional_contents.protein || 0),
            0
          );

          return (
            <div
              key={date}
              style={{
                boxShadow: "0 0 2em rgba(0, 0, 0, 0.2)",
                borderRadius: "1.5em",
                background: "white",
                display: "flex",
                flexDirection: "column",
                padding: "0.5em",
              }}
            >
              <div
                style={{
                  marginBottom: "0.5em",
                  marginLeft: "1em",
                }}
              >
                <big>{date}</big>{" "}
                {dayTotalEnergy && dayTotalProtein ? (
                  <small>
                    {Math.round(dayTotalEnergy)} kcal,{" "}
                    {Math.round(dayTotalProtein)}g protein
                  </small>
                ) : null}
              </div>
              <div style={{ flex: "1" }}>
                <div>
                  {food ? (
                    <>
                      <small>Meals:</small>
                      <ol>
                        {[
                          MyFitnessPal.MealName.Breakfast,
                          MyFitnessPal.MealName.Lunch,
                          MyFitnessPal.MealName.Dinner,
                          MyFitnessPal.MealName.Snacks,
                        ]
                          .filter((mealName) =>
                            food?.some(
                              (foodEntry) => foodEntry.meal_name === mealName
                            )
                          )
                          .map((mealName) => {
                            const mealTotalEnergy = food
                              ?.filter(
                                (foodEntry) => foodEntry.meal_name === mealName
                              )
                              .reduce(
                                (acc, foodEntry) =>
                                  acc +
                                  foodEntry.nutritional_contents.energy.value,
                                0
                              );
                            const mealTotalProtein = food
                              ?.filter(
                                (foodEntry) => foodEntry.meal_name === mealName
                              )
                              .reduce(
                                (acc, foodEntry) =>
                                  acc +
                                  (foodEntry.nutritional_contents.protein || 0),
                                0
                              );

                            return (
                              <li key={mealName}>
                                <div>
                                  <b>{mealName}</b>{" "}
                                  {mealTotalEnergy && mealTotalProtein ? (
                                    <small>
                                      {Math.round(mealTotalEnergy)} kcal,{" "}
                                      {Math.round(mealTotalProtein)}g protein
                                    </small>
                                  ) : null}
                                </div>
                                <ul>
                                  {food
                                    ?.filter(
                                      (foodEntry) =>
                                        foodEntry.meal_name === mealName
                                    )
                                    .map((foodEntry) => (
                                      <li
                                        key={foodEntry.id}
                                        style={{ listStyle: "none" }}
                                      >
                                        {foodEntry.food.description}
                                        <small>
                                          {" "}
                                          {foodEntry.servings *
                                            foodEntry.serving_size.value !==
                                          1 ? (
                                            <>
                                              {foodEntry.servings *
                                                foodEntry.serving_size
                                                  .value}{" "}
                                              {foodEntry.serving_size.unit.match(
                                                /container/i
                                              )
                                                ? "x "
                                                : null}
                                            </>
                                          ) : null}
                                          {foodEntry.serving_size.unit.match(
                                            /container/i
                                          )
                                            ? foodEntry.serving_size.unit.replace(
                                                /(container \((.+)\))/i,
                                                "$2"
                                              )
                                            : foodEntry.serving_size.unit}
                                        </small>
                                      </li>
                                    ))}
                                </ul>
                              </li>
                            );
                          })}
                      </ol>
                    </>
                  ) : null}
                </div>
                <div>
                  {workouts?.length ? (
                    <>
                      <small>Lifts:</small>
                      {workouts?.map((workout) => (
                        <div
                          key={workout.id}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                          }}
                        >
                          {workout.root_group.children.map((workoutGroup) => {
                            const exercise = exercises.find(
                              ({ id }) =>
                                workoutGroup.exercise.exercise_id === id
                            )!;
                            return (
                              <div key={workoutGroup.id}>
                                <b style={{ whiteSpace: "nowrap" }}>
                                  {(
                                    exercise.aliases[1] || exercise.name
                                  ).replace("Barbell", "")}
                                </b>
                                <ol>
                                  {workoutGroup.exercise.sets.map((set) => (
                                    <li
                                      key={set.id}
                                      style={{ whiteSpace: "nowrap" }}
                                    >
                                      {set.description_string}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </>
                  ) : null}
                  {ascends?.length ? (
                    <>
                      <small>Climbs:</small>
                      <big>
                        <ProblemByProblem
                          problemByProblem={ascends
                            .sort(
                              (a, b) =>
                                Number(b.date_logged) - Number(a.date_logged)
                            )
                            .map(({ climb: { grade, hold_id }, checks }) => ({
                              number: "",
                              color:
                                holds.find((hold) => hold.id === hold_id)
                                  ?.color || undefined,
                              grade: Number(grade) || undefined,
                              attempt: true,
                              // TopLogger does not do zones, at least not for Beta Boulders
                              zone: checks >= 1,
                              top: checks >= 1,
                              flash: checks >= 2,
                            }))}
                        />
                      </big>
                    </>
                  ) : null}
                  {runs?.length ? (
                    <>
                      <small>Runs:</small>
                      <RunByRun
                        runByRun={runs.map(
                          (run) =>
                            ({
                              date: new Date(run.completedLong),
                              distance: run.runDistance,
                              duration: run.runTime,
                              pace: run.runPace,
                            } as const)
                        )}
                      />
                    </>
                  ) : null}
                </div>
              </div>
              <hr />
              <small
                style={{
                  textAlign: "center",
                  display: "flex",
                  justifyContent: "space-evenly",
                  opacity: 0.5,
                }}
              >
                {!food?.length ? <i>No meals logged</i> : null}
                {!workouts?.length ? <i>No lifts logged</i> : null}
                {!ascends?.length ? <i>No climbs logged</i> : null}
                {!runs?.length ? <i>No runs logged</i> : null}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
