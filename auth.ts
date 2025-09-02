import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type Session } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { mongoClient } from "./mongodb";
import { parseDateFields } from "./utils";

const {
  auth: authRaw,
  handlers,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
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

const auth = async () => {
  const session = await authRaw();

  return (
    session &&
    (parseDateFields(
      session as unknown as Record<string, unknown>,
    ) as unknown as Session)
  );
};

export { auth, handlers, signIn, signOut };
