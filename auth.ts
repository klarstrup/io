import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { OAuth2Client } from "google-auth-library";
import { ObjectId } from "mongodb";
import NextAuth, { type Session } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { Accounts } from "./models/user.server";
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
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
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

const oAuth2ClientOptions = {
  clientId: process.env.AUTH_GOOGLE_ID!,
  clientSecret: process.env.AUTH_GOOGLE_SECRET!,
} as const;
export const ensureGoogleAuth = async (userId: string) => {
  const userGoogleAccount = await Accounts.findOne({
    userId: new ObjectId(userId) as unknown as string,
    provider: "google",
  });
  if (!userGoogleAccount) throw new Error("Google account not found for user");

  const oAuth2Client = new OAuth2Client(oAuth2ClientOptions);
  oAuth2Client.setCredentials({
    access_token: userGoogleAccount.access_token,
    refresh_token: userGoogleAccount.refresh_token,
    token_type: userGoogleAccount.token_type,
    scope: userGoogleAccount.scope,
    expiry_date: userGoogleAccount.expires_at,
    id_token: userGoogleAccount.id_token,
  });

  const getAccessTokenResponse = await oAuth2Client.getAccessToken();
  if (getAccessTokenResponse.token) {
    const credentials =
      (getAccessTokenResponse.res?.data as Parameters<
        Parameters<OAuth2Client["refreshAccessToken"]>[0]
      >[1]) || oAuth2Client.credentials;

    // This is present when it refreshes the access token using a refresh token i think
    if (credentials && "access_token" in credentials) {
      await Accounts.updateOne(
        { providerAccountId: userGoogleAccount.providerAccountId },
        {
          $set: {
            access_token: credentials.access_token ?? undefined,
            refresh_token: credentials.refresh_token ?? undefined,
            token_type:
              (credentials.token_type as
                Lowercase<string> | null | undefined) ?? undefined,
            scope: credentials.scope ?? undefined,
            expires_at: credentials.expiry_date ?? undefined,
            id_token: credentials.id_token ?? undefined,
          },
        },
      );
    } else {
      await Accounts.updateOne(
        { providerAccountId: userGoogleAccount.providerAccountId },
        { $set: { access_token: getAccessTokenResponse.token } },
      );
    }
  }

  // Diverging private 'redirectUri' fields
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return oAuth2Client as unknown as import("/Users/io/code/io/node_modules/googleapis-common/node_modules/google-auth-library/build/src/auth/oauth2client").OAuth2Client;
};
