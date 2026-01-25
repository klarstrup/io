import { makeExecutableSchema } from "@graphql-tools/schema";
import { isValid } from "date-fns";
import { DocumentNode, GraphQLScalarType, Kind, print } from "graphql";
import gql from "graphql-tag";
import PartySocket from "partysocket";
import { auth } from "./auth";
import type { Resolvers } from "./graphql.generated";
import type { MongoVTodo } from "./lib";
import { getUserIcalTodosBetween } from "./sources/ical";
import { IcalEvents } from "./sources/ical.server";
import { pick } from "./utils";

const emitGraphQLUpdate = (
  userId: string,
  graphQlResponse: { fragment: DocumentNode; data: unknown },
) => {
  try {
    new PartySocket({
      id: process.env.VERCEL_DEPLOYMENT_ID,
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
      room: "GraphQL:" + userId,
    }).send(
      JSON.stringify({
        fragment: print(graphQlResponse.fragment),
        data: graphQlResponse.data,
      }),
    );
  } catch (error) {
    console.error(error);
  }
};

const dateScalar = new GraphQLScalarType({
  name: "Date",
  description: "Date custom scalar type",
  serialize(value) {
    // Convert outgoing Date to integer for JSON
    if (value instanceof Date) return value.toISOString();

    throw Error("GraphQL Date Scalar serializer expected a `Date` object");
  },
  parseValue(value) {
    // Convert incoming integer to Date
    let date: Date | null = null;
    if (typeof value === "number") date = new Date(value);
    if (typeof value === "string") date = new Date(value);

    if (date && isValid(date)) return date;

    throw new Error(
      "GraphQL Date Scalar parser expected a `number` or `string` representing a valid date",
    );
  },
  parseLiteral(ast) {
    // Convert hard-coded AST string to integer and then to Date
    let date: Date | null = null;
    if (ast.kind === Kind.INT) date = new Date(parseInt(ast.value, 10));
    if (ast.kind === Kind.STRING) date = new Date(ast.value);

    if (date && isValid(date)) return date;

    // Invalid hard-coded value (not an integer)
    return null;
  },
});

const editableTodoFields = ["summary", "start", "due", "completed"] as const;

export const resolvers: Resolvers = {
  Date: dateScalar,
  Query: {
    hello: () => "worlasdd",
    user: async () => {
      const user = (await auth())?.user;

      if (!user) return null;

      return { ...user, __typename: "User" };
    },
  },
  User: {
    todos: async () => {
      const user = (await auth())?.user;

      if (!user) return [];

      return (await getUserIcalTodosBetween(user.id)).map((todo) => ({
        ...todo,
        id: todo.uid,
        __typename: "Todo",
      }));
    },
  },
  Mutation: {
    updateTodo: async (_parent, args) => {
      const user = (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const todo = await IcalEvents.findOne<MongoVTodo>({
        uid: args.input.id,
        _io_userId: user.id,
      });

      if (!todo) throw new Error("Todo not found");

      const updateResult = await IcalEvents.updateOne(
        { uid: args.input.id, _io_userId: user.id },
        { $set: pick(args.input.data, ...editableTodoFields) },
      );

      if (updateResult.matchedCount === 0) {
        throw new Error("Failed to update todo");
      }

      const updatedTodo = await IcalEvents.findOne<MongoVTodo>({
        uid: args.input.id,
        _io_userId: user.id,
      });

      if (!updatedTodo) {
        throw new Error("Todo not found after update");
      }

      const result = {
        __typename: "UpdateTodoPayload",
        todo: {
          __typename: "Todo",
          id: updatedTodo.uid,
          ...updatedTodo,
        },
      } as const;

      try {
        return result;
      } finally {
        emitGraphQLUpdate(user.id, {
          fragment: gql`
            fragment UpdatedTodo on Todo {
              id
              summary
              start
              due
              completed
            }
          `,
          data: result.todo,
        });
      }
    },
    deleteTodo: async (_parent, args) => {
      const user = (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const result = await IcalEvents.deleteMany({
        uid: args.id,
        _io_userId: user.id,
      });

      if (result.deletedCount === 0) throw new Error("Failed to delete todo");

      try {
        return args.id;
      } finally {
        emitGraphQLUpdate(user.id, {
          fragment: gql`
            fragment DeletedTodo on Todo {
              id
            }
          `,
          data: { deleteTodo: args.id },
        });
      }
    },
  },
};

export const typeDefs = gql`
  scalar Date

  type Query {
    hello: String
    user: User
  }

  input TodoInput {
    summary: String
    start: Date
    due: Date
    completed: Date
  }

  input UpdateTodoInput {
    id: String!
    data: TodoInput!
  }

  type UpdateTodoPayload {
    todo: Todo
  }

  type Mutation {
    updateTodo(input: UpdateTodoInput!): UpdateTodoPayload
    deleteTodo(id: String!): String
  }

  type User {
    id: ID!
    name: String!
    email: String!
    image: String!
    emailVerified: Boolean!
    timeZone: String
    todos: [Todo!]
    # exerciseSchedules: [ExerciseSchedule!]
    # dataSources: [UserDataSource!]
  }

  type Todo {
    id: ID!
    summary: String
    start: Date
    due: Date
    completed: Date
  }
`;

export const schema = makeExecutableSchema({ typeDefs, resolvers });
