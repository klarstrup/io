import { proxyCollection } from "../utils.server";
import { SportsTiming } from "./sportstiming";

export const SportstimingEvents = proxyCollection<SportsTiming.Event>(
  "sportstiming_events",
);

export const SportstimingFavorites =
  proxyCollection<SportsTiming.MongoFavoriteUpdate>("sportstiming_favorites");
