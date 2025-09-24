import { type DocumentNode } from "graphql";
import { ObjectId, UpdateResult } from "mongodb";
import { NextRequest } from "next/server";
import { auth } from "../../../auth";
import { isAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { TopLoggerGraphQL } from "../../../sources/toplogger.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { randomSliceOfSize } from "../../../utils";
import {
  fetchGraphQLQuery,
  normalizeAndUpsertQueryData,
  type Variables,
} from "../../../utils/graphql";
import { jsonStreamResponse } from "../scraper-utils";
import {
  authSigninRefreshTokenQuery,
  climbDaysSessionsQuery,
  ClimbDaysSessionsResponse,
  climbLogsQuery,
  ClimbLogsResponse,
  climbsQuery,
  ClimbsResponse,
  compClimbUsersForRankingClimbUserQuery,
  CompClimbUsersForRankingClimbUserResponse,
  compRoundUsersForRankingQuery,
  CompRoundUsersForRankingResponse,
  compsQuery,
  CompsResponse,
  userMeStoreQuery,
  UserMeStoreResponse,
} from "./queries";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: NextRequest) =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.TopLogger) continue;

      yield* wrapSource(
        dataSource,
        user,
        async function* ({ authTokens }, setUpdated) {
          const handleUpdateResults = (updateResults: {
            [key: string]:
              | string
              | Pick<
                  UpdateResult<Document>,
                  "matchedCount" | "modifiedCount" | "upsertedCount"
                >;
            operationName: string;
          }) => {
            for (const r of Object.values(updateResults)) {
              setUpdated(
                typeof r == "object" &&
                  (r.modifiedCount > 0 || r.upsertedCount > 0),
              );
            }
          };

          if (
            !authTokens ||
            new Date(authTokens.refresh.expiresAt) < new Date()
          ) {
            throw new Error(
              "No auth tokens or refresh token expired, please add auth tokens",
            );
          }

          await TopLoggerGraphQL.createIndexes(
            [
              { key: { __typename: 1 } },
              { key: { id: 1 } },
              { key: { userId: 1 } },
              { key: { tickedFirstAtDate: 1 } },
              { key: { climbedAtDate: 1 } },
              { key: { __typename: 1, id: 1 } },
              { key: { __typename: 1, compId: 1 } },
              { key: { __typename: 1, compId: 1, userId: 1 } },
              { key: { __typename: 1, userId: 1, climbedAtDate: 1 } },
              {
                key: {
                  __typename: 1,
                  userId: 1,
                  climbId: 1,
                  climbedAtDate: -1,
                },
              },
              { key: { __typename: 1, compId: 1, compRoundId: 1 } },
            ],
            { sparse: true },
          );

          let headers: HeadersInit = {
            authorization: `Bearer ${authTokens.access.token}`,
          };
          yield { authTokens };

          if (new Date(authTokens.access.expiresAt) < new Date()) {
            yield "Access token expired, refreshing token";
            const authSigninRefreshTokenResponse = await fetchGraphQLQuery(
              "https://app.toplogger.nu/graphql",
              authSigninRefreshTokenQuery,
              { refreshToken: authTokens.refresh.token },
              {
                headers: {
                  authorization: `Bearer ${authTokens.refresh.token}`,
                },
              },
              "authSigninRefreshToken",
            );

            if (
              typeof authSigninRefreshTokenResponse === "object" &&
              authSigninRefreshTokenResponse &&
              "data" in authSigninRefreshTokenResponse &&
              typeof authSigninRefreshTokenResponse.data === "object" &&
              authSigninRefreshTokenResponse.data &&
              "authSigninRefreshToken" in authSigninRefreshTokenResponse.data &&
              typeof authSigninRefreshTokenResponse.data
                .authSigninRefreshToken === "object" &&
              isAuthTokens(
                authSigninRefreshTokenResponse.data.authSigninRefreshToken,
              )
            ) {
              authTokens =
                authSigninRefreshTokenResponse.data.authSigninRefreshToken;
              await Users.updateOne(
                { _id: new ObjectId(user.id) },
                {
                  $set: {
                    "dataSources.$[source].config.authTokens": authTokens,
                  },
                },
                { arrayFilters: [{ "source.id": dataSource.id }] },
              );
              yield "Updated authTokens with refresh token";
              yield { authTokens };
            } else {
              throw new Error("Failed to refresh token");
            }
          }

          headers = { authorization: `Bearer ${authTokens.access.token}` };

          const agentHeaders = request.headers;
          agentHeaders.delete("cookie");
          agentHeaders.delete("host");
          agentHeaders.delete("x-forwarded-for");
          agentHeaders.delete("x-forwarded-host");
          agentHeaders.delete("x-forwarded-port");
          agentHeaders.delete("x-forwarded-proto");

          agentHeaders.set("pragma", "no-cache");
          agentHeaders.set("origin", "https://app.toplogger.nu");
          agentHeaders.set("x-app-locale", "en-us");

          const fetchQueryAndNormalizeAndUpsertQueryData = async <
            TData = Record<string, unknown>,
          >(
            query: DocumentNode,
            variables?: Variables,
          ) => {
            const response = await fetchGraphQLQuery<TData>(
              "https://app.toplogger.nu/graphql",
              query,
              variables,
              { headers: { ...agentHeaders, ...headers } },
            );

            const updateResult = await normalizeAndUpsertQueryData(
              query,
              variables,
              response.data!,
            );

            return [response, updateResult] as const;
          };

          const userId = dataSource.config.graphQLId;

          const [userMeStoreResponse, updateResult] =
            await fetchQueryAndNormalizeAndUpsertQueryData<UserMeStoreResponse>(
              userMeStoreQuery,
            );
          yield updateResult;
          handleUpdateResults(updateResult);

          const userMe = userMeStoreResponse.data?.userMe;

          const gyms = randomSliceOfSize(
            userMe?.gymUsers.map((fav) => fav.gym) || [],
            1,
          );

          yield gyms;

          if (gyms) {
            for (const gymId of gyms.map(({ id }) => id)) {
              const [compsResponse, updateResult] =
                await fetchQueryAndNormalizeAndUpsertQueryData<CompsResponse>(
                  compsQuery,
                  {
                    gymId,
                    pagination: {
                      page: 1,
                      perPage: 10, // Max is 10
                      orderBy: [{ key: "loggableStartAt", order: "desc" }],
                    },
                  },
                );
              yield updateResult;
              handleUpdateResults(updateResult);

              const userComps = compsResponse.data?.comps.data?.filter(
                (comp) => comp.compUserMe,
              );

              for (const comp of userComps || []) {
                for (const poule of comp.compPoules) {
                  for (const round of poule.compRounds) {
                    const [compRoundUsersForRankingResponse, updateResult] =
                      await fetchQueryAndNormalizeAndUpsertQueryData<CompRoundUsersForRankingResponse>(
                        compRoundUsersForRankingQuery,
                        {
                          gymId,
                          compId: comp.id,
                          compRoundId: round.id,
                          pagination: {
                            page: 1,
                            perPage: 100,
                            orderBy: [
                              { key: "compUser.disqualifiedInt", order: "asc" },
                              { key: "score", order: "desc" },
                            ],
                          },
                        },
                      );

                    const bestClimberId =
                      compRoundUsersForRankingResponse.data?.ranking.data[0]
                        ?.compUser.userId;
                    yield updateResult;
                    handleUpdateResults(updateResult);

                    if (
                      compRoundUsersForRankingResponse.data &&
                      compRoundUsersForRankingResponse.data?.ranking.pagination
                        .total >
                        compRoundUsersForRankingResponse.data?.ranking
                          .pagination.perPage
                    ) {
                      const [, updateResult] =
                        await fetchQueryAndNormalizeAndUpsertQueryData<CompRoundUsersForRankingResponse>(
                          compRoundUsersForRankingQuery,
                          {
                            gymId,
                            compId: comp.id,
                            compRoundId: round.id,
                            pagination: {
                              page: 2,
                              perPage: 100,
                              orderBy: [
                                {
                                  key: "compUser.disqualifiedInt",
                                  order: "asc",
                                },
                                { key: "score", order: "desc" },
                              ],
                            },
                          },
                        );
                      yield updateResult;
                      handleUpdateResults(updateResult);
                    }

                    // Also get all the Comp Climbs of the best ranked climber,
                    // presuming that they've attempted every Comp Climb.
                    // This allows for backfilling of Climbs for comps that are no longer
                    // set, I haven't found a better way of doing this.
                    for (const userIddd of [userId, bestClimberId].filter(
                      Boolean,
                    )) {
                      const [, compClimbUsersForRankingClimbUserUpdateResult] =
                        await fetchQueryAndNormalizeAndUpsertQueryData<CompClimbUsersForRankingClimbUserResponse>(
                          compClimbUsersForRankingClimbUserQuery,
                          {
                            gymId,
                            userId: userIddd,
                            compId: comp.id,
                            compRoundId: round.id,
                            pagination: {
                              page: 1,
                              perPage: 100,
                              orderBy: [{ key: "points", order: "desc" }],
                            },
                          },
                        );
                      yield compClimbUsersForRankingClimbUserUpdateResult;
                      handleUpdateResults(
                        compClimbUsersForRankingClimbUserUpdateResult,
                      );

                      const [, updateResult] =
                        await fetchQueryAndNormalizeAndUpsertQueryData<ClimbsResponse>(
                          climbsQuery,
                          {
                            gymId,
                            climbType: "boulder",
                            compRoundId: round.id,
                            userId: userIddd,
                          },
                        );

                      yield updateResult;
                      handleUpdateResults(updateResult);
                    }
                  }
                }
              }
            }
          }

          let climbDays: ClimbDaysSessionsResponse["climbDaysPaginated"]["data"] =
            [];
          let page = 1;
          // eslint-disable-next-line prefer-const
          let [graphqlClimbDaysPaginatedResponse, updateResult2] =
            await fetchQueryAndNormalizeAndUpsertQueryData<ClimbDaysSessionsResponse>(
              climbDaysSessionsQuery,
              {
                userId,
                bouldersTotalTriesMin: 1,
                pagination: { page, perPage: 100 },
              },
            );
          handleUpdateResults(updateResult2);

          if (!graphqlClimbDaysPaginatedResponse.data) {
            throw new Error("Failed to fetch climb days");
          }
          climbDays = climbDays.concat(
            graphqlClimbDaysPaginatedResponse.data.climbDaysPaginated.data,
          );
          const totalPages = Math.ceil(
            graphqlClimbDaysPaginatedResponse.data?.climbDaysPaginated
              .pagination.total /
              graphqlClimbDaysPaginatedResponse.data?.climbDaysPaginated
                .pagination.perPage || 1,
          );

          for (; page <= totalPages; page++) {
            [graphqlClimbDaysPaginatedResponse, updateResult2] =
              await fetchQueryAndNormalizeAndUpsertQueryData<ClimbDaysSessionsResponse>(
                climbDaysSessionsQuery,
                {
                  userId,
                  bouldersTotalTriesMin: 1,
                  pagination: { page, perPage: 100 },
                },
              );
            handleUpdateResults(updateResult2);

            if (!graphqlClimbDaysPaginatedResponse.data) {
              throw new Error("Failed to fetch climb days");
            }

            climbDays = climbDays.concat(
              graphqlClimbDaysPaginatedResponse.data.climbDaysPaginated.data,
            );
          }

          const recentDays = 3;
          const backfillDays = 6;
          const climbDaysToFetch = [
            // Most recent days
            ...climbDays.slice(0, recentDays),
            // other random days, for backfilling. TODO: General backfilling strategy
            ...randomSliceOfSize(climbDays.slice(recentDays), backfillDays),
          ];

          for (const climbDay of climbDaysToFetch) {
            const [, updateResult] =
              await fetchQueryAndNormalizeAndUpsertQueryData<ClimbLogsResponse>(
                climbLogsQuery,
                { userId, climbedAtDate: climbDay.statsAtDate },
              );

            yield updateResult;
            handleUpdateResults(updateResult);
          }
        },
      );
    }
  });
