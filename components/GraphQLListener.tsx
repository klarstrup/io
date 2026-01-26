"use client";

import { useApolloClient } from "@apollo/client/react";
import { useChannel } from "ably/react";
import { parse } from "graphql";

function messageToGraphQLUpdate(
  client: ReturnType<typeof useApolloClient>,
  message: string,
) {
  try {
    let data = JSON.parse(message) as unknown;
    console.log(data);
    if (
      typeof data === "object" &&
      data !== null &&
      "fragment" in data &&
      typeof data.fragment === "string" &&
      "data" in data
    ) {
      const data2 = data as { fragment: string; data: unknown };
      // TODO: Decide if sending the AST from the server or parsing it here is better
      if (
        data2.data &&
        typeof data2.data === "object" &&
        "__typename" in data2.data
      ) {
        client.writeFragment({
          id: client.cache.identify(data2.data as any),
          fragment: parse(data2.fragment),
          data: data2.data,
        });
      }

      if (
        data2.data &&
        typeof data2.data === "object" &&
        "deleteTodo" in data2.data &&
        typeof data2.data.deleteTodo === "string"
      ) {
        const deletedTodoId = data2.data.deleteTodo;

        client.cache.evict({
          id: client.cache.identify({
            __typename: "Todo",
            id: deletedTodoId,
          }),
        });
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export function GraphQLListener({ userId }: { userId: string }) {
  const client = useApolloClient();

  useChannel("GraphQL:" + userId, (message) => {
    console.log("Ably:", message);
    messageToGraphQLUpdate(client, message.data);
  });

  return null;
}
