import { proxyCollection } from "../utils.server";
import type { Steam } from "./steam";

export const SteamAppAchievements =
  proxyCollection<Steam.MongoSteamAppAchievement>("steam_app_achievements");

export const SteamUserAchievements =
  proxyCollection<Steam.MongoSteamUserAchievement>("steam_user_achievements");

export const SteamStoreItems =
  proxyCollection<Steam.MongoSteamStoreItem>("steam_store_items");
