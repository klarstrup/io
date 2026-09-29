import type { MongoClient } from "mongodb";

declare global {
  var _mongoClient: MongoClient | undefined;
}

declare module "@apollo/client-integration-nextjs" {
  interface InMemoryCache {
    _io_wasRestoredFromLocalStorage?: boolean;
  }
}
declare module "@apollo/client/react" {
  interface ApolloCache {
    _io_wasRestoredFromLocalStorage?: boolean;
  }
}
