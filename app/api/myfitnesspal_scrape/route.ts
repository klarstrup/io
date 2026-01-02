import { tz, TZDate } from "@date-fns/tz";
import {
  differenceInMonths,
  endOfMonth,
  isFuture,
  startOfMonth,
} from "date-fns";
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
      user,
      DataSource.MyFitnessPal,
      async function* ({ config: { token, userName, userId } }, setUpdated) {
        setUpdated(false);

        await MyFitnessPalFoodEntries.createIndexes([
          { key: { user_id: 1, date: 1 } },
          { key: { user_id: 1, datetime: 1 } },
        ]);

        const now = new Date();
        yearLoop: for (const year of years) {
          for (const month of months) {
            const monthDate = new TZDate(year, Number(month) - 1, "Etc/UTC");
            if (isFuture(monthDate)) break yearLoop;

            if (differenceInMonths(now, monthDate) > 1) {
              const [entriesForMonth] = await Promise.all([
                MyFitnessPalFoodEntries.countDocuments(
                  {
                    user_id: userId,
                    date: { $regex: new RegExp(`^${year}-${month}-`) },
                  },
                  {
                    comment:
                      "Checking for existing entries to skip month w/ $regex",
                  },
                ),
                MyFitnessPalFoodEntries.countDocuments(
                  {
                    user_id: userId,
                    datetime: {
                      $gte: startOfMonth(monthDate, { in: tz("UTC") }),
                      $lte: endOfMonth(monthDate, { in: tz("UTC") }),
                    },
                  },
                  {
                    comment:
                      "Checking for existing entries to skip month w/ datetime $gte & $lt",
                  },
                ),
              ]);

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

            const [foodEntryIdsToBeDeletedR] = await Promise.all([
              MyFitnessPalFoodEntries.find({
                user_id: userId,
                date: { $regex: new RegExp(`^${year}-${month}-`) },
              }).toArray(),
              MyFitnessPalFoodEntries.find({
                user_id: userId,
                datetime: {
                  $gte: startOfMonth(monthDate, { in: tz("UTC") }),
                  $lte: endOfMonth(monthDate, { in: tz("UTC") }),
                },
              }).toArray(),
            ]);
            const foodEntryIdsToBeDeleted = foodEntryIdsToBeDeletedR
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
