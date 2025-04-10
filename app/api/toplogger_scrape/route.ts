import { type DocumentNode, Kind } from "graphql";
import gql from "graphql-tag";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { auth } from "../../../auth";
import { isAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { randomSliceOfSize, shuffle } from "../../../utils";
import {
  fetchGraphQLQuery,
  type MongoGraphQLObject,
  normalizeAndUpsertQueryData,
  type Reference,
  TopLoggerGraphQL,
} from "../../../utils/graphql";
import { materializeAllToploggerWorkouts } from "../materialize_workouts/materializers";
import { jsonStreamResponse } from "../scraper-utils";
import {
  ClimbDayScalars,
  ClimbDayScalarsFragment,
  ClimbGroupClimbScalarsFragment,
  ClimbLogScalars,
  ClimbLogScalarsFragment,
  ClimbScalars,
  ClimbScalarsFragment,
  ClimbTagClimbScalarsFragment,
  ClimbTagScalarsFragment,
  ClimbUserScalarsFragment,
  CompClimbUserScalarsFragment,
  CompGymScalarsFragment,
  CompPouleScalarsFragment,
  CompRoundClimbScalarsFragment,
  CompRoundScalarsFragment,
  CompRoundUserScalars,
  CompRoundUserScalarsFragment,
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
  UserScalars,
  UserScalarsFragment,
  WallScalars,
  WallScalarsFragment,
  WallSectionScalarsFragment,
} from "./fragments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const climbsQuery = gql`
  ${PaginationFragment}
  ${ClimbScalarsFragment}
  ${ClimbUserScalarsFragment}
  ${CompRoundClimbScalarsFragment}
  ${WallScalarsFragment}
  ${WallSectionScalarsFragment}
  ${HoldColorScalarsFragment}
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

        wall {
          ...WallScalarsFragment
        }
        wallSection {
          ...WallSectionScalarsFragment
        }
        holdColor {
          ...HoldColorScalarsFragment
        }
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
  ${GymScalarsFragment}
  ${HoldColorScalarsFragment}
  ${WallScalarsFragment}

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
          holdColor {
            ...HoldColorScalarsFragment
          }
          wall {
            ...WallScalarsFragment
          }
          gym {
            ...GymScalarsFragment
          }
        }
      }
      __typename
    }
  }
`;
type ClimbLogsResponse = {
  climbLogs: PaginatedObjects<
    ClimbLogScalars & {
      climb: ClimbScalars & {
        holdColor: HoldColorScalars;
        wall: WallScalars;
        gym: GymScalars;
      };
    }
  >;
};

const compsQuery = gql`
  ${PaginationFragment}
  ${CompScalarsFragment}
  ${GymScalarsFragment}
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

          gym {
            ...GymScalarsFragment
          }
        }

        compPoules {
          ...CompPouleScalarsFragment

          compRounds {
            ...CompRoundScalarsFragment

            compRoundUserMe {
              ...CompRoundUserScalarsFragment
            }
          }
        }

        compUserMe {
          ...CompUserScalarsFragment

          compRoundUsers {
            ...CompRoundUserScalarsFragment
          }
          comp {
            ...CompScalarsFragment

            compGyms {
              ...CompGymScalarsFragment

              gym {
                ...GymScalarsFragment
              }
            }
          }
        }
      }
      __typename
    }
  }
`;
type CompsResponse = {
  comps: PaginatedObjects<
    Comp & {
      compGyms: (CompGym & { gym: GymScalars })[];
      compPoules: (CompPoule & {
        compRounds: (CompRound & { compRoundUserMe: CompRoundUserScalars })[];
      })[];
      compUserMe: CompUserScalars & {
        compRoundUsers: CompRoundUserScalars[];
        comp: Comp & {
          compGyms: CompGym & {
            gym: GymScalars;
          };
        };
      };
    }
  >;
};

const userMeStoreQuery = gql`
  ${GymScalarsFragment}
  ${UserMeScalarsFragment}
  ${GymUserMeScalarsFragment}

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
        }
      }
    }
  }
`;
interface UserMeStoreResponse {
  userMe: UserMeScalars & {
    gym: GymScalars;
    gymUserFavorites: (GymUserMeScalars & { gym: GymScalars })[];
  };
}

const compRoundUsersForRankingQuery = gql`
  ${PaginationFragment}
  ${CompRoundUserScalarsFragment}
  ${CompUserScalarsFragment}
  ${UserScalarsFragment}

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
        }
        user {
          ...UserScalarsFragment
        }
      }
      __typename
    }
  }
`;
type CompRoundUsersForRankingResponse = {
  ranking: PaginatedObjects<
    CompRoundUserScalars & {
      compUser: CompUserScalars;
      user: UserScalars;
    }
  >;
};

const compClimbUsersForRankingClimbUserQuery = gql`
  ${PaginationFragment}
  ${ClimbScalarsFragment}
  ${GymScalarsFragment}
  ${HoldColorScalarsFragment}
  ${WallScalarsFragment}
  ${WallSectionScalarsFragment}
  ${ClimbGroupClimbScalarsFragment}
  ${ClimbTagClimbScalarsFragment}
  ${ClimbTagScalarsFragment}
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

        gym {
          ...GymScalarsFragment
        }
        climb {
          ...ClimbScalarsFragment
        }
        gym {
          ...GymScalarsFragment
        }
        climb {
          ...ClimbScalarsFragment

          holdColor {
            ...HoldColorScalarsFragment
          }
          wall {
            ...WallScalarsFragment
          }
          wallSection {
            ...WallSectionScalarsFragment
          }
        }
        climb {
          ...ClimbScalarsFragment

          wall {
            ...WallScalarsFragment
          }
          wallSection {
            ...WallSectionScalarsFragment
          }
          holdColor {
            ...HoldColorScalarsFragment
          }
          climbGroupClimbs {
            ...ClimbGroupClimbScalarsFragment
          }
          climbTagClimbs {
            ...ClimbTagClimbScalarsFragment

            climbTag {
              ...ClimbTagScalarsFragment
            }
          }

          climbUser(userId: $userId) {
            ...ClimbUserScalarsFragment

            compClimbUser(compRoundId: $compRoundId) {
              ...CompClimbUserScalarsFragment
            }
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

export interface Climb extends MongoGraphQLObject<"Climb"> {
  grade: number;
  gym: Reference;
  holdColor: Reference;
  wall: Reference;
  id: string;
  climbType: ClimbType;
  positionX: number;
  positionY: number;
  gradeAuto: boolean;
  gradeVotesCount: number;
  gradeUsersVsAdmin: number;
  picPath: null;
  label: null;
  name: null;
  zones: number;
  remarksLoc: null;
  suitableForKids: boolean;
  clips: number;
  holds: number;
  height: number;
  overhang: number;
  autobelay: boolean;
  leadEnabled: boolean;
  leadRequired: boolean;
  ratingsAverage: number | null;
  ticksCount: number;
  inAt: Date;
  outAt: null;
  outPlannedAt: null;
  order: number;
  setterName: null | string;
  wallId: string;
  wallSectionId: null;
  wallSection: null;
  holdColorId: string;
  climbGroupClimbs: ClimbGroupClimb[];
  climbUser: ClimbUser | null;
  compRoundClimb: CompRoundClimb;
}

interface ClimbGroupClimb extends MongoGraphQLObject<"ClimbGroupClimb"> {
  climbGroupId: string;
  order: number;
}

interface ClimbUser extends MongoGraphQLObject<"ClimbUser"> {
  climbId: string;
  grade: number | null;
  rating: null;
  project: boolean;
  votedRenew: boolean;
  tickType: number;
  totalTries: number;
  triedFirstAtDate: Date;
  tickedFirstAtDate: Date | null;
  updatedAt: Date;
  compClimbUser: CompClimbUser;
}

export interface CompClimbUser extends MongoGraphQLObject<"CompClimbUser"> {
  id: string;
  climbId: string;
  userId: string;
  compId: string;
  points: number;
  pointsJson: {
    zones: {
      points: number;
      pointsBase: number;
      pointsBonus: number;
    }[];
  };
  tickType: number;
}

interface CompRoundClimb extends MongoGraphQLObject<"CompRoundClimb"> {
  points: number;
  pointsJson: {
    zones: number[];
  };
  leadRequired: boolean;
  climbId: string;
  compId: string;
  compRoundId: string;
}

type ClimbType = "boulder" | "route";

export interface Comp extends MongoGraphQLObject<"Comp"> {
  name: string;
  subtitleLoc: null;
  logoPath: null | string;
  loggableStartAt: Date;
  loggableEndAt: Date;
  inviteOnly: boolean;
  compUserMe: CompUser | null;
  isMultiPoule: boolean;
  compPoules: CompPoule[];
  isMultiRound: boolean;
  descriptionLoc: string;
  prizesLoc: null;
  prizePaths: null;
  registrationStartAt: null;
  registrationEndAt: null;
  approveParticipation: boolean;
  participantsMax: number;
  participantsSpotsLeft: number;
  registrationMessageLoc: null;
  registrationRoundsMax: number;
  climbType: string;
  compGyms: Reference[];
}
interface CompRound extends MongoGraphQLObject<"CompRound"> {
  compRoundUserMe: CompRoundUser;
  selfLoggable: boolean;
  loggableStartAt: Date;
  loggableEndAt: Date;
  nameLoc: string;
  climbType: string;
  participantsPickedByAdmin: boolean;
  participantsMax: number;
  participantsSpotsLeft: number;
  compPouleId: string;
  compPoule: CompPoule;
  participationDetailsLoc: null;
  descriptionLoc: null;
  visible: boolean;
  scoreSystemRoute: string;
  scoreSystemRouteParams: {
    bonusFlPercent: number;
    bonusOsPercent: number;
  };
  scoreSystemBoulder: string;
  scoreSystemBoulderParams: {
    bonusFlPercent: number;
    bonusOsPercent: number;
  };
  tiebreakers: unknown[];
  compId: string;
}

interface CompRoundUser extends MongoGraphQLObject<"CompRoundUser"> {
  participating: boolean;
  score: number;
  totMaxZones: number;
  totMaxClips: number;
  totMaxHolds: number;
  totMinTries: number;
  totMinDuration: number;
  climbsWithScoresCount: number;
  compUser: CompUser;
  user: User;
  userId: string;
}
interface User extends MongoGraphQLObject<"User"> {
  avatarUploadPath: null | string;
}
interface CompPoule extends MongoGraphQLObject<"CompPoule"> {
  compRounds: CompRound[];
  nameLoc: string;
  descriptionLoc: null;
}
export interface CompGym extends MongoGraphQLObject<"CompGym"> {
  gym: Reference;
  gymId: string;
}
export interface CompUser extends MongoGraphQLObject<"CompUser"> {
  approvalState: string;
  userId: string;
  compId: string;
  comp: Reference;
}

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

        const fetchQuery = <
          TData = Record<string, unknown>,
          TVariables extends Record<string, unknown> = Record<string, unknown>,
        >(
          query: DocumentNode,
          variables?: TVariables,
          operationName?: string,
        ) => {
          console.log(
            query.definitions.find(
              (definition) => definition.kind === Kind.OPERATION_DEFINITION,
            )?.name?.value,
            variables,
          );
          return fetchGraphQLQuery<TData>(
            query,
            variables,
            "https://app.toplogger.nu/graphql",
            { headers: { ...agentHeaders, ...headers } },
            operationName,
          );
        };

        const userId = dataSource.config.graphQLId;

        const userMe = (await fetchQuery<UserMeStoreResponse>(userMeStoreQuery))
          .data?.userMe;

        yield userMe;

        const gyms = shuffle(
          userMe?.gymUserFavorites.map((fav) => fav.gym) || [],
        );

        if (gyms) {
          for (const gym of gyms) {
            const compsVariables = {
              gymId: gym.id,
              pagination: {
                orderBy: [{ key: "loggableStartAt", order: "desc" }],
              },
            };
            const compsResponse = await fetchQuery<CompsResponse>(
              compsQuery,
              compsVariables,
            );

            const updateResult = await normalizeAndUpsertQueryData(
              compsQuery,
              compsVariables,
              compsResponse.data!,
            );

            yield updateResult;

            for (const comp of compsResponse.data?.comps.data ?? []) {
              for (const poule of comp.compPoules) {
                for (const round of poule.compRounds) {
                  const compRoundUsersForRankingVariables = {
                    gymId: gym.id,
                    compId: comp.id,
                    compRoundId: round.id,
                  };
                  const compRoundUsersForRankingResponse =
                    await fetchQuery<CompRoundUsersForRankingResponse>(
                      compRoundUsersForRankingQuery,
                      compRoundUsersForRankingVariables,
                    );

                  const updateResult = await normalizeAndUpsertQueryData(
                    compRoundUsersForRankingQuery,
                    compRoundUsersForRankingVariables,
                    compRoundUsersForRankingResponse.data!,
                  );
                  const bestClimberId =
                    compRoundUsersForRankingResponse.data?.ranking.data[0]?.user
                      .id;
                  yield updateResult;

                  for (const userIddd of [userId, bestClimberId].filter(
                    Boolean,
                  )) {
                    const compClimbUsersForRankingClimbUserVariables = {
                      gymId: gym.id,
                      userId: userIddd,
                      compId: comp.id,
                      compRoundId: round.id,
                      pagination: {
                        page: 1,
                        perPage: 100,
                        orderBy: [{ key: "points", order: "desc" }],
                      },
                    };
                    const compClimbUsersForRankingClimbUserResponse =
                      await fetchQuery<{
                        compClimbUsers: PaginatedObjects<CompClimbUser>;
                      }>(
                        compClimbUsersForRankingClimbUserQuery,
                        compClimbUsersForRankingClimbUserVariables,
                      );

                    const compClimbUsersForRankingClimbUserUpdateResult =
                      await normalizeAndUpsertQueryData(
                        compClimbUsersForRankingClimbUserQuery,
                        compClimbUsersForRankingClimbUserVariables,
                        compClimbUsersForRankingClimbUserResponse.data!,
                      );
                    yield compClimbUsersForRankingClimbUserUpdateResult;

                    const climbsVariables = {
                      gymId: gym.id,
                      climbType: "boulder",
                      compRoundId: round.id,
                      userId: userIddd,
                    };
                    const climbsResponse = await fetchQuery<{
                      climbs: PaginatedObjects<Climb>;
                    }>(climbsQuery, climbsVariables);

                    const updateResult = await normalizeAndUpsertQueryData(
                      climbsQuery,
                      climbsVariables,
                      climbsResponse.data!,
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
        let graphqlClimbDaysPaginatedResponse =
          await fetchQuery<ClimbDaysSessionsResponse>(climbDaysSessionsQuery, {
            userId,
            bouldersTotalTriesMin: 1,
            pagination: { page, perPage: 100 },
          });
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
          graphqlClimbDaysPaginatedResponse =
            await fetchQuery<ClimbDaysSessionsResponse>(
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

        const recentDays = 5;
        const backfillDays = 25;
        const climbDaysToFetch = [
          // Most recent days
          ...climbDays.slice(0, recentDays),
          // other random days, for backfilling. TODO: General backfilling strategy
          ...randomSliceOfSize(climbDays.slice(recentDays), backfillDays),
        ];

        for (const climbDay of climbDaysToFetch) {
          const climbLogsVariables = {
            userId,
            climbedAtDate: climbDay.statsAtDate,
          };
          const graphqlClimbLogsResponse = await fetchQuery<ClimbLogsResponse>(
            climbLogsQuery,
            climbLogsVariables,
          );

          const updateResult = await normalizeAndUpsertQueryData(
            climbLogsQuery,
            climbLogsVariables,
            graphqlClimbLogsResponse.data!,
          );

          yield updateResult;
        }
      });
    }

    yield* materializeAllToploggerWorkouts({ user });
  });
