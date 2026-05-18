import { proxyCollection } from "../utils.server";
import type { Meyers } from "./meyers";

export const MeyersMenus =
  proxyCollection<Meyers.MongoMenu>("meyers_menus");
