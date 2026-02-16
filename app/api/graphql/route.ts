import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { resolvers, typeDefs } from "../../../graphql";
import { auth } from "../../../auth";

const server = new ApolloServer({ resolvers, typeDefs });

const handler = startServerAndCreateNextHandler(server, {
  context: async () => ({ user: (await auth())?.user || null }),
});

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
