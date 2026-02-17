import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import { gql } from "graphql-tag";
import type { Session } from "next-auth";
import { query } from "../../ApolloClient";
import { FieldSetY } from "../../components/FieldSet";
import { DiaryAgendaFoodQuery } from "../../graphql.generated";
import { DEFAULT_TIMEZONE, isNonEmptyArray } from "../../utils";
import { FoodEntry } from "./FoodEntry";

export async function DiaryAgendaFood({
  date,
  user,
}: {
  user?: Session["user"];
  date: `${number}-${number}-${number}`;
}) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const food =
    (
      await query<DiaryAgendaFoodQuery>({
        query: gql`
          query DiaryAgendaFood($interval: IntervalInput!) {
            user {
              id
              foodEntries(interval: $interval) {
                id
                datetime
                mealName
                nutritionalContents {
                  energy {
                    value
                    unit
                  }
                  protein
                }
                type
                food {
                  id
                  description
                  servingSizes {
                    unit
                    value
                    nutritionMultiplier
                  }
                }
                servings
                servingSize {
                  unit
                  value
                  nutritionMultiplier
                }
              }
            }
          }
        `,
        variables: {
          interval: { start: startOfDay(tzDate), end: endOfDay(tzDate) },
        },
      })
    ).data?.user?.foodEntries || [];

  const dayTotalEnergy = food?.reduce(
    (acc, foodEntry) => acc + foodEntry.nutritionalContents.energy.value,
    0,
  );
  const dayTotalProtein = food?.reduce(
    (acc, foodEntry) => acc + (foodEntry.nutritionalContents.protein || 0),
    0,
  );

  return (
    <FieldSetY
      className="min-w-62.5 flex-1"
      legend={
        <div className="flex items-baseline gap-2">
          Food{" "}
          {dayTotalEnergy && dayTotalProtein ? (
            <small>
              <b>{Math.round(dayTotalEnergy)}</b>kcal,{" "}
              <b>{Math.round(dayTotalProtein)}</b>g protein
            </small>
          ) : null}
        </div>
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
