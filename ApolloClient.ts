import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { SchemaLink } from "@apollo/client/link/schema";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { resolvers, typeDefs } from "./graphql";

const schema = makeExecutableSchema({ typeDefs, resolvers });

const makeApolloClient = () =>
  new ApolloClient({
    cache: new InMemoryCache(),
    link: new SchemaLink({ schema }),
  });

export const { getClient, query, PreloadQuery } =
  registerApolloClient(makeApolloClient);
