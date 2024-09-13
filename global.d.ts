/* eslint-disable no-var */
import type { MongoClient } from "mongodb";
import type { DefaultSession } from "next-auth";
import type { IUser } from "./models/user";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: DefaultSession["user"] & { id: string } & Omit<IUser, "_id">;
  }
}

declare global {
  var _mongoClient: MongoClient | undefined;
}
