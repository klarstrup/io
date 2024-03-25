import dbConnect from "../../../dbConnect";
import { User } from "../../../models/user";
import {
  MyFitnessPal,
  getMyFitnessPalReport,
  getMyFitnessPalSession,
} from "../../../sources/myfitnesspal";
// import { NextRequest } from "next/server";

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
  const myFitnessPalToken = user?.myFitnessPalToken;
  if (!myFitnessPalToken) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const myFitnessPalSession = await getMyFitnessPalSession(myFitnessPalToken);

  if (!myFitnessPalSession) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  const myFitnessPalUserId = myFitnessPalSession.userId;

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  const foodEntries = (
    await dbConnect()
  ).connection.db.collection<MyFitnessPal.MongoFoodEntry>(
    "myfitnesspal_food_entries"
  );

  (async () => {
    const encoder = new TextEncoder();

    await writer.write(encoder.encode("["));
    let first = true;

    for (const year of [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]) {
      for (const reportEntry of await getMyFitnessPalReport(
        myFitnessPalToken,
        year
      )) {
        if (reportEntry.food_entries) {
          for (const foodEntry of reportEntry.food_entries) {
            await foodEntries.updateOne(
              { id: foodEntry.id },
              { $set: { ...foodEntry, user_id: myFitnessPalUserId } },
              { upsert: true }
            );
          }
          if (first) {
            first = false;
          } else {
            await writer.write(encoder.encode(","));
          }
          await writer.write(encoder.encode(JSON.stringify(reportEntry.date)));
        }
      }
    }
    await writer.write(encoder.encode("]"));

    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
