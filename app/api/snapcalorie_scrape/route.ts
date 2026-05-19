import { decode } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { connection } from "next/server";
import { auth } from "../../../auth";
import { isSnapCalorieAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { SnapCalorie } from "../../../sources/snapcalorie";
import { SnapCalorieMeals } from "../../../sources/snapcalorie.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchText, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

export const GET = () =>
  jsonStreamResponse(async function* () {
    await connection();

    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.SnapCalorie,
      async function* ({ config: { authTokens }, ...source }, setUpdated) {
        setUpdated(false);

        yield { authTokens };

        yield "refreshing token";

        const authSigninRefreshTokenResponse = await fetchText(
          "https://api.snapcalorie.com/auth/refresh",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: authTokens.refreshToken,
            }),
          },
        );

        const authSigninRefreshTokenResponseJSON = JSON.parse(
          authSigninRefreshTokenResponse,
        ) as unknown;

        if (isSnapCalorieAuthTokens(authSigninRefreshTokenResponseJSON)) {
          authTokens = authSigninRefreshTokenResponseJSON;
          await Users.updateOne(
            { _id: new ObjectId(user.id) },
            { $set: { "dataSources.$[source].config.authTokens": authTokens } },
            { arrayFilters: [{ "source.id": source.id }] },
          );
          yield "Updated authTokens with refresh token";
          yield { authTokens };
        } else {
          try {
            yield JSON.parse(authSigninRefreshTokenResponse);
          } catch {
            yield authSigninRefreshTokenResponse;
          }

          setUpdated(false);
          throw new Error("Failed to refresh token");
        }

        const jwtPayload = decode(authTokens.accessToken) as
          | SnapCalorie.JWT
          | null
          | string;

        if (
          !jwtPayload ||
          typeof jwtPayload === "string" ||
          !("id" in jwtPayload)
        ) {
          setUpdated(false);
          throw new Error("Invalid JWT payload");
        }

        const mealsResponse = await fetch(
          `https://api.snapcalorie.com/user/${jwtPayload.id}/meal?include=images.include.labels,labels`,
          { headers: { Authorization: `Bearer ${authTokens.accessToken}` } },
        );

        const meals = (await mealsResponse.json()) as SnapCalorie.Meal[];

        const bulkWriteResult = await SnapCalorieMeals.bulkWrite(
          meals.map((meal) => ({
            updateOne: {
              filter: { id: meal.id, userId: meal.userId },
              update: {
                $set: {
                  ...meal,
                  createDate: new Date(meal.createDate),
                  createdAt: new Date(meal.createdAt),
                  updatedAt: new Date(meal.updatedAt),
                  dateIso: new Date(meal.dateIso),
                  attributes: {
                    ...meal.attributes,
                    reviewedAt: meal.attributes.reviewedAt
                      ? new Date(meal.attributes.reviewedAt)
                      : undefined,
                  },
                  images: meal.images.map((image) => ({
                    ...image,
                    uploadDate: new Date(image.uploadDate),
                    createdAt: new Date(image.createdAt),
                  })),
                  labels: meal.labels.map((label) => ({
                    ...label,
                    date: new Date(label.date),
                    createdAt: new Date(label.createdAt),
                    updatedAt: new Date(label.updatedAt),
                  })),
                } satisfies Omit<SnapCalorie.Meal, "_id">,
              },
              upsert: true,
            },
          })),
        );

        yield bulkWriteResult;
      },
    );
  });
