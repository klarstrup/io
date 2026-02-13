import { proxyCollection } from "../utils.server";
import { Withings } from "./withings";

export const WithingsSleepSummarySeries = proxyCollection<
  Withings.SleepSummarySeries & { userId: string; _io_userId: string }
>("withings_sleep_summary_series");
export const WithingsMeasureGroup = proxyCollection<
  Withings.MeasureGroup & { userId: string; _io_userId: string }
>("withings_measure_groups");
