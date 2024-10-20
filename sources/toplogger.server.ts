import { ScrapedAt } from "../lib";
import { proxyCollection } from "../utils.server";
import { TopLogger } from "./toplogger";

export const TopLoggerClimbs =
  proxyCollection<TopLogger.ClimbMultiple>("toplogger_climbs");

export const TopLoggerGyms =
  proxyCollection<TopLogger.GymSingle>("toplogger_gyms");

export const TopLoggerGroups =
  proxyCollection<TopLogger.GroupSingle>("toplogger_groups");

export const TopLoggerUsers =
  proxyCollection<TopLogger.User>("toplogger_users");

export const TopLoggerGroupUsers = proxyCollection<
  Omit<TopLogger.GroupUserMultiple, "user">
>("toplogger_group_users");

export const TopLoggerAscends =
  proxyCollection<TopLogger.AscendSingle>("toplogger_ascends");

export const TopLoggerHolds =
  proxyCollection<TopLogger.Hold>("toplogger_holds");

export const TopLoggerGymGroups = proxyCollection<
  TopLogger.GymGroup & ScrapedAt
>("toplogger_gym_groups");
