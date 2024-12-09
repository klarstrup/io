import { compareAsc } from "date-fns";
import { redirect } from "next/navigation";
import { Users } from "../../../models/user.server";
import { DataSource, UserDataSource } from "../../../sources/utils";

const sourceScrapeMap: Omit<
  Record<DataSource, string>,
  DataSource.Fitocracy | DataSource.TopLogger
> = {
  ical: "ical_scrape",
  myfitnesspal: "myfitnesspal_scrape",
  rundouble: "rundouble_scrape",
  tomorrow: "tomorrow_scrape",
  //  toplogger: "toplogger_gql_scrape",
  kilterboard: "kilterboard_scrape",
};

export async function GET() {
  const users = await Users.find({}).toArray();

  const dataSources = users
    .flatMap((user) => user.dataSources)
    .filter((dataSource): dataSource is UserDataSource => Boolean(dataSource))
    .filter(
      (dataSource) =>
        dataSource.source !== DataSource.Fitocracy && // Fitocracy is read-only
        dataSource.source !== DataSource.TopLogger, // TopLogger is acting up
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
