import type { Interval } from "date-fns";
import { auth } from "../auth";
import { proxyCollection } from "../utils.server";
import { DataSource } from "./utils";
import type { Withings } from "./withings";

export const WithingsSleepSummarySeries = proxyCollection<
  Withings.SleepSummarySeries & {
    _withings_userId: number;
    _io_userId: string;
    startedAt: Date;
    endedAt: Date;
  }
>("withings_sleep_summary_series");
export const WithingsMeasureGroup = proxyCollection<
  Withings.MeasureGroup & {
    _withings_userId: number;
    _io_userId: string;
    createdAt: Date;
    measuredAt: Date;
    modifiedAt: Date;
  }
>("withings_measure_groups");

export async function* getUserWithingsSleepSummarySeriesBetween(
  userId: string,
  { start, end }: Interval<Date, Date>,
) {
  const user = (await auth())?.user;
  if (!user) return [];
  if (userId !== user.id) throw new Error("Unauthorized");

  // For now, we only support Withings sleep data, so we look for a Withings data source and query the sleeps from there
  const withingsDataSource = user.dataSources?.find(
    (dataSource) => dataSource.source === DataSource.Withings,
  );

  const withingsUserId =
    withingsDataSource?.config?.accessTokenResponse?.userid;
  if (!withingsUserId) return null;

  yield* WithingsSleepSummarySeries.find({
    // Sometimes the token response has this as a string, sometimes as a number, so we convert it to a number here to be safe
    _withings_userId: Number(withingsUserId),
    startedAt: { $lte: new Date(end) },
    endedAt: { $gte: new Date(start) },
  });
}
