import { TZDate } from "@date-fns/tz";
import type { Session } from "next-auth";
import type { DiaryEntry } from "../../lib";
import { exercises, InputType } from "../../models/exercises";
import { Workout } from "../../models/workout";
import { exerciseIdsThatICareAbout } from "../../sources/fitocracy";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";

async function NextSets({ user }: { user: Session["user"] }) {
  return (
    <div>
      <b>Next Sets</b>
      <ol>
        {(
          await Promise.all(
            exerciseIdsThatICareAbout.map(
              async (id) =>
                [
                  id,
                  (
                    await Workout.findOne(
                      {
                        user_id: user.id,
                        "exercises.exercise_id": id,
                        deleted_at: { $exists: false },
                      },
                      null,
                      { sort: { worked_out_at: -1 } }
                    )
                  )?.toJSON(),
                ] as const
            )
          )
        )
          .map(([id, workout]) => {
            if (!workout) {
              return null;
            }

            const { worked_out_at } = workout;
            const exercise = workout.exercises.find(
              ({ exercise_id }) => exercise_id === id
            )!;

            const heaviestSet = exercise.sets.reduce((acc, set) => {
              const setWeight = set.inputs.find(
                (input) => input.type === InputType.Weight
              )?.value;
              const accWeight = acc?.inputs.find(
                (input) => input.type === InputType.Weight
              )?.value;
              return setWeight && accWeight && setWeight > accWeight
                ? set
                : acc;
            }, exercise.sets[0]);

            const workingSets = exercise.sets.filter(
              (set) =>
                set.inputs.find((input) => input.type === InputType.Weight)
                  ?.value ===
                heaviestSet?.inputs.find(
                  (input) => input.type === InputType.Weight
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
                    inputs.find(({ type }) => type === InputType.Reps)!.value <
                    5
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
                  (input) => input.type === InputType.Weight
                )?.value || 0)
              : 0.9 *
                (heaviestSet?.inputs.find(
                  (input) => input.type === InputType.Weight
                )?.value || 0);

            return {
              workout_timestamp: worked_out_at,
              exercise_id: exercise.exercise_id,
              successful,
              nextWorkingSet: String(nextWorkingSet).endsWith(".25")
                ? nextWorkingSet - 0.25
                : nextWorkingSet,
            };
          })
          .filter(Boolean)
          .sort(
            (a, b) =>
              a.workout_timestamp.getTime() - b.workout_timestamp.getTime()
          )
          .map(
            ({
              exercise_id,
              successful,
              nextWorkingSet,
              workout_timestamp,
            }) => {
              const exercise = exercises.find(({ id }) => exercise_id === id)!;

              return (
                <li key={exercise.id}>
                  <b>
                    {(exercise.aliases[1] || exercise.name).replace(
                      "Barbell",
                      ""
                    )}{" "}
                    {successful ? null : " (failed)"}
                  </b>{" "}
                  {nextWorkingSet}kg{" "}
                  <small>
                    <small>
                      Last set{" "}
                      {String(workout_timestamp.toLocaleDateString("da-DK"))}
                    </small>
                  </small>
                </li>
              );
            }
          )}
      </ol>
    </div>
  );
}

export function DiaryEntryList({
  diaryEntries,
  user,
  locations,
}: {
  diaryEntries: [`${number}-${number}-${number}`, DiaryEntry][];
  user: Session["user"];
  locations: string[];
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
            <WorkoutForm user={user} locations={locations} />
            <NextSets user={user} />
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
