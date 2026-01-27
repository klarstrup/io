import type { DiaryEntry } from "../../lib";
import { MyFitnessPal } from "../../sources/myfitnesspal";

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
              foodEntries?.some((foodEntry) => foodEntry.mealName === mealName),
            )
            .map((mealName) => {
              const mealTotalEnergy = foodEntries
                ?.filter((foodEntry) => foodEntry.mealName === mealName)
                .reduce(
                  (acc, foodEntry) =>
                    acc + foodEntry.nutritionalContents.energy.value,
                  0,
                );
              const mealTotalProtein = foodEntries
                ?.filter((foodEntry) => foodEntry.mealName === mealName)
                .reduce(
                  (acc, foodEntry) =>
                    acc + (foodEntry.nutritionalContents.protein || 0),
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
                        {Math.round(mealTotalEnergy)}kcal,{" "}
                        {Math.round(mealTotalProtein)}g protein
                      </small>
                    ) : null}
                  </div>
                  <ul className="list-disc ps-4">
                    {foodEntries
                      ?.filter((foodEntry) => foodEntry.mealName === mealName)
                      .map((foodEntry) => {
                        const unit =
                          foodEntry.food.servingSizes[0]!.unit.replace(
                            "grams",
                            "g",
                          ).replace("gram", "g");

                        return (
                          <li key={foodEntry.id}>
                            {foodEntry.food.description.replace(/\s+/g, " ")}{" "}
                            <small className="whitespace-nowrap">
                              {foodEntry.servings *
                                foodEntry.servingSize.nutritionMultiplier *
                                foodEntry.food.servingSizes[0]!.value}
                              {unit.length <= 2 ? unit : <> {unit}</>}
                            </small>
                          </li>
                        );
                      })}
                  </ul>
                </li>
              );
            })}
        </ul>
      ) : null}
    </div>
  );
}
