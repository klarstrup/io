import { TZDate } from "@date-fns/tz";
import { differenceInDays } from "date-fns";
import type { Session } from "next-auth";
import type { DiaryEntry } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import { NextSets } from "./NextSets";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";

export function DiaryEntryList({
  diaryEntries,
  user,
  locations,
  nextSets,
}: {
  diaryEntries: [`${number}-${number}-${number}`, DiaryEntry][];
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const now = TZDate.tz("Europe/Copenhagen");
  const todayStr = `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}`;
  return diaryEntries.map(([date, { food, workouts }]) => {
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
          boxShadow:
            date === todayStr
              ? "0 0 2em rgba(0, 0, 0, 0.6)"
              : "0 0 2em rgba(0, 0, 0, 0.2)",
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
                <ol style={{ paddingInlineStart: "20px" }}>
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
                          <ul style={{ paddingInlineStart: "0px" }}>
                            {food
                              ?.filter(
                                (foodEntry) => foodEntry.meal_name === mealName
                              )
                              .map((foodEntry) => (
                                <li key={foodEntry.id}>
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
            {workouts?.length
              ? workouts?.map((workout) => (
                  <WorkoutEntry
                    key={workout._id}
                    user={user}
                    workout={workout}
                    locations={locations}
                  />
                ))
              : null}
          </div>
        </div>
        {date === todayStr ? (
          <fieldset>
            <legend>New workout</legend>
            <WorkoutForm
              user={user}
              locations={locations}
              nextSets={nextSets}
            />
            <div>
              <small>
                <b>Future Sets:</b>
                <NextSets
                  nextSets={nextSets.filter(
                    (nextSet) =>
                      differenceInDays(new Date(), nextSet.workout_timestamp) <=
                      2
                  )}
                />
              </small>
            </div>
          </fieldset>
        ) : null}
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
        </small>
      </div>
    );
  });
}
