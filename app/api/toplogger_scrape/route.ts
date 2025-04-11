import { type DocumentNode } from "graphql";
import gql from "graphql-tag";
import { ObjectId } from "mongodb";
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
} from "../../../utils/graphql";
import { materializeAllToploggerWorkouts } from "../materialize_workouts/materializers";
import { jsonStreamResponse } from "../scraper-utils";
import {
  ClimbDayScalars,
  ClimbDayScalarsFragment,
  ClimbGroupClimbScalars,
  ClimbGroupClimbScalarsFragment,
  ClimbLogScalars,
  ClimbLogScalarsFragment,
  ClimbScalars,
  ClimbScalarsFragment,
  ClimbUserScalars,
  ClimbUserScalarsFragment,
  CompClimbUserScalars,
  CompClimbUserScalarsFragment,
  CompGymScalars,
  CompGymScalarsFragment,
  CompPouleScalars,
  CompPouleScalarsFragment,
  CompPouleUserScalars,
  CompPouleUserScalarsFragment,
  CompRoundClimbScalars,
  CompRoundClimbScalarsFragment,
  CompRoundScalars,
  CompRoundScalarsFragment,
  CompRoundUserScalars,
  CompRoundUserScalarsFragment,
  CompScalars,
  CompScalarsFragment,
  CompUserScalars,
  CompUserScalarsFragment,
  GymScalars,
  GymScalarsFragment,
  GymUserMeScalars,
  GymUserMeScalarsFragment,
  HoldColorScalars,
  HoldColorScalarsFragment,
  PaginatedObjects,
  PaginationFragment,
  UserMeScalars,
  UserMeScalarsFragment,
  WallScalars,
  WallScalarsFragment,
  WallSectionScalars,
  WallSectionScalarsFragment,
} from "./fragments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const climbsQuery = gql`
  ${PaginationFragment}
  ${ClimbScalarsFragment}
  ${ClimbUserScalarsFragment}
  ${CompRoundClimbScalarsFragment}
  ${ClimbGroupClimbScalarsFragment}
  ${CompClimbUserScalarsFragment}

  query climbs(
    $gymId: ID!
    $climbType: ClimbType!
    $userId: ID
    $compRoundId: ID
  ) {
    climbs(
      gymId: $gymId
      climbType: $climbType
      compRoundId: $compRoundId
      includeHidden: true
    ) {
      pagination {
        ...PaginationFragment
      }
      data {
        ...ClimbScalarsFragment

        climbGroupClimbs {
          ...ClimbGroupClimbScalarsFragment
        }

        climbUser(userId: $userId) {
          ...ClimbUserScalarsFragment

          compClimbUser(compRoundId: $compRoundId) {
            ...CompClimbUserScalarsFragment

            climbUser {
              ...ClimbUserScalarsFragment
            }
            compRoundClimb {
              ...CompRoundClimbScalarsFragment
            }
          }
        }

        compRoundClimb(compRoundId: $compRoundId) {
          ...CompRoundClimbScalarsFragment
        }
      }
      __typename
    }
  }
`;
type ClimbsResponse = {
  climbs: PaginatedObjects<
    ClimbScalars & {
      wall: WallScalars;
      wallSection: WallSectionScalars;
      holdColor: HoldColorScalars;
      climbGroupClimbs: ClimbGroupClimbScalars[];
      climbUser: ClimbUserScalars & {
        compClimbUser: CompClimbUserScalars & {
          climbUser: ClimbUserScalars;
          compRoundClimb: CompRoundClimbScalars;
        };
      };
      compRoundClimb: CompRoundClimbScalars;
    }
  >;
};

const authSigninRefreshTokenQuery = gql`
  mutation authSigninRefreshToken($refreshToken: JWT!) {
    authSigninRefreshToken(refreshToken: $refreshToken) {
      access {
        token
        expiresAt
        __typename
      }
      refresh {
        token
        expiresAt
        __typename
      }
      __typename
    }
  }
`;

const climbDaysSessionsQuery = gql`
  ${PaginationFragment}
  ${ClimbDayScalarsFragment}

  query climbDaysSessions(
    $userId: ID!
    $bouldersTotalTriesMin: Int
    $routesTotalTriesMin: Int
    $statsAtDateMin: DateTime
    $statsAtDateMax: DateTime
    $pagination: PaginationInputClimbDays
  ) {
    climbDaysPaginated(
      userId: $userId
      bouldersTotalTriesMin: $bouldersTotalTriesMin
      routesTotalTriesMin: $routesTotalTriesMin
      statsAtDateMin: $statsAtDateMin
      statsAtDateMax: $statsAtDateMax
      pagination: $pagination
      updateDayStatsIfOld: true
    ) {
      pagination {
        ...PaginationFragment
      }
      data {
        ...ClimbDayScalarsFragment
      }
      __typename
    }
  }
`;
interface ClimbDaysSessionsResponse {
  climbDaysPaginated: PaginatedObjects<ClimbDayScalars>;
}

const climbLogsQuery = gql`
  ${PaginationFragment}
  ${ClimbLogScalarsFragment}
  ${ClimbScalarsFragment}

  query climbLogsSession(
    $gymId: ID
    $userId: ID!
    $climbedAtDate: DateTime!
    $pagination: PaginationInputClimbLogs
    $climbType: ClimbType
  ) {
    climbLogs(
      gymId: $gymId
      userId: $userId
      climbedAtDate: $climbedAtDate
      climbType: $climbType
      pagination: $pagination
    ) {
      pagination {
        ...PaginationFragment
      }
      data {
        ...ClimbLogScalarsFragment

        climb {
          ...ClimbScalarsFragment
        }
      }
      __typename
    }
  }
`;
type ClimbLogsResponse = {
  climbLogs: PaginatedObjects<ClimbLogScalars & { climb: ClimbScalars }>;
};

const compsQuery = gql`
  ${PaginationFragment}
  ${CompScalarsFragment}
  ${CompGymScalarsFragment}
  ${CompPouleScalarsFragment}
  ${CompRoundScalarsFragment}
  ${CompRoundUserScalarsFragment}
  ${CompUserScalarsFragment}

  query comps(
    $gymId: ID!
    $search: String
    $climbType: ClimbType
    $inviteOnly: Boolean
    $pagination: PaginationInputComps
  ) {
    comps(
      gymId: $gymId
      search: $search
      climbType: $climbType
      inviteOnly: $inviteOnly
      pagination: $pagination
    ) {
      pagination {
        ...PaginationFragment
      }
      data {
        ...CompScalarsFragment

        compGyms {
          ...CompGymScalarsFragment
        }

        compPoules {
          ...CompPouleScalarsFragment

          compRounds {
            ...CompRoundScalarsFragment

            compRoundUsers {
              ...CompRoundUserScalarsFragment
            }
          }
        }

        compUserMe {
          ...CompUserScalarsFragment
        }
      }
      __typename
    }
  }
`;
type CompsResponse = {
  comps: PaginatedObjects<
    CompScalars & {
      compGyms: CompGymScalars[];
      compPoules: (CompPouleScalars & {
        compRounds: (CompRoundScalars & {
          compRoundUsers: CompRoundUserScalars[];
        })[];
      })[];
      compUserMe: CompUserScalars;
    }
  >;
};

const userMeStoreQuery = gql`
  ${GymScalarsFragment}
  ${UserMeScalarsFragment}
  ${GymUserMeScalarsFragment}
  ${HoldColorScalarsFragment}
  ${WallScalarsFragment}
  ${WallSectionScalarsFragment}

  query userMeStore {
    userMe {
      ...UserMeScalarsFragment

      gym {
        ...GymScalarsFragment
      }
      gymUserFavorites {
        ...GymUserMeScalarsFragment

        gym {
          ...GymScalarsFragment

          walls {
            ...WallScalarsFragment
          }
          wallSections {
            ...WallSectionScalarsFragment
          }
          holdColors {
            ...HoldColorScalarsFragment
          }
        }
      }
    }
  }
`;
interface UserMeStoreResponse {
  userMe: UserMeScalars & {
    gym: GymScalars;
    gymUserFavorites: (GymUserMeScalars & {
      gym: GymScalars & {
        walls: WallScalars[];
        wallSections: WallSectionScalars[];
        holdColors: HoldColorScalars[];
      };
    })[];
  };
}

const compRoundUsersForRankingQuery = gql`
  ${PaginationFragment}
  ${CompRoundUserScalarsFragment}
  ${CompUserScalarsFragment}
  ${CompPouleUserScalarsFragment}

  query compRoundUsersForRanking(
    $gymId: ID!
    $compId: ID!
    $compRoundId: ID
    $compRoundUserIdPage: ID
    $search: String
    $pagination: PaginationInputCompRoundUsers
  ) {
    ranking: compRoundUsers(
      gymId: $gymId
      compId: $compId
      compRoundId: $compRoundId
      compRoundUserIdPage: $compRoundUserIdPage
      search: $search
      pagination: $pagination
    ) {
      pagination {
        ...PaginationFragment
      }
      data {
        ...CompRoundUserScalarsFragment

        compUser {
          ...CompUserScalarsFragment

          compPouleUsers {
            ...CompPouleUserScalarsFragment
          }
        }
      }
      __typename
    }
  }
`;
type CompRoundUsersForRankingResponse = {
  ranking: PaginatedObjects<
    CompRoundUserScalars & {
      compUser: CompUserScalars & { compPouleUsers: CompPouleUserScalars[] };
    }
  >;
};

const compClimbUsersForRankingClimbUserQuery = gql`
  ${PaginationFragment}
  ${ClimbScalarsFragment}
  ${ClimbGroupClimbScalarsFragment}
  ${ClimbUserScalarsFragment}
  ${CompRoundClimbScalarsFragment}
  ${CompClimbUserScalarsFragment}

  query compClimbUsersForRankingClimbUser(
    $gymId: ID!
    $compId: ID!
    $compRoundId: ID
    $userId: ID
    $pagination: PaginationInputCompClimbUsers
  ) {
    compClimbUsers(
      gymId: $gymId
      compId: $compId
      compRoundId: $compRoundId
      userId: $userId
      pointsMin: 0.0001
      pagination: $pagination
    ) {
      pagination {
        ...PaginationFragment
      }
      data {
        ...CompClimbUserScalarsFragment

        climb {
          ...ClimbScalarsFragment

          climbGroupClimbs {
            ...ClimbGroupClimbScalarsFragment
          }

          climbUser(userId: $userId) {
            ...ClimbUserScalarsFragment
          }

          compRoundClimb(compRoundId: $compRoundId) {
            ...CompRoundClimbScalarsFragment
          }
        }
      }
      __typename
    }
  }
`;
type CompClimbUsersForRankingClimbUserResponse = {
  compClimbUsers: PaginatedObjects<
    CompClimbUserScalars & {
      climb: ClimbScalars & {
        climbGroupClimbs: ClimbGroupClimbScalars[];
        climbUser: ClimbUserScalars;
        compRoundClimb: CompRoundClimbScalars;
      };
    }
  >;
};

export const GET = (request: NextRequest) =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.TopLogger) continue;

      yield* wrapSource(dataSource, user, async function* ({ authTokens }) {
        if (
          !authTokens ||
          new Date(authTokens.refresh.expiresAt) < new Date()
        ) {
          throw new Error(
            "No auth tokens or refresh token expired, please add auth tokens",
          );
        }

        await TopLoggerGraphQL.createIndexes([
          { key: { __typename: 1 } },
          { key: { id: 1 } },
          { key: { userId: 1 } },
          { key: { tickedFirstAtDate: 1 } },
          { key: { climbedAtDate: 1 } },
          { key: { __typename: 1, id: 1 } },
          { key: { __typename: 1, userId: 1 } },
          { key: { __typename: 1, userId: 1, tickedFirstAtDate: 1 } },
          { key: { __typename: 1, userId: 1, climbedAtDate: 1 } },
        ]);

        let headers: HeadersInit = {
          authorization: `Bearer ${authTokens.access.token}`,
        };
        yield { authTokens };

        if (new Date(authTokens.access.expiresAt) < new Date()) {
          yield "Access token expired, refreshing token";
          const authSigninRefreshTokenResponse = await fetchGraphQLQuery(
            authSigninRefreshTokenQuery,
            { refreshToken: authTokens.refresh.token },
            "https://app.toplogger.nu/graphql",
            {
              headers: { authorization: `Bearer ${authTokens.refresh.token}` },
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

        const fetchQueryAndNormalizeAndUpsertQueryData = async <
          TData = Record<string, unknown>,
          TVariables extends Record<string, unknown> = Record<string, unknown>,
        >(
          query: DocumentNode,
          variables?: TVariables,
        ) => {
          const response = await fetchGraphQLQuery<TData>(
            query,
            variables,
            "https://app.toplogger.nu/graphql",
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

        const [userMeStoreResponse] =
          await fetchQueryAndNormalizeAndUpsertQueryData<UserMeStoreResponse>(
            userMeStoreQuery,
          );

        const userMe = userMeStoreResponse.data?.userMe;

        const gyms = randomSliceOfSize(
          userMe?.gymUserFavorites.map((fav) => fav.gym) || [],
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

            for (const comp of compsResponse.data?.comps.data ?? []) {
              if (!comp.compUserMe) {
                continue; // Skip comps without the user
              }

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

                  if (
                    compRoundUsersForRankingResponse.data &&
                    compRoundUsersForRankingResponse.data?.ranking.pagination
                      .total >
                      compRoundUsersForRankingResponse.data?.ranking.pagination
                        .perPage
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
                              { key: "compUser.disqualifiedInt", order: "asc" },
                              { key: "score", order: "desc" },
                            ],
                          },
                        },
                      );
                    yield updateResult;
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
                  }
                }
              }
            }
          }
        }

        let climbDays: ClimbDaysSessionsResponse["climbDaysPaginated"]["data"] =
          [];
        let page = 1;
        let [graphqlClimbDaysPaginatedResponse] =
          await fetchQueryAndNormalizeAndUpsertQueryData<ClimbDaysSessionsResponse>(
            climbDaysSessionsQuery,
            {
              userId,
              bouldersTotalTriesMin: 1,
              pagination: { page, perPage: 100 },
            },
          );
        if (!graphqlClimbDaysPaginatedResponse.data) {
          throw new Error("Failed to fetch climb days");
        }
        climbDays = climbDays.concat(
          graphqlClimbDaysPaginatedResponse.data.climbDaysPaginated.data,
        );
        const totalPages = Math.ceil(
          graphqlClimbDaysPaginatedResponse.data?.climbDaysPaginated.pagination
            .total /
            graphqlClimbDaysPaginatedResponse.data?.climbDaysPaginated
              .pagination.perPage || 1,
        );

        for (; page <= totalPages; page++) {
          [graphqlClimbDaysPaginatedResponse] =
            await fetchQueryAndNormalizeAndUpsertQueryData<ClimbDaysSessionsResponse>(
              climbDaysSessionsQuery,
              {
                userId,
                bouldersTotalTriesMin: 1,
                pagination: { page, perPage: 100 },
              },
            );

          if (!graphqlClimbDaysPaginatedResponse.data) {
            throw new Error("Failed to fetch climb days");
          }

          climbDays = climbDays.concat(
            graphqlClimbDaysPaginatedResponse.data.climbDaysPaginated.data,
          );
        }

        const recentDays = 4;
        const backfillDays = 16;
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
        }
      });
    }

    yield* materializeAllToploggerWorkouts({ user });
  });
