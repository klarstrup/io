import gql from "graphql-tag";
import { Resolvers } from "./graphql.generated";

export const resolvers: Resolvers = {
  Query: {
    hello: () => "worlasdd",
  },
};

export const typeDefs = gql`
  type Query {
    hello: String
  }
`;
