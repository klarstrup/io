import { compareAsc } from "date-fns";
import { redirect } from "next/navigation";
import { Users } from "../../../models/user.server";
import { DataSource, UserDataSource } from "../../../sources/utils";

const sourceScrapeMap: Omit<
  Record<DataSource, string>,
  DataSource.Fitocracy
> = {
  ical: "ical_scrape",
  myfitnesspal: "myfitnesspal_scrape",
  rundouble: "rundouble_scrape",
  tomorrow: "tomorrow_scrape",
  toplogger: "toplogger_gql_scrape",
  kilterboard: "kilterboard_scrape",
  grippy: "grippy_scrape",
  crimpd: "crimpd_scrape",
};

export async function GET() {
  const users = await Users.find({}).toArray();

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

  redirect(`/api/${sourceScrapeMap[leastRecentlyAttempted.source]}`);
}
