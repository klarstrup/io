import { MongoTomorrowInterval } from "../lib";
import { proxyCollection } from "../utils.server";

export const TomorrowIntervals =
  proxyCollection<MongoTomorrowInterval>("tomorrow_intervals");
