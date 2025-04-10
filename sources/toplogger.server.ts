import { proxyCollection } from "../utils.server";
import type { MongoGraphQLObject } from "../utils/graphql";

export const TopLoggerGraphQL =
  proxyCollection<MongoGraphQLObject<string>>("toplogger_graphql");
