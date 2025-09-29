import { type DocumentNode, Kind } from "graphql";
import { ObjectId, type UpdateResult } from "mongodb";
import { NextRequest } from "next/server";
import { auth } from "../../../auth";
import { isAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { TopLoggerGraphQL } from "../../../sources/toplogger.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { pick, randomSliceOfSize, shuffle } from "../../../utils";
import {
  fetchGraphQLQuery,
  normalizeAndUpsertQueryData,
  type Variables,
} from "../../../utils/graphql";
import { deadlineLoop, jsonStreamResponse } from "../scraper-utils";
import {
  authSigninRefreshTokenQuery,
  type AuthSigninRefreshTokenResponse,
  climbDaysSessionsQuery,
  type ClimbDaysSessionsResponse,
  climbLogsQuery,
  type ClimbLogsResponse,
  climbsQuery,
  type ClimbsResponse,
  compClimbUsersForRankingClimbUserQuery,
  type CompClimbUsersForRankingClimbUserResponse,
  compRoundUsersForRankingQuery,
  type CompRoundUsersForRankingResponse,
  compsQuery,
  type CompsResponse,
  userMeStoreQuery,
  type UserMeStoreResponse,
} from "./queries";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: NextRequest) =>
  jsonStreamResponse(async function* () {
    //
    const startedAt = Date.now();
    const getTimeRemaining = () =>
      maxDuration * 1000 - (Date.now() - startedAt);

    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.TopLogger) continue;

      yield* wrapSource(
        dataSource,
        user,
        async function* ({ authTokens }, setUpdated) {
          setUpdated(false);

          const handleUpdateResults = (updateResults: {
            timing: { requestMs: number; upsertMs: number; totalMs: number };
            updates: {
              [key: string]: Pick<
                UpdateResult<Document>,
                "matchedCount" | "modifiedCount" | "upsertedCount"
              >;
            };
          }) => {
            for (const r of Object.values(updateResults.updates)) {
              setUpdated(
                typeof r == "object" &&
                  (r.modifiedCount > 0 || r.upsertedCount > 0),
              );
            }
            return updateResults;
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
            const refreshToken = authTokens.refresh.token;
            const authSigninRefreshTokenResponse =
              await fetchGraphQLQuery<AuthSigninRefreshTokenResponse>(
                "https://app.toplogger.nu/graphql",
                authSigninRefreshTokenQuery,
                { refreshToken },
                { headers: { authorization: `Bearer ${refreshToken}` } },
              );
            if (
              isAuthTokens(
                authSigninRefreshTokenResponse.data?.authSigninRefreshToken,
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

          // Helper to fetch, normalize and upsert query data
          const fetchsert = async <TData = Record<string, unknown>>(
            query: DocumentNode,
            variables?: Variables,
          ) => {
            const requestStarted = Date.now();
            const response = await fetchGraphQLQuery<TData>(
              "https://app.toplogger.nu/graphql",
              query,
              variables,
              { headers: { ...agentHeaders, ...headers } },
            );
            const requestMs = Date.now() - requestStarted;
            const upsertStarted = Date.now();
            const updates = await normalizeAndUpsertQueryData(
              query,
              variables,
              response.data!,
            );
            const upsertMs = Date.now() - upsertStarted;

            return [
              response,
              {
                operationName: query.definitions.find(
                  (definition) => definition.kind === Kind.OPERATION_DEFINITION,
                )?.name?.value,
                updates,
                timing: { requestMs, upsertMs, totalMs: requestMs + upsertMs },
              },
            ] as const;
          };

          const userId = dataSource.config.graphQLId;

          const [userMeStoreResponse, updateResult] =
            await fetchsert<UserMeStoreResponse>(userMeStoreQuery);
          yield handleUpdateResults(updateResult);

          const gyms = userMeStoreResponse.data?.userMe?.gymUsers.map(
            (fav) => fav.gym,
          );

          yield* deadlineLoop(
            shuffle(gyms || []),
            () => getTimeRemaining(),
            async function* (gym) {
              yield pick(gym, "id", "name", "city");

              const gymId = gym.id;

              const [compsResponse, updateResult] =
                await fetchsert<CompsResponse>(compsQuery, {
                  gymId,
                  pagination: {
                    page: 1,
                    perPage: 10, // Max is 10
                    orderBy: [{ key: "loggableStartAt", order: "desc" }],
                  },
                });
              yield handleUpdateResults(updateResult);

              const userComps = compsResponse.data?.comps.data?.filter(
                (comp) => comp.compUserMe,
              );

              for (const comp of shuffle(userComps || [])) {
                for (const poule of shuffle(comp.compPoules)) {
                  yield* deadlineLoop(
                    poule.compRounds,
                    // Only spend half the remaining time on this loop, to save time for climb days and logs
                    () => getTimeRemaining() / 2,
                    async function* (round) {
                      const compRoundUsersForRankingVariables = {
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
                      };

                      const [compRoundUsersForRankingResponse, updateResult] =
                        await fetchsert<CompRoundUsersForRankingResponse>(
                          compRoundUsersForRankingQuery,
                          compRoundUsersForRankingVariables,
                        );

                      const bestClimberId =
                        compRoundUsersForRankingResponse.data?.ranking.data[0]
                          ?.compUser.userId;
                      yield handleUpdateResults(updateResult);

                      if (
                        compRoundUsersForRankingResponse.data &&
                        compRoundUsersForRankingResponse.data?.ranking
                          .pagination.total >
                          compRoundUsersForRankingResponse.data?.ranking
                            .pagination.perPage
                      ) {
                        const [, updateResult] =
                          await fetchsert<CompRoundUsersForRankingResponse>(
                            compRoundUsersForRankingQuery,
                            {
                              ...compRoundUsersForRankingVariables,
                              pagination: {
                                ...compRoundUsersForRankingVariables.pagination,
                                page: 2,
                              },
                            },
                          );
                        yield handleUpdateResults(updateResult);
                      }

                      // Also get all the Comp Climbs of the best ranked climber,
                      // presuming that they've attempted every Comp Climb.
                      // This allows for backfilling of Climbs for comps that are no longer
                      // set, I haven't found a better way of doing this.
                      for (const userIddd of [userId, bestClimberId].filter(
                        Boolean,
                      )) {
                        const [
                          ,
                          compClimbUsersForRankingClimbUserUpdateResult,
                        ] =
                          await fetchsert<CompClimbUsersForRankingClimbUserResponse>(
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
                        yield handleUpdateResults(
                          compClimbUsersForRankingClimbUserUpdateResult,
                        );

                        const [, updateResult] =
                          await fetchsert<ClimbsResponse>(climbsQuery, {
                            gymId,
                            climbType: "boulder",
                            compRoundId: round.id,
                            userId: userIddd,
                          });

                        yield handleUpdateResults(updateResult);
                      }
                    },
                  );
                }
              }

              let climbDays: ClimbDaysSessionsResponse["climbDaysPaginated"]["data"] =
                [];
              let page = 1;
              // eslint-disable-next-line prefer-const
              let [graphqlClimbDaysPaginatedResponse, updateResult2] =
                await fetchsert<ClimbDaysSessionsResponse>(
                  climbDaysSessionsQuery,
                  { gymId, userId, pagination: { page, perPage: 100 } },
                );
              yield handleUpdateResults(updateResult2);

              if (!graphqlClimbDaysPaginatedResponse.data) {
                throw new Error("Failed to fetch climb days");
              }
              climbDays = climbDays.concat(
                graphqlClimbDaysPaginatedResponse.data.climbDaysPaginated.data,
              );
              const { total, perPage } =
                graphqlClimbDaysPaginatedResponse.data.climbDaysPaginated
                  .pagination;
              const totalPages = Math.ceil(total / perPage);

              for (; page <= totalPages; page++) {
                if (totalPages === 1) break;

                const [{ data }, updateResult] =
                  await fetchsert<ClimbDaysSessionsResponse>(
                    climbDaysSessionsQuery,
                    { gymId, userId, pagination: { page, perPage } },
                  );
                yield handleUpdateResults(updateResult);

                if (!data) throw new Error("Failed to fetch climb days");

                climbDays = climbDays.concat(data.climbDaysPaginated.data);
              }

              const recentDays = 3;
              const backfillDays = 6;
              const climbDaysToFetch = [
                // Most recent days
                ...climbDays.slice(0, recentDays),
                // other random days, for backfilling. TODO: General backfilling strategy
                ...randomSliceOfSize(climbDays.slice(recentDays), backfillDays),
              ];

              yield* deadlineLoop(
                climbDaysToFetch,
                () => getTimeRemaining(),
                async function* ({ statsAtDate: climbedAtDate }) {
                  const [, updateResult] = await fetchsert<ClimbLogsResponse>(
                    climbLogsQuery,
                    { gymId, userId, climbedAtDate },
                  );

                  yield handleUpdateResults(updateResult);
                },
              );
            },
          );
        },
      );
    }
  });
