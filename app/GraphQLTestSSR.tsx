"use client";
import { useSuspenseQuery } from "@apollo/client/react";
import gql from "graphql-tag";
import { HelloDocument } from "../graphql.generated";

gql`
  query Hello {
    hello
    __typename
  }
`;

export function GraphQLTestSSR() {
  const helloSuspense = useSuspenseQuery(HelloDocument);
  return (
    <div>
      Hello from SSR <code>useSuspenseQuery</code>: {helloSuspense.data.hello}
    </div>
  );
}
