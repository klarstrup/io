import { differenceInMonths, isFuture } from "date-fns";
import { DateTime } from "luxon";
import { auth } from "../../../auth";
import {
  getMyFitnessPalReport,
  MyFitnessPalFoodEntries,
} from "../../../sources/myfitnesspal.server";
import { jsonStreamResponse } from "../scraper-utils";

const months = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
] as const;

const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024] as const;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const token = user.myFitnessPalToken;
    if (!token) return new Response("No token", { status: 401 });

    const userId = user.myFitnessPalUserId;
    if (!userId) return new Response("No userId", { status: 401 });

    const userName = user.myFitnessPalUserName;
    if (!userName) return new Response("No userName", { status: 401 });
    const now = new Date();
    yearLoop: for (const year of years) {
      for (const month of months) {
        if (isFuture(new Date(year, Number(month) - 1))) break yearLoop;

        if (differenceInMonths(now, new Date(year, Number(month) - 1)) > 1) {
          const entriesForMonth = await MyFitnessPalFoodEntries.countDocuments({
            user_id: userId,
            date: { $regex: new RegExp(`^${year}-${month}-`) },
          });

          if (entriesForMonth > 0) continue;
        }
        const reportEntries = await getMyFitnessPalReport(
          token,
          userName,
          year,
          month,
        );

        if (Array.isArray(reportEntries)) {
          // Wipe the month to be replaced with the new data
          await MyFitnessPalFoodEntries.deleteMany({
            user_id: userId,
            date: { $regex: new RegExp(`^${year}-${month}-`) },
          });
        }
        if (!reportEntries.length) continue;
        for (const reportEntry of reportEntries) {
          if (reportEntry.food_entries) {
            for (const foodEntry of reportEntry.food_entries) {
              await MyFitnessPalFoodEntries.updateOne(
                { id: foodEntry.id },
                {
                  $set: {
                    ...foodEntry,
                    user_id: userId,
                    datetime: DateTime.fromISO(foodEntry.date, {
                      zone: "utc",
                    }).toJSDate(),
                  },
                },
                { upsert: true },
              );
            }

            yield reportEntry.date;
          }
        }
      }
    }
  });
