import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLScalarType, Kind } from "graphql";
import gql from "graphql-tag";
import { auth } from "./auth";
import type { Resolvers } from "./graphql.generated";
import { getUserIcalTodosBetween } from "./sources/ical";

const dateScalar = new GraphQLScalarType({
  name: "Date",
  description: "Date custom scalar type",
  serialize(value) {
    // Convert outgoing Date to integer for JSON
    if (value instanceof Date) return value.getTime();

    throw Error("GraphQL Date Scalar serializer expected a `Date` object");
  },
  parseValue(value) {
    // Convert incoming integer to Date
    if (typeof value === "number") return new Date(value);

    throw new Error("GraphQL Date Scalar parser expected a `number`");
  },
  parseLiteral(ast) {
    // Convert hard-coded AST string to integer and then to Date
    if (ast.kind === Kind.INT) return new Date(parseInt(ast.value, 10));

    // Invalid hard-coded value (not an integer)
    return null;
  },
});

export const resolvers: Resolvers = {
  Date: dateScalar,
  Query: {
    hello: () => "worlasdd",
    user: async (_parent, _args, context, _info) => {
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
};

export const typeDefs = gql`
  scalar Date

  type Query {
    hello: String
    user: User
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
    description: String
    start: Date
    due: Date
    completed: Date
  }
`;

export const schema = makeExecutableSchema({ typeDefs, resolvers });
