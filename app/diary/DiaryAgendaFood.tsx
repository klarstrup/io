import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { FieldSetY } from "../../components/FieldSet";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import { MyFitnessPalFoodEntries } from "../../sources/myfitnesspal.server";
import { DEFAULT_TIMEZONE } from "../../utils";
import { FoodEntry } from "./FoodEntry";

const rangeToQuery = (from: Date, to?: Date) =>
  to ? { $gte: from, $lt: to } : { $gte: from };

export async function DiaryAgendaFood({
  date,
  user,
}: {
  user: Session["user"];
  date: `${number}-${number}-${number}`;
}) {
  if (!user.myFitnessPalUserId) return;
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const food: (MyFitnessPal.MongoFoodEntry & { _id: string })[] = [];
  for await (const foodEntry of MyFitnessPalFoodEntries.find({
    user_id: user.myFitnessPalUserId,
    datetime: rangeToQuery(startOfDay(tzDate), endOfDay(tzDate)),
  })) {
    food.push({
      ...foodEntry,
      _id: foodEntry._id.toString(),
    });
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
      {food.length ? (
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
