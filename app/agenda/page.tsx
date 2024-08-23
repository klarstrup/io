import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  isToday,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth";
import dbConnect from "../../dbConnect";
import type { DateInterval } from "../../lib";
import { User } from "../../models/user";
import {
  Fitocracy,
  exerciseIdsThatICareAbout,
  exercises,
} from "../../sources/fitocracy";
import {
  MyFitnessPal,
  getMyFitnessPalSession,
} from "../../sources/myfitnesspal";
import { getRuns, type RunDouble } from "../../sources/rundouble";
import { type TopLogger } from "../../sources/toplogger";
import { allPromises, HOUR_IN_SECONDS, unique } from "../../utils";
import ProblemByProblem from "../[[...slug]]/ProblemByProblem";
import UserStuff from "../[[...slug]]/UserStuff";
import "../page.css";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Page() {
  const DB = (await dbConnect()).connection.db;

  const allDayToday: DateInterval = {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  };
  const allDayTomorrow: DateInterval = {
    start: startOfDay(addDays(new Date(), 1)),
    end: endOfDay(addDays(new Date(), 1)),
  };
  const allDayTodayAndTomorrow: DateInterval = {
    start: allDayToday.start,
    end: allDayTomorrow.end,
  };

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

  const holds: TopLogger.Hold[] = await DB.collection<TopLogger.Hold>(
    "toplogger_holds"
  )
    .find()
    .toArray();

  const nextSets = (
    await Promise.all(
      exerciseIdsThatICareAbout.map(
        async (id) =>
          [
            id,
            (await workoutsCollection.findOne(
              { "root_group.children.exercise.exercise_id": id },
              { sort: { workout_timestamp: -1 } }
            ))!,
          ] as const
      )
    )
  )
    .map(([id, workout]) => {
      const { workout_timestamp } = workout;
      const { exercise } = workout.root_group.children.find(
        ({ exercise: { exercise_id } }) => exercise_id === id
      )!;

      const heaviestSet = exercise.sets.reduce((acc, set) => {
        const setWeight = set.inputs.find(
          (input) => input.type === Fitocracy.InputType.Weight
        )?.value;
        const accWeight = acc?.inputs.find(
          (input) => input.type === Fitocracy.InputType.Weight
        )?.value;
        return setWeight && accWeight && setWeight > accWeight ? set : acc;
      }, exercise.sets[0]);

      const workingSets = exercise.sets.filter(
        (set) =>
          set.inputs.find((input) => input.type === Fitocracy.InputType.Weight)
            ?.value ===
          heaviestSet?.inputs.find(
            (input) => input.type === Fitocracy.InputType.Weight
          )?.value
      );

      let successful = true;
      if (
        workingSets.length >= 3 ||
        (exercise.exercise_id === 3 && workingSets.length >= 1)
      ) {
        if (
          workingSets.every(
            ({ inputs }) =>
              inputs.find(({ type }) => type === Fitocracy.InputType.Reps)!
                .value < 5
          )
        ) {
          successful = false;
        }
      } else {
        successful = false;
      }

      const nextWorkingSet = successful
        ? ([1, 183, 532].includes(exercise.exercise_id) ? 1.25 : 2.5) +
          (heaviestSet?.inputs.find(
            (input) => input.type === Fitocracy.InputType.Weight
          )?.value || 0)
        : 0.9 *
          (heaviestSet?.inputs.find(
            (input) => input.type === Fitocracy.InputType.Weight
          )?.value || 0);

      return {
        workout_timestamp,
        exercise_id: exercise.exercise_id,
        exercise: exercises.find(({ id }) => id === exercise.exercise_id)!,
        successful,
        nextWorkingSet: String(nextWorkingSet).endsWith(".25")
          ? nextWorkingSet - 0.25
          : nextWorkingSet,
      };
    })
    .sort(
      (a, b) =>
        (a?.workout_timestamp.getTime() || 0) -
        (b?.workout_timestamp.getTime() || 0)
    );

  console.log(nextSets);

  const [gyms] = await allPromises(
    DB.collection<TopLogger.GymSingle>("toplogger_gyms").find().toArray(),
    (async () => {
      if (user.fitocracyUserId) {
        console.time("workouts");
        for await (const workout of workoutsCollection.find({
          user_id: user.fitocracyUserId,
          workout_timestamp: {
            $gte: allDayTodayAndTomorrow.start,
            $lt: allDayTodayAndTomorrow.end,
          },
        })) {
          addDiaryEntry(workout.workout_timestamp, "workouts", workout);
        }
        console.timeEnd("workouts");
      }
    })(),
    async () => {
      if (user.myFitnessPalUserId) {
        console.time("food");
        for await (const foodEntry of foodEntriesCollection.find({
          user_id: user.myFitnessPalUserId,
          datetime: {
            $gte: allDayTodayAndTomorrow.start,
            $lt: allDayTodayAndTomorrow.end,
          },
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
          .find({
            user_id: user.topLoggerId,
            date_logged: {
              $gte: allDayTodayAndTomorrow.start,
              $lt: allDayTodayAndTomorrow.end,
            },
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
        console.timeEnd("ascends");
      }
    },
    async () => {
      if (user.runDoubleId) {
        console.time("runs");
        for (const run of await getRuns(user.runDoubleId, {
          maxAge: HOUR_IN_SECONDS * 12,
        })) {
          const runDate = new Date(run.completed);
          if (isWithinInterval(runDate, allDayTodayAndTomorrow)) {
            addDiaryEntry(runDate, "runs", run);
          }
        }
        console.timeEnd("runs");
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
  );

  return (
    <div>
      <UserStuff />
      {eachDayOfInterval(allDayTodayAndTomorrow)
        .reverse()
        .map((day) => {
          const dayStr = `${day.getFullYear()}-${
            day.getMonth() + 1
          }-${day.getDate()}`;
          const [date, { food, workouts, ascends, runs }] = diaryEntries.find(
            ([entryDate]) => entryDate === dayStr
          ) || [dayStr, {} as (typeof diaryEntries)[number][1]];

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
                borderRadius: "2em",
                padding: "2em",
                margin: "1em",
                background: "white",
              }}
            >
              <div>
                <big>{date}</big>{" "}
                {dayTotalEnergy && dayTotalProtein ? (
                  <small>
                    {Math.round(dayTotalEnergy)} kcal,{" "}
                    {Math.round(dayTotalProtein)}g protein
                  </small>
                ) : null}
              </div>
              <div>
                <div>
                  {food ? (
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
                                              foodEntry.serving_size.value}{" "}
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
                  ) : null}
                </div>
                {isToday(day) ? (
                  <div>
                    <div>
                      <b>Next Sets</b>
                      <ol>
                        {nextSets.map(
                          ({
                            exercise,
                            successful,
                            nextWorkingSet,
                            workout_timestamp,
                          }) => (
                            <li key={exercise.id}>
                              <b>
                                {(exercise.aliases[1] || exercise.name).replace(
                                  "Barbell",
                                  ""
                                )}{" "}
                                {successful ? null : " (failed)"}
                              </b>{" "}
                              {nextWorkingSet}kg Last set{" "}
                              {String(
                                workout_timestamp.toLocaleDateString("da-DK")
                              )}
                            </li>
                          )
                        )}
                      </ol>
                    </div>
                    {workouts?.length
                      ? workouts?.map((workout) => (
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
                        ))
                      : null}
                    {ascends?.length
                      ? gyms
                          .filter((gym) =>
                            unique(
                              ascends.map(({ climb }) => climb.gym_id)
                            ).some((gym_id) => gym_id === gym.id)
                          )
                          .map((gym) => {
                            const gymAscends = ascends
                              .filter(({ climb }) => climb.gym_id === gym.id)
                              .sort(
                                (a, b) =>
                                  Number(b.date_logged) - Number(a.date_logged)
                              );
                            if (!gymAscends.length) return null;
                            return (
                              <div
                                key={gym.id}
                                style={{
                                  marginTop: "1em",
                                }}
                              >
                                <b>{gym.name}</b>
                                <ProblemByProblem
                                  problemByProblem={gymAscends.map(
                                    ({
                                      climb: { grade, hold_id },
                                      checks,
                                    }) => ({
                                      number: "",
                                      color:
                                        holds.find(
                                          (hold) => hold.id === hold_id
                                        )?.color || undefined,
                                      grade: Number(grade) || undefined,
                                      attempt: true,
                                      // TopLogger does not do zones, at least not for Beta Boulders
                                      zone: checks >= 1,
                                      top: checks >= 1,
                                      flash: checks >= 2,
                                    })
                                  )}
                                />
                              </div>
                            );
                          })
                      : null}
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
                ) : null}
              </div>
              <hr />
              {!food?.length ? (
                <i style={{ display: "block" }}>No meals logged</i>
              ) : null}
              {!workouts?.length ? (
                <i style={{ display: "block" }}>No lifts logged</i>
              ) : null}
              {!ascends?.length ? (
                <i style={{ display: "block" }}>No climbs logged</i>
              ) : null}
              {!runs?.length ? (
                <i style={{ display: "block" }}>No runs logged</i>
              ) : null}
            </div>
          );
        })}
    </div>
  );
}
