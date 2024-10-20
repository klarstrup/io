import { FieldSetY } from "../../components/FieldSet";
import type { DiaryEntry } from "../../lib";
import { FoodEntry } from "./FoodEntry";

export function DiaryAgendaFood({
  date,
  food,
}: {
  food: DiaryEntry["food"];
  date: `${number}-${number}-${number}`;
}) {
  const dayTotalEnergy = food?.reduce(
    (acc, foodEntry) => acc + foodEntry.nutritional_contents.energy.value,
    0,
  );
  const dayTotalProtein = food?.reduce(
    (acc, foodEntry) => acc + (foodEntry.nutritional_contents.protein || 0),
    0,
  );

  return (
    <FieldSetY>
      <legend className="ml-2">
        <big>Food</big>{" "}
        {dayTotalEnergy && dayTotalProtein ? (
          <small>
            {Math.round(dayTotalEnergy)} kcal, {Math.round(dayTotalProtein)}g
            protein
          </small>
        ) : null}
      </legend>
      {food ? (
        <FoodEntry foodEntries={food} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center">
          <p className="mb-2">No food logged</p>
          <div>
            <a
              href={`https://www.myfitnesspal.com/food/diary?date=${date}`}
              target="_blank"
              className="mb-4 inline-block cursor-pointer rounded-2xl bg-[#ff0] px-3 py-2 pr-4 text-center text-xl font-semibold"
            >
              ➕ Food
            </a>
          </div>
        </div>
      )}
    </FieldSetY>
  );
}
