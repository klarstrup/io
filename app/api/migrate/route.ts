import { getDB } from "../../../dbConnect";

export const maxDuration = 45;

export async function GET() {
  const db = await getDB();
  const now = "$$NOW";

  const [users, sessions, accounts] = await Promise.all([
    db.collection("users").updateMany(
      {
        $or: [
          { emailVerified: { $type: "date" } },
          { createdAt: { $exists: false } },
          { updatedAt: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            emailVerified: {
              $cond: [
                { $eq: [{ $type: "$emailVerified" }, "date"] },
                true,
                { $ifNull: ["$emailVerified", false] },
              ],
            },
            createdAt: { $ifNull: ["$createdAt", now] },
            updatedAt: { $ifNull: ["$updatedAt", now] },
          },
        },
      ],
    ),
    db.collection("sessions").updateMany(
      {
        $or: [
          { sessionToken: { $exists: true } },
          { expires: { $exists: true } },
          { createdAt: { $exists: false } },
          { updatedAt: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            token: { $ifNull: ["$token", "$sessionToken"] },
            expiresAt: { $ifNull: ["$expiresAt", "$expires"] },
            createdAt: { $ifNull: ["$createdAt", now] },
            updatedAt: { $ifNull: ["$updatedAt", now] },
          },
        },
        { $unset: ["sessionToken", "expires"] },
      ],
    ),
    db.collection("accounts").updateMany(
      {
        $or: [
          { type: { $exists: true } },
          { provider: { $exists: true } },
          { providerAccountId: { $exists: true } },
          { access_token: { $exists: true } },
          { refresh_token: { $exists: true } },
          { expires_at: { $exists: true } },
          { token_type: { $exists: true } },
          { id_token: { $exists: true } },
          { session_state: { $exists: true } },
          { createdAt: { $exists: false } },
          { updatedAt: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            providerId: { $ifNull: ["$providerId", "$provider"] },
            accountId: {
              $ifNull: ["$accountId", "$providerAccountId"],
            },
            accessToken: { $ifNull: ["$accessToken", "$access_token"] },
            refreshToken: { $ifNull: ["$refreshToken", "$refresh_token"] },
            accessTokenExpiresAt: {
              $ifNull: [
                "$accessTokenExpiresAt",
                {
                  $cond: [
                    { $isNumber: "$expires_at" },
                    { $toDate: { $multiply: ["$expires_at", 1000] } },
                    "$expires_at",
                  ],
                },
              ],
            },
            idToken: { $ifNull: ["$idToken", "$id_token"] },
            createdAt: { $ifNull: ["$createdAt", now] },
            updatedAt: { $ifNull: ["$updatedAt", now] },
          },
        },
        {
          $unset: [
            "type",
            "provider",
            "providerAccountId",
            "access_token",
            "refresh_token",
            "expires_at",
            "token_type",
            "id_token",
            "session_state",
          ],
        },
      ],
    ),
  ]);

  const verificationTokens = db.collection("verification_tokens");
  const verificationCount = await verificationTokens.countDocuments();

  if (verificationCount > 0) {
    await verificationTokens
      .aggregate([
        {
          $set: {
            id: { $toString: "$_id" },
            value: "$token",
            expiresAt: "$expires",
            createdAt: { $ifNull: ["$createdAt", now] },
            updatedAt: { $ifNull: ["$updatedAt", now] },
          },
        },
        { $unset: ["token", "expires"] },
        {
          $merge: {
            into: { db: db.databaseName, coll: "verifications" },
            on: "_id",
            whenMatched: "keepExisting",
            whenNotMatched: "insert",
          },
        },
      ])
      .toArray();

    await verificationTokens.drop();
  }

  return Response.json({
    users: users.modifiedCount,
    sessions: sessions.modifiedCount,
    accounts: accounts.modifiedCount,
    verifications: verificationCount,
  });
}
