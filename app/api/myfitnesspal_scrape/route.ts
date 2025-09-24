import { differenceInMonths, isFuture } from "date-fns";
import { DateTime } from "luxon";
import { auth } from "../../../auth";
import {
  getMyFitnessPalReport,
  MyFitnessPalFoodEntries,
} from "../../../sources/myfitnesspal.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { isNonEmptyArray } from "../../../utils";
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

const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.MyFitnessPal) continue;

      yield* wrapSource(
        dataSource,
        user,
        async function* ({ token, userName, userId }) {
          let updatedDatabase = false;

          const now = new Date();
          yearLoop: for (const year of years) {
            for (const month of months) {
              if (isFuture(new Date(year, Number(month) - 1))) break yearLoop;

              if (
                differenceInMonths(now, new Date(year, Number(month) - 1)) > 1
              ) {
                const entriesForMonth =
                  await MyFitnessPalFoodEntries.countDocuments({
                    user_id: userId,
                    date: { $regex: new RegExp(`^${year}-${month}-`) },
                  });

                if (entriesForMonth > 0) continue;
              }
              // TODO: Also skip anything prior to a few months before the last populated month

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
              if (!isNonEmptyArray(reportEntries)) continue;
              for (const reportEntry of reportEntries) {
                if (reportEntry.food_entries) {
                  for (const foodEntry of reportEntry.food_entries) {
                    const updateResult =
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
                    if (
                      updateResult.modifiedCount > 0 ||
                      updateResult.upsertedCount > 0
                    ) {
                      updatedDatabase = true;
                    }
                  }

                  yield reportEntry.date;
                }
              }
            }
          }

          return updatedDatabase;
        },
      );
    }
  });
