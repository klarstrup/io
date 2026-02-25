"use client";

import { useApolloClient } from "@apollo/client/react";
import { parse } from "graphql";
import { ListPageUserDocument } from "../graphql.generated";
import { useChannel } from "../hooks/useChannel";
import { uniqueBy } from "../utils";
import { useSession } from "next-auth/react";
import { StoreObject } from "@apollo/client";

function messageToGraphQLUpdate(
  client: ReturnType<typeof useApolloClient>,
  message: string,
) {
  try {
    const data = JSON.parse(message) as unknown;
    console.log(data);
    if (
      typeof data === "object" &&
      data !== null &&
      "fragment" in data &&
      typeof data.fragment === "string" &&
      "data" in data
    ) {
      const data2 = data as { fragment: string; query: string; data: unknown };
      // TODO: Decide if sending the AST from the server or parsing it here is better
      if (
        data2.data &&
        typeof data2.data === "object" &&
        "__typename" in data2.data &&
        "fragment" in data2
      ) {
        client.writeFragment({
          id: client.cache.identify(data2.data as StoreObject),
          fragment: parse(data2.fragment),
          data: data2.data,
        });
      }

      if ("query" in data2 && typeof data2.query === "string") {
        const parsedQuery = parse(data2.query);
        const definitions = parsedQuery.definitions.filter(
          (def) => def.kind === "OperationDefinition",
        );
        if (definitions.length > 0) {
          const operationDef = definitions[0]!;
          if (
            operationDef.kind === "OperationDefinition" &&
            operationDef.operation === "mutation"
          ) {
            console.log("GraphQL mutation update received", operationDef);
            const firstFieldOfMutationQuery =
              operationDef.selectionSet.selections[0];

            if (
              firstFieldOfMutationQuery &&
              "name" in firstFieldOfMutationQuery &&
              firstFieldOfMutationQuery?.name
            ) {
              const mutationName = firstFieldOfMutationQuery.name.value;
              if (mutationName === "createTodo") {
                client.cache.updateQuery(
                  { query: ListPageUserDocument },
                  (data) => {
                    if (
                      !data ||
                      typeof data !== "object" ||
                      !("user" in data) ||
                      !data.user
                    ) {
                      return data;
                    }
                    return {
                      ...data,
                      user: {
                        ...data.user,
                        todos: data.user.todos
                          ? (uniqueBy(
                              [data2.data, ...data.user.todos],
                              (todo: (typeof data.user.todos)[number]) =>
                                todo.id,
                            ) as typeof data.user.todos)
                          : null,
                      },
                    };
                  },
                );
              }
            }

            // Handle mutation updates if necessary
          } else if (
            operationDef.kind === "OperationDefinition" &&
            operationDef.operation === "query"
          ) {
            // Handle query updates if necessary
          }
        }
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

export function GraphQLListener() {
  const client = useApolloClient();
  const { data: session } = useSession();
  const user = session?.user;

  useChannel({ channelName: "GraphQL:" + user?.id, skip: !user }, (message) => {
    console.log("Ably:", message);
    messageToGraphQLUpdate(client, message.data);
  });

  return null;
}
