import type { MongoVEvent, MongoVTodo } from "../lib";
import { proxyCollection } from "../utils.server";

export const IcalEvents = proxyCollection<MongoVEvent | MongoVTodo>(
  "ical_events",
);
