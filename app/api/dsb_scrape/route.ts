import { ObjectId } from "mongodb";
import { connection } from "next/server";
import { auth } from "../../../auth";
import { Users } from "../../../models/user.server";
import { DSB, isDSBAuthTokens } from "../../../sources/dsb";
import { DSBProductSummaries } from "../../../sources/dsb.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchText, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

async function fetchDSBProductSummaries(authTokens: DSB.AuthTokens) {
  const res = await fetch(
    `https://api.prd.dsbapp.azure.dsb.dk/checkin/v2/product-summaries?fromTimestamp=${new Date(0).toISOString()}`,
    {
      headers: {
        "x-os-name": "Android",
        "x-app-version": "3.2.1.15144",
        authorization: `Bearer ${authTokens.access_token}`,
      },
    },
  );
  if (!res.ok || res.status !== 200) {
    throw new Error("Failed to fetch product summaries: " + res.statusText);
  }
  return (await res.json()) as DSB.ProductSummariesResponse;
}

export const GET = () =>
  jsonStreamResponse(async function* () {
    await connection();

    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.DSB,
      async function* ({ config: { authTokens }, ...source }, setUpdated) {
        setUpdated(false);

        yield { authTokens };

        yield "refreshing token";

        const body = new FormData();
        body.append("grant_type", "refresh_token");
        body.append("refresh_token", authTokens.refresh_token);
        body.append("client_id", "8KplT2APgIdQ3N-LnNwqPX6O");

        const authSigninRefreshTokenResponse = await fetchText(
          "https://ciam.dsb.dk/oidc/op/v1.0/4_BOMBNYpon4ZvF5fIpM2I2Q/token",
          {
            method: "POST",
            headers: {
              "Accept-Encoding": "gzip",
              authorization:
                "Basic RkVLdm9xSkJTTW44RE41cmZYaEtyQmgyMnMyNUh4cFIzajNiMk95bDo2d3h0S1BlNEZrZlFhQVVUaVc4QVBwQjZKSmk3c1JjSk5PT1RkekZLVGhCeGpxNkFyaGJsTmVqd0hzdnZHWWxpNDVLemtMQmdzdmxNSUZIbFE0VHBuZUhvQkI0cWZTbHR2RUtxdGpvRUFPRmhKczhzc1VrM1lqZkRZcGppVzlqZQ==",
              "User-Agent": "okhttp/4.9.2",
              Host: "api.griptonite.io",
            },
            body,
          },
        );

        const authSigninRefreshTokenResponseJSON = JSON.parse(
          authSigninRefreshTokenResponse,
        ) as unknown;

        if (isDSBAuthTokens(authSigninRefreshTokenResponseJSON)) {
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

        yield "Fetching product summaries";

        const productSummariesResponse =
          await fetchDSBProductSummaries(authTokens);

        yield {
          productSummariesResponse,
        };

        await DSBProductSummaries.bulkWrite(
          productSummariesResponse.productSummaries.map((productSummary) => ({
            updateOne: {
              filter: { checkInId: productSummary.checkInId },
              update: {
                $set: {
                  ...productSummary,
                  _io_userId: user.id,
                  timestamp: new Date(productSummary.timestamp),
                  paymentStatus: {
                    ...productSummary.paymentStatus,
                    timestamp: new Date(productSummary.paymentStatus.timestamp),
                  },
                  productSummary: {
                    ...productSummary.productSummary,
                    trips: productSummary.productSummary.trips.map((trip) => ({
                      ...trip,
                      tripLegs: trip.tripLegs.map((tripLeg) => ({
                        ...tripLeg,
                        startDateTime: new Date(tripLeg.startDateTime),
                        endDateTime: new Date(tripLeg.endDateTime),
                        stops: tripLeg.stops.map((stop) => ({
                          ...stop,
                          actualTimeAndTrackInfo:
                            stop.actualTimeAndTrackInfo && {
                              ...stop.actualTimeAndTrackInfo,
                              departureTime:
                                stop.actualTimeAndTrackInfo.departureTime &&
                                new Date(
                                  stop.actualTimeAndTrackInfo.departureTime,
                                ),
                              arrivalTime:
                                stop.actualTimeAndTrackInfo.arrivalTime &&
                                new Date(
                                  stop.actualTimeAndTrackInfo.arrivalTime,
                                ),
                            },
                          plannedTimeAndTrackInfo:
                            stop.plannedTimeAndTrackInfo && {
                              ...stop.plannedTimeAndTrackInfo,
                              departureTime:
                                stop.plannedTimeAndTrackInfo.departureTime &&
                                new Date(
                                  stop.plannedTimeAndTrackInfo.departureTime,
                                ),
                              arrivalTime:
                                stop.plannedTimeAndTrackInfo.arrivalTime &&
                                new Date(
                                  stop.plannedTimeAndTrackInfo.arrivalTime,
                                ),
                            },
                        })),
                      })),
                    })),
                  },
                },
              },
              upsert: true,
            },
          })),
        );

        setUpdated(true);
      },
    );
  });
