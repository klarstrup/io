import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type Session } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
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
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        },
      },
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
