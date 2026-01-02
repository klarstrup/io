import { proxyCollection } from "../utils.server";
import { Songkick } from "./songkick";

export const SongkickEvents =
  proxyCollection<Songkick.Event>("songkick_events");
