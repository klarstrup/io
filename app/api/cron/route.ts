import { compareAsc } from "date-fns";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Users } from "../../../models/user.server";
import { DataSource, UserDataSource } from "../../../sources/utils";
import { epoch, uniqueBy } from "../../../utils";

export async function GET() {
  await connection();

  const users = await Users.find({}).toArray();

  const dataSources = uniqueBy(
    users
      .flatMap((user) => user.dataSources)
      .filter((dataSource): dataSource is UserDataSource => Boolean(dataSource))
      .filter((dataSource) => !dataSource.paused)
      .filter(
        (dataSource) => dataSource.source !== DataSource.Fitocracy, // Fitocracy is read-only
      )
      .sort((a, b) =>
        compareAsc(a.lastAttemptedAt ?? epoch, b.lastAttemptedAt ?? epoch),
      ),
    (ds) => ds.source,
  );

  const moreThan15MinutesSinceWeFetchedSpiir = dataSources.every(
    (dataSource) => {
      if (dataSource.source !== DataSource.Spiir) return true;
      const lastAttemptedAt = dataSource.lastAttemptedAt ?? epoch;
      const timeSinceLastAttempted =
        new Date().getTime() - new Date(lastAttemptedAt).getTime();
      return timeSinceLastAttempted > 15 * 60 * 1000;
    },
  );

  const mostRecentlyAttempted = dataSources[dataSources.length - 1];
  const leastRecentlyAttemptedOrSpiir =
    moreThan15MinutesSinceWeFetchedSpiir &&
    mostRecentlyAttempted?.source !== DataSource.Spiir
      ? dataSources.find((source) => source.source === DataSource.Spiir)
      : dataSources[0];

  if (!leastRecentlyAttemptedOrSpiir || !mostRecentlyAttempted) {
    return Response.json({});
  }

  const now = new Date();
  const mostRecentlyAttemptedAt =
    mostRecentlyAttempted.lastAttemptedAt ?? epoch;
  const timeSinceMostRecentlyAttempted =
    now.getTime() - new Date(mostRecentlyAttemptedAt).getTime();

  // If the most recently attempted scrape was less than 15 minutes ago, skip.
  if (timeSinceMostRecentlyAttempted < 5 * 60 * 1000) {
    console.log(
      `Skipping /cron /${leastRecentlyAttemptedOrSpiir.source}_scrape scrape because another scrape was attempted less than 15 minutes ago.`,
    );
    return Response.json({});
  }

  if (!process.env.VERCEL) {
    console.log(
      `Skipping /cron /${leastRecentlyAttemptedOrSpiir.source}_scrape scrape because we are not on Vercel`,
    );
    return Response.json({});
  }

  redirect(`/api/${leastRecentlyAttemptedOrSpiir.source}_scrape`);
}
