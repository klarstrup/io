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

// you need to create a component to wrap your app in
export function ApolloWrapper({ children }: PropsWithChildren) {
  const makeApolloClient = () =>
    new ApolloClient({
      devtools: { enabled: true },
      cache: new InMemoryCache({ typePolicies }),
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

  return (
    <ApolloNextAppProvider makeClient={makeApolloClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
