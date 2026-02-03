"use client";

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { SchemaLink } from "@apollo/client/link/schema";
import { type PropsWithChildren } from "react";
import { createNetworkStatusNotifier } from "react-apollo-network-status";
import ApolloFucker from "./ApolloFucker";
import { typePolicies } from "./graphql.typePolicies";
import {
  LocalStorageWrapper,
  persistCacheSync,
} from "./vendor/apollo-cache-persist";

export const { link, useApolloNetworkStatus } = createNetworkStatusNotifier();

// you need to create a component to wrap your app in
export function ApolloWrapper({ children }: PropsWithChildren) {
  const makeApolloClient = () => {
    const cache = new InMemoryCache({ typePolicies });

    if (typeof window !== "undefined") {
      // await before instantiating ApolloClient, else queries might run before the cache is persisted
      persistCacheSync({
        cache,
        storage: new LocalStorageWrapper(window.localStorage),
      });

      if (Object.keys(cache.extract() as Record<string, unknown>).length > 0) {
        cache._io_wasRestoredFromLocalStorage = true;
      }
    }

    const client = new ApolloClient({
      devtools: { enabled: true },
      cache,
      link:
        typeof window === "undefined"
          ? new SchemaLink({ schema: require("./graphql.ts").schema })
          : link.concat(
              new HttpLink({
                uri:
                  process.env.NODE_ENV === "development"
                    ? "http://localhost:1337/api/graphql"
                    : "https://io.klarstrup.dk/api/graphql",
              }),
            ),
    });

    return client;
  };

  return (
    <ApolloNextAppProvider makeClient={makeApolloClient}>
      {children}
      <ApolloFucker />
    </ApolloNextAppProvider>
  );
}
