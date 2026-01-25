"use client";

import { useApolloClient } from "@apollo/client/react";
import { parse } from "graphql";
import usePartySocket from "partysocket/react";

export function GraphQLListener({ userId }: { userId: string }) {
  const client = useApolloClient();

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
    room: "GraphQL:" + userId,
    onOpen() {
      socket.send(
        JSON.stringify(
          `Hi partykit server im GraphQLListener client ${userId} at ${new Date().toISOString()}`,
        ),
      );
    },
    onMessage(event) {
      console.log(event);
      try {
        let data = JSON.parse(event.data as string) as unknown;
        console.log(data);
        if (
          typeof data === "object" &&
          data !== null &&
          "query" in data &&
          typeof data.query === "string" &&
          "data" in data
        ) {
          const data2 = data as { query: string; data: unknown };
          // TODO: Decide if sending the AST from the server or parsing it here is better
          client.cache.writeQuery({
            query: parse(data2.query),
            data: data2.data,
          });

          if (
            typeof data2.data === "object" &&
            data2.data !== null &&
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
    },
  });

  return null;
}
