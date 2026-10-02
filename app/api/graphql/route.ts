import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginUsageReporting } from "@apollo/server/plugin/usageReporting";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { authUser } from "../../../auth";
import { resolvers, typeDefs } from "../../../graphql";

export const maxDuration = 90;

const server = new ApolloServer({
  resolvers,
  typeDefs,
  plugins: [
    ApolloServerPluginUsageReporting({ sendVariableValues: { all: true } }),
  ],
});

const handler = startServerAndCreateNextHandler(server, {
  context: async () => ({ user: (await authUser()) || null }),
});

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
