import { differenceInMonths, isFuture } from "date-fns";
import { DateTime } from "luxon";
import { auth } from "../../../auth";
import {
  getMyFitnessPalReport,
  MyFitnessPalFoodEntries,
} from "../../../sources/myfitnesspal.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
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

const years = [
  2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
] as const;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      DataSource.MyFitnessPal,
      user.dataSources ?? [],
      user,
      async function* ({ config: { token, userName, userId } }, setUpdated) {
        setUpdated(false);

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

            for (const reportEntry of reportEntries) {
              for (const foodEntry of reportEntry.food_entries) {
                const updateResult = await MyFitnessPalFoodEntries.updateOne(
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

                setUpdated(updateResult);
              }

              yield reportEntry.date;
            }

            const foodEntryIdsToBeDeleted = (
              await MyFitnessPalFoodEntries.find({
                user_id: userId,
                date: { $regex: new RegExp(`^${year}-${month}-`) },
              }).toArray()
            )
              .filter(
                (entry) =>
                  !reportEntries
                    .map((reportEntry) => reportEntry.food_entries)
                    .flat()
                    .some((foodEntry) => foodEntry.id === entry.id),
              )
              .map(({ id }) => id);

            const deleteResult = await MyFitnessPalFoodEntries.deleteMany({
              id: { $in: foodEntryIdsToBeDeleted },
            });

            setUpdated(deleteResult);
          }
        }
      },
    );
  });
