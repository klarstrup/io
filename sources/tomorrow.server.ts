import { ScrapedAt, TomorrowIoMeta, TomorrowResponse } from "../lib";
import { proxyCollection } from "../utils.server";

export const TomorrowIntervals = proxyCollection<
  TomorrowResponse & ScrapedAt & TomorrowIoMeta
>("tomorrow_intervals");
