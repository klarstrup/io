"use client";
import { TZDate } from "@date-fns/tz";
import { differenceInDays } from "date-fns";
import type { Session } from "next-auth";
import { type ReactNode, useState } from "react";
import type { DiaryEntry } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import { NextSets } from "./NextSets";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";

export function DiaryEntryItem({
  diaryEntry,
  user,
  locations,
  nextSets,
  children,
}: {
  diaryEntry: [`${number}-${number}-${number}`, DiaryEntry];
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  children?: ReactNode | ReactNode[];
}) {
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);

  const now = TZDate.tz("Europe/Copenhagen");
  const todayStr = `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}`;

  const [date, { food, workouts }] = diaryEntry;

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
          marginLeft: "0.5em",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, lineHeight: 1, display: "flex" }}>
          <big>
            <big>
              <big>
                {todayStr === date ? (
                  <>
                    <b>Today</b>{" "}
                    <span style={{ fontSize: "0.75em" }}>{date}</span>
                  </>
                ) : (
                  <b>{date}</b>
                )}
              </big>
            </big>
          </big>
          {dayTotalEnergy && dayTotalProtein ? (
            <small style={{ paddingLeft: "0.5em" }}>
              <div>{Math.round(dayTotalEnergy)} kcal</div>
              <div>{Math.round(dayTotalProtein)}g protein</div>
            </small>
          ) : null}
        </div>
        <select
          onChange={(e) => {
            if (e.target.value === "workout") {
              setIsAddingWorkout(true);
            }
            if (e.target.value === "food") {
              window.open(
                `https://www.myfitnesspal.com/food/diary?date=${date}`
              );
            }

            e.target.value = "";
          }}
          style={{
            fontSize: "1em",
            padding: "0.5em 0em",
            paddingRight: "0em",
            borderRadius: "1em",
            border: "none",
            background: "#ff0",
            textAlign: "center",
            maxWidth: "3em",
          }}
        >
          <option value="">➕</option>
          <option value="workout">Add Workout</option>
          {user.myFitnessPalToken ? (
            <option value="food">Log Food</option>
          ) : null}
        </select>
      </div>
      <div style={{ flex: "1" }}>
        <div>
          {food ? (
            <ol style={{ paddingInlineStart: "20px" }}>
              {[
                MyFitnessPal.MealName.Breakfast,
                MyFitnessPal.MealName.Lunch,
                MyFitnessPal.MealName.Dinner,
                MyFitnessPal.MealName.Snacks,
              ]
                .filter((mealName) =>
                  food?.some((foodEntry) => foodEntry.meal_name === mealName)
                )
                .map((mealName) => {
                  const mealTotalEnergy = food
                    ?.filter((foodEntry) => foodEntry.meal_name === mealName)
                    .reduce(
                      (acc, foodEntry) =>
                        acc + foodEntry.nutritional_contents.energy.value,
                      0
                    );
                  const mealTotalProtein = food
                    ?.filter((foodEntry) => foodEntry.meal_name === mealName)
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
                              {foodEntry.food.description.replace(/\s+/g, " ")}
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
                                {foodEntry.serving_size.unit.match(/container/i)
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
          {isAddingWorkout ? (
            <fieldset>
              <legend>New workout</legend>
              <WorkoutForm
                date={date}
                user={user}
                locations={locations}
                nextSets={nextSets}
                onClose={() => setIsAddingWorkout(false)}
              />
              <div>
                <small>
                  <b>Future Sets:</b>
                  <NextSets
                    nextSets={nextSets.filter(
                      (nextSet) =>
                        differenceInDays(
                          new Date(),
                          nextSet.workout_timestamp
                        ) <= 2
                    )}
                  />
                </small>
              </div>
            </fieldset>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
