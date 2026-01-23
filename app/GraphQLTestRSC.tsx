import gql from "graphql-tag";
import { query } from "../ApolloClient";
import { HelloDocument } from "../graphql.generated";

gql`
  query Hello {
    hello
    __typename
  }
`;

export async function GraphQLTestRSC() {
  const hello = await query({ query: HelloDocument });
  return (
    <div>
      Hello from RSC <code>query</code>: {hello.data?.hello}
    </div>
  );
}
