"use client";
// ^ this file needs the "use client" pragma

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import type { PropsWithChildren } from "react";
import { typePolicies } from "./graphql.typePolicies";

// you need to create a component to wrap your app in
export function ApolloWrapper({
  children,
  headers,
}: PropsWithChildren<{ headers: ReadonlyHeaders }>) {
  const makeApolloClient = () =>
    new ApolloClient({
      cache: new InMemoryCache({ typePolicies }),
      link: new HttpLink({
        uri:
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000/api/graphql"
            : "https://io.klarstrup.dk/api/graphql",
        credentials: "same-origin",
        headers: Object.fromEntries(headers),
      }),
    });

  return (
    <ApolloNextAppProvider makeClient={makeApolloClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
