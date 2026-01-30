"use client";

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { SchemaLink } from "@apollo/client/link/schema";
import type { PropsWithChildren } from "react";
import { typePolicies } from "./graphql.typePolicies";
import {
  LocalStorageWrapper,
  persistCacheSync,
} from "./vendor/apollo-cache-persist";

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
    }

    return new ApolloClient({
      devtools: { enabled: true },
      cache,
      link:
        typeof window === "undefined"
          ? new SchemaLink({ schema: require("./graphql.ts").schema })
          : new HttpLink({
              uri:
                process.env.NODE_ENV === "development"
                  ? "http://localhost:3000/api/graphql"
                  : "https://io.klarstrup.dk/api/graphql",
            }),
    });
  };

  return (
    <ApolloNextAppProvider makeClient={makeApolloClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
