import { proxyCollection } from "../utils.server";
import { RunDouble } from "./rundouble";

export const RunDoubleRuns =
  proxyCollection<RunDouble.MongoHistoryItem>("rundouble_runs");
