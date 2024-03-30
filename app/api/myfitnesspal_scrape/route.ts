import { differenceInMonths } from "date-fns";
import { DateTime } from "luxon";
import dbConnect from "../../../dbConnect";
import { User } from "../../../models/user";
import {
  MyFitnessPal,
  getMyFitnessPalReport,
} from "../../../sources/myfitnesspal";
// import { NextRequest } from "next/server";

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

export async function GET(/* request: NextRequest */) {
  /*
  if (process.env.VERCEL) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }
  }
  */

  await dbConnect();

  // Io is the only user in the database,
  const user = await User.findOne();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const myFitnessPalToken = user.myFitnessPalToken;
  if (!myFitnessPalToken) {
    return new Response("No myFitnessPalToken", { status: 401 });
  }

  const myFitnessPalUserId = user.myFitnessPalUserId;
  if (!myFitnessPalUserId) {
    return new Response("No myFitnessPalUserId", { status: 401 });
  }

  const myFitnessPalUserName = user.myFitnessPalUserName;
  if (!myFitnessPalUserName) {
    return new Response("No myFitnessPalUserName", { status: 401 });
  }

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  const foodEntries = (
    await dbConnect()
  ).connection.db.collection<MyFitnessPal.MongoFoodEntry>(
    "myfitnesspal_food_entries"
  );

  (async () => {
    const encoder = new TextEncoder();

    await writer.write(encoder.encode("[\n"));
    let first = true;

    const now = new Date();
    yearLoop: for (const year of years) {
      for (const month of months) {
        if (differenceInMonths(now, new Date(year, Number(month) - 1)) > 3) {
          const entriesForMonth = await foodEntries.countDocuments({
            user_id: myFitnessPalUserId,
            date: { $regex: new RegExp(`^${year}-${month}-`) },
          });

          if (entriesForMonth > 0) continue;
        }
        const reportEntries = await getMyFitnessPalReport(
          myFitnessPalToken,
          myFitnessPalUserName,
          year,
          month
        );
        if (Array.isArray(reportEntries)) {
          // Wipe the month to be replaced with the new data
          await foodEntries.deleteMany({
            user_id: myFitnessPalUserId,
            date: { $regex: new RegExp(`^${year}-${month}-`) },
          });
        }
        if (!reportEntries.length) continue;
        for (const reportEntry of reportEntries) {
          if (reportEntry.food_entries) {
            for (const foodEntry of reportEntry.food_entries) {
              await foodEntries.updateOne(
                { id: foodEntry.id },
                {
                  $set: {
                    ...foodEntry,
                    user_id: myFitnessPalUserId,
                    datetime: DateTime.fromISO(foodEntry.date, {
                      zone: "utc",
                    }).toJSDate(),
                  },
                },
                { upsert: true }
              );
            }
            if (first) {
              first = false;
            } else {
              await writer.write(encoder.encode(",\n"));
            }
            await writer.write(
              encoder.encode(JSON.stringify(reportEntry.date))
            );
          }
        }
        break yearLoop;
      }
    }
    await writer.write(encoder.encode("\n]"));

    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
