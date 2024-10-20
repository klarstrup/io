import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { Users } from "./models/user.server";
import { mongoClient } from "./mongodb";

const {
  auth: authRaw,
  handlers,
  signIn,
  signOut,
} = NextAuth({
  adapter: MongoDBAdapter(mongoClient),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  secret: process.env.JWT_SECRET!,
  callbacks: {
    session: ({ session, user }) => ({ ...session, user: user ?? null }),
  },
});

const auth = process.env.VERCEL
  ? authRaw
  : async () => {
      const userDocument = await Users.findOne();

      if (!userDocument) throw new Error("Unauthorized");

      const { _id, ...user } = userDocument;

      return { user: { ...user, id: String(_id) } };
    };

export { auth, handlers, signIn, signOut };
