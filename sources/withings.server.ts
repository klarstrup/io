import { proxyCollection } from "../utils.server";
import { Withings } from "./withings";

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
