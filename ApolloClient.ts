import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { SchemaLink } from "@apollo/client/link/schema";
import { schema } from "./graphql";
import { typePolicies } from "./graphql.typePolicies";

const makeApolloClient = () =>
  new ApolloClient({
    cache: new InMemoryCache({ typePolicies }),
    link: new SchemaLink({ schema }),
    clientAwareness: {
      name: "io-server",
      // commit
      version: process.env.NEXT_PUBLIC_COMMIT_SHA,
    },
  });

export const { getClient, query, PreloadQuery } =
  registerApolloClient(makeApolloClient);
