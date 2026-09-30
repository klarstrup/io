import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { OAuth2Client } from "google-auth-library";
import { ObjectId } from "mongodb";
import type { IUser } from "./models/user";
import { Accounts } from "./models/user.server";
import { mongoClient } from "./mongodb";

export const auth = betterAuth({
  database: mongodbAdapter(mongoClient.db(), {
    client: mongoClient,
    usePlural: true,
  }),
  user: {
    additionalFields: {
      dataSources: { type: "string[]", input: false },
      timeZone: { type: "string", input: true },
      todoSchedules: { type: "string[]", input: false },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
    additionalFields: {
      tokenType: { type: "string", input: false, required: false },
    },
  },
  baseURL: process.env.NEXTAUTH_URL ?? "http://localhost:1337/",
  secret: process.env.JWT_SECRET!,
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    },
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      accessType: "offline",
      prompt: "select_account consent",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    },
  },
});

export const authUser = async () => {
  const { headers } = await import("next/headers");
  return ((await auth.api.getSession({ headers: await headers() }))?.user ||
    undefined) as IUser | undefined;
};

const oAuth2ClientOptions = {
  clientId: process.env.AUTH_GOOGLE_ID!,
  clientSecret: process.env.AUTH_GOOGLE_SECRET!,
} as const;
export const ensureGoogleAuth = async (userId: string) => {
  const userGoogleAccount = await Accounts.findOne({
    userId: new ObjectId(userId) as unknown as string,
    providerId: "google",
  });
  if (!userGoogleAccount) throw new Error("Google account not found for user");

  const oAuth2Client = new OAuth2Client(oAuth2ClientOptions);
  oAuth2Client.setCredentials({
    access_token: userGoogleAccount.accessToken,
    refresh_token: userGoogleAccount.refreshToken,
    token_type: userGoogleAccount.tokenType,
    scope: userGoogleAccount.scope || undefined,
    expiry_date: userGoogleAccount.accessTokenExpiresAt?.getTime(),
    id_token: userGoogleAccount.idToken,
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
        { accountId: userGoogleAccount.accountId },
        {
          $set: {
            accessToken:
              credentials.access_token || userGoogleAccount.accessToken,
            refreshToken:
              credentials.refresh_token || userGoogleAccount.refreshToken,
            tokenType: credentials.token_type || userGoogleAccount.tokenType,
            scope: credentials.scope || userGoogleAccount.scope,
            accessTokenExpiresAt: credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : userGoogleAccount.accessTokenExpiresAt,
            idToken: credentials.id_token || userGoogleAccount.idToken,
          },
        },
      );
    } else {
      await Accounts.updateOne(
        { accountId: userGoogleAccount.accountId },
        { $set: { accessToken: getAccessTokenResponse.token } },
      );
    }
  }

  // Diverging private 'redirectUri' fields
  return oAuth2Client;
};
