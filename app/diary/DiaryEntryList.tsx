import { Session } from "next-auth";
import { getDB } from "../../dbConnect";
import type { DiaryEntry } from "../../lib";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import { TopLogger } from "../../sources/toplogger";
import ProblemByProblem from "../[[...slug]]/ProblemByProblem";
import RunByRun from "../[[...slug]]/RunByRun";
import WorkoutEntry from "./WorkoutEntry";

export async function DiaryEntryList({
  diaryEntries,
  user,
}: {
  diaryEntries: [`${number}-${number}-${number}`, DiaryEntry][];
  user: Session["user"];
}) {
  const DB = await getDB();
  const holds = await DB.collection<TopLogger.Hold>("toplogger_holds")
    .find()
    .toArray();

  return diaryEntries.map(([date, { food, workouts, ascends, runs }]) => {
    const dayTotalEnergy = food?.reduce(
      (acc, foodEntry) => acc + foodEntry.nutritional_contents.energy.value,
      0
    );
    const dayTotalProtein = food?.reduce(
      (acc, foodEntry) => acc + (foodEntry.nutritional_contents.protein || 0),
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
              {Math.round(dayTotalEnergy)} kcal, {Math.round(dayTotalProtein)}g
              protein
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
                            acc + foodEntry.nutritional_contents.energy.value,
                          0
                        );
                      const mealTotalProtein = food
                        ?.filter(
                          (foodEntry) => foodEntry.meal_name === mealName
                        )
                        .reduce(
                          (acc, foodEntry) =>
                            acc + (foodEntry.nutritional_contents.protein || 0),
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
                                (foodEntry) => foodEntry.meal_name === mealName
                              )
                              .map((foodEntry) => (
                                <li
                                  key={foodEntry.id}
                                  style={{ listStyle: "none" }}
                                >
                                  {foodEntry.food.description.replace(
                                    /\s+/g,
                                    " "
                                  )}
                                  <small>
                                    {" "}
                                    {foodEntry.servings *
                                      foodEntry.serving_size.value !==
                                    1 ? (
                                      <>
                                        {Math.round(
                                          foodEntry.servings *
                                            foodEntry.serving_size.value
                                        )}{" "}
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
                  <WorkoutEntry
                    key={workout._id}
                    user={user}
                    workout={workout}
                  />
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
                        (a, b) => Number(b.date_logged) - Number(a.date_logged)
                      )
                      .map(({ climb: { grade, hold_id }, checks }) => ({
                        number: "",
                        color:
                          holds.find((hold) => hold.id === hold_id)?.color ||
                          undefined,
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
  });
}
