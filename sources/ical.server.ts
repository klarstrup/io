import { MongoVEventWithVCalendar } from "../lib";
import { proxyCollection } from "../utils.server";

export const IcalEvents =
  proxyCollection<MongoVEventWithVCalendar>("ical_events");
