import { addDays, isFuture, subDays } from "date-fns";
import { type DocumentNode, Kind } from "graphql";
import { ObjectId, type UpdateResult } from "mongodb";
import { NextRequest } from "next/server";
import { auth } from "../../../auth";
import { isAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { TopLoggerGraphQL } from "../../../sources/toplogger.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import {
  partition,
  pick,
  randomSliceOfSize,
  shuffle,
  uniqueBy,
} from "../../../utils";
import {
  fetchGraphQLQuery,
  normalizeAndUpsertQueryData,
  type Variables,
} from "../../../utils/graphql";
import { materializeToploggerWorkouts } from "../materialize_workouts/materializers";
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
export const maxDuration = 100;

export const GET = (request: NextRequest) =>
  jsonStreamResponse(async function* () {
    const startedAt = Date.now();
    const getTimeRemaining = () =>
      maxDuration * 1000 - (Date.now() - startedAt);

    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.TopLogger,
      async function* (dataSource, setUpdated) {
        let {
          // eslint-disable-next-line prefer-const
          config: { authTokens, graphQLId },
        } = dataSource;
        setUpdated(false);

        const handleUpdateResults = (updateResults: {
          operationName?: string | undefined;
          timing: { requestMs: number; upsertMs: number; totalMs: number };
          updates: {
            [key: string]: Pick<
              UpdateResult,
              "matchedCount" | "modifiedCount" | "upsertedCount"
            >;
          };
        }) => {
          for (const r of Object.values(updateResults.updates)) setUpdated(r);

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
                $set: { "dataSources.$[source].config.authTokens": authTokens },
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
        async function* fetchsert<TData = Record<string, unknown>>(
          query: DocumentNode,
          variables?: Variables,
        ) {
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

          yield handleUpdateResults({
            operationName: query.definitions.find(
              (definition) => definition.kind === Kind.OPERATION_DEFINITION,
            )?.name?.value,
            updates,
            timing: { requestMs, upsertMs, totalMs: requestMs + upsertMs },
          });

          return response;
        }

        const userId = graphQLId;

        // Always fetch the most recent climb day, and from that climb day fetch the climb logs.
        const { data: climbDaysData } =
          yield* fetchsert<ClimbDaysSessionsResponse>(climbDaysSessionsQuery, {
            userId,
            pagination: { perPage: 1 },
          });
        const mostRecentClimbDay = climbDaysData?.climbDaysPaginated.data[0];
        if (mostRecentClimbDay) {
          yield* fetchsert<ClimbLogsResponse>(climbLogsQuery, {
            userId,
            climbedAtDate: mostRecentClimbDay.statsAtDate,
          });
        }

        // Aggressive materialize not to wait for the rest of the scrape to finish
        yield* materializeToploggerWorkouts(user, dataSource);

        const { data: userMeStoreData } =
          yield* fetchsert<UserMeStoreResponse>(userMeStoreQuery);
        const gyms = userMeStoreData?.userMe?.gymUsers.map((fav) => fav.gym);

        const userComps: CompsResponse["comps"]["data"] = [];
        yield* deadlineLoop(
          shuffle(gyms),
          () => getTimeRemaining(),
          async function* ({ id: gymId }) {
            const { data: compsData } = yield* fetchsert<CompsResponse>(
              compsQuery,
              { gymId, registered: true, pagination: { perPage: 10 } },
            );
            if (compsData?.comps?.data) userComps.push(...compsData.comps.data);
          },
        );
        const [activeComps, pastComps] = partition(
          uniqueBy(userComps, (c) => c.id),
          (c) =>
            isFuture(addDays(new Date(c.loggableEndAt), 1)) ||
            isFuture(subDays(new Date(c.loggableStartAt), 1)),
        );

        // Fetch all active and backfill one past comp
        yield* deadlineLoop(
          [...activeComps, ...randomSliceOfSize(pastComps, 1)],
          () => getTimeRemaining(),
          async function* (comp) {
            yield pick(comp, "id", "name");

            const {
              id: compId,
              compPoules,
              climbType,
              compGyms,
              compUserMe,
            } = comp;
            for (const { compRounds } of shuffle(compPoules)) {
              const userCompRounds = compRounds.filter((r) =>
                compUserMe?.compRoundUsers.some(
                  (ur) => ur.compRoundId === r.id,
                ),
              );

              yield* deadlineLoop(
                // Cover a scenario where the user is in a comp but isn't in
                // any rounds (weird, but possible).
                shuffle(userCompRounds.length ? userCompRounds : compRounds),
                // Only spend a fraction of the remaining time on this loop, to save time for climb logs
                () => getTimeRemaining() / 3,
                async function* ({ id: compRoundId }) {
                  const gymId = compGyms[0]?.gymId;
                  if (!gymId) return;

                  const compRoundUsersVariables = {
                    gymId,
                    compId,
                    compRoundId,
                    pagination: {
                      page: 1,
                      perPage: 100,
                      orderBy: [
                        { key: "compUser.disqualifiedInt", order: "asc" },
                        { key: "score", order: "desc" },
                      ],
                    },
                  };

                  const { data: compRoundUsersData } =
                    yield* fetchsert<CompRoundUsersForRankingResponse>(
                      compRoundUsersForRankingQuery,
                      compRoundUsersVariables,
                    );

                  const bestClimberId =
                    compRoundUsersData?.ranking.data[0]?.compUser.userId;

                  if (
                    compRoundUsersData &&
                    compRoundUsersData?.ranking.pagination.total >
                      compRoundUsersData?.ranking.pagination.perPage
                  ) {
                    yield* fetchsert<CompRoundUsersForRankingResponse>(
                      compRoundUsersForRankingQuery,
                      {
                        ...compRoundUsersVariables,
                        pagination: {
                          ...compRoundUsersVariables.pagination,
                          page: 2,
                        },
                      },
                    );
                  }

                  // Also get all the Comp Climbs of the best ranked climber,
                  // presuming that they've attempted every Comp Climb.
                  // This allows for backfilling of Climbs for comps that are no longer
                  // set, I haven't found a better way of doing this.
                  for (const userIddd of [userId, bestClimberId].filter(
                    Boolean,
                  )) {
                    yield* fetchsert<CompClimbUsersForRankingClimbUserResponse>(
                      compClimbUsersForRankingClimbUserQuery,
                      {
                        gymId,
                        userId: userIddd,
                        compId,
                        compRoundId,
                        pagination: {
                          page: 1,
                          perPage: 100,
                          orderBy: [{ key: "points", order: "desc" }],
                        },
                      },
                    );

                    for (const compGym of shuffle(compGyms)) {
                      yield* fetchsert<ClimbsResponse>(climbsQuery, {
                        gymId: compGym.gymId,
                        compRoundId,
                        userId: userIddd,
                        climbType,
                      });
                    }
                  }
                },
              );
            }
          },
        );

        let climbDays: ClimbDaysSessionsResponse["climbDaysPaginated"]["data"] =
          [];
        let page = 1;
        const climbDaysResponse = yield* fetchsert<ClimbDaysSessionsResponse>(
          climbDaysSessionsQuery,
          { userId, pagination: { page, perPage: 100 } },
        );

        if (!climbDaysResponse.data) {
          throw new Error("Failed to fetch climb days");
        }
        climbDays = climbDays.concat(
          climbDaysResponse.data.climbDaysPaginated.data,
        );
        const { total, perPage } =
          climbDaysResponse.data.climbDaysPaginated.pagination;
        const totalPages = Math.ceil(total / perPage);

        for (page++; page <= totalPages; page++) {
          if (totalPages === 1) break;

          const { data } = yield* fetchsert<ClimbDaysSessionsResponse>(
            climbDaysSessionsQuery,
            { userId, pagination: { page, perPage } },
          );

          if (!data) throw new Error("Failed to fetch climb days");

          climbDays = climbDays.concat(data.climbDaysPaginated.data);
        }

        yield* deadlineLoop(
          // Backfill a random climb days each time
          randomSliceOfSize(climbDays, 2),
          () => getTimeRemaining(),
          async function* ({ statsAtDate: climbedAtDate }) {
            yield* fetchsert<ClimbLogsResponse>(climbLogsQuery, {
              userId,
              climbedAtDate,
            });
          },
        );
      },
    );
  });
