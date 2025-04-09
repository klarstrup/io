import { proxyCollection } from "../utils.server";
import type { MongoTomorrowInterval } from "./tomorrow";

export const TomorrowIntervals =
  proxyCollection<MongoTomorrowInterval>("tomorrow_intervals");
