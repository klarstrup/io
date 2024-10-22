import type { DiaryEntry } from "../../../lib";
import { MyFitnessPal } from "../../../sources/myfitnesspal";

export function FoodEntry({
  foodEntries,
}: {
  foodEntries: DiaryEntry["food"];
}) {
  return (
    <div
      style={{
        marginBottom: "4px",
        borderLeft: "0.25em solid #a0a0a0a0",
        paddingLeft: "0.5em",
        borderRight: "0.25em solid #a0a0a0a0",
        paddingRight: "0.5em",
        borderRadius: "0.5em",
      }}
    >
      {foodEntries ? (
        <ul
          style={{
            display: "grid",
            gap: "8px 4px",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {[
            MyFitnessPal.MealName.Breakfast,
            MyFitnessPal.MealName.Lunch,
            MyFitnessPal.MealName.Dinner,
            MyFitnessPal.MealName.Snacks,
          ]
            .filter((mealName) =>
              foodEntries?.some(
                (foodEntry) => foodEntry.meal_name === mealName,
              ),
            )
            .map((mealName) => {
              const mealTotalEnergy = foodEntries
                ?.filter((foodEntry) => foodEntry.meal_name === mealName)
                .reduce(
                  (acc, foodEntry) =>
                    acc + foodEntry.nutritional_contents.energy.value,
                  0,
                );
              const mealTotalProtein = foodEntries
                ?.filter((foodEntry) => foodEntry.meal_name === mealName)
                .reduce(
                  (acc, foodEntry) =>
                    acc + (foodEntry.nutritional_contents.protein || 0),
                  0,
                );

              return (
                <li key={mealName}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "0.9em" }}>
                      {mealName}
                    </span>{" "}
                    {mealTotalEnergy && mealTotalProtein ? (
                      <small>
                        {Math.round(mealTotalEnergy)} kcal,{" "}
                        {Math.round(mealTotalProtein)}g protein
                      </small>
                    ) : null}
                  </div>
                  <ul style={{ paddingInlineStart: "20px" }}>
                    {foodEntries
                      ?.filter((foodEntry) => foodEntry.meal_name === mealName)
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
                                    foodEntry.serving_size.value,
                                )}{" "}
                                {foodEntry.serving_size.unit.match(/container/i)
                                  ? "x "
                                  : null}
                              </>
                            ) : null}
                            {foodEntry.serving_size.unit.match(/container/i)
                              ? foodEntry.serving_size.unit.replace(
                                  /(container \((.+)\))/i,
                                  "$2",
                                )
                              : foodEntry.serving_size.unit}
                          </small>
                        </li>
                      ))}
                  </ul>
                </li>
              );
            })}
        </ul>
      ) : null}
    </div>
  );
}
