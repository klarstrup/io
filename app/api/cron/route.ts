import { compareAsc } from "date-fns";
import { redirect } from "next/navigation";
import { Users } from "../../../models/user.server";
import { DataSource, UserDataSource } from "../../../sources/utils";

export async function GET() {
  const users = await Users.find({}).toArray();

  if (!process.env.VERCEL) {
    console.log("Skipping /cron scrape because we are not on Vercel");
    return Response.json({});
  }

  const dataSources = users
    .flatMap((user) => user.dataSources)
    .filter((dataSource): dataSource is UserDataSource => Boolean(dataSource))
    .filter(
      (dataSource) => dataSource.source !== DataSource.Fitocracy, // Fitocracy is read-only
    )
    .sort((a, b) =>
      compareAsc(
        a.lastAttemptedAt ?? new Date(0),
        b.lastAttemptedAt ?? new Date(0),
      ),
    );

  const leastRecentlyAttempted = dataSources[0];

  if (!leastRecentlyAttempted) return Response.json({});

  redirect(`/api/${leastRecentlyAttempted.source}_scrape`);
}
