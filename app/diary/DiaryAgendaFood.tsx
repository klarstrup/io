import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { FieldSetY } from "../../components/FieldSet";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import { MyFitnessPalFoodEntries } from "../../sources/myfitnesspal.server";
import { DataSource } from "../../sources/utils";
import { DEFAULT_TIMEZONE, isNonEmptyArray, rangeToQuery } from "../../utils";
import { FoodEntry } from "./FoodEntry";

export async function DiaryAgendaFood({
  date,
  user,
}: {
  user: Session["user"];
  date: `${number}-${number}-${number}`;
}) {
  if (
    !user.dataSources?.some(
      (dataSource) => dataSource.source === DataSource.MyFitnessPal,
    )
  )
    return;
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const food: (MyFitnessPal.MongoFoodEntry & { _id: string })[] = [];
  for (const dataSource of user.dataSources) {
    if (dataSource.source !== DataSource.MyFitnessPal) continue;

    for await (const foodEntry of MyFitnessPalFoodEntries.find({
      user_id: dataSource.config.userId,
      datetime: rangeToQuery(startOfDay(tzDate), endOfDay(tzDate)),
    })) {
      food.push({
        ...foodEntry,
        _id: foodEntry._id.toString(),
      });
    }
  }

  const dayTotalEnergy = food?.reduce(
    (acc, foodEntry) => acc + foodEntry.nutritional_contents.energy.value,
    0,
  );
  const dayTotalProtein = food?.reduce(
    (acc, foodEntry) => acc + (foodEntry.nutritional_contents.protein || 0),
    0,
  );

  return (
    <FieldSetY
      className="min-w-[250px] flex-[1]"
      legend={
        <>
          Food{" "}
          {dayTotalEnergy && dayTotalProtein ? (
            <small>
              {Math.round(dayTotalEnergy)} kcal, {Math.round(dayTotalProtein)}g
              protein
            </small>
          ) : null}
        </>
      }
    >
      {isNonEmptyArray(food) ? (
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
