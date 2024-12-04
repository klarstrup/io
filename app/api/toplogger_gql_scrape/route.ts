import { addDays } from "date-fns";
import { type DocumentNode } from "graphql";
import gql from "graphql-tag";
import { ObjectId } from "mongodb";
import { auth } from "../../../auth";
import { isAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { DataSource } from "../../../sources/utils";
import { randomSlice, shuffle } from "../../../utils";
import {
  fetchGraphQLQueries,
  fetchGraphQLQuery,
  type GraphQLRequestTuple,
  type MongoGraphQLObject,
  normalizeAndUpsertQueryData,
  type Reference,
  TopLoggerGraphQL,
} from "../../../utils/graphql";
import { materializeAllToploggerWorkouts } from "../materialize_workouts/materializers";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const climbUsersQuery = gql`
  query climbUsers(
    $gymId: ID
    $userId: ID
    $pagination: PaginationInputClimbUsers
    $pointsExpireAtDateMin: DateTime
  ) {
    climbUsers(
      gymId: $gymId
      userId: $userId
      pagination: $pagination
      pointsExpireAtDateMin: $pointsExpireAtDateMin
    ) {
      data {
        id
        userId
        points
        pointsBonus
        pointsExpireAtDate
        climbId
        grade
        rating
        project
        votedRenew
        tickType
        ticked
        totalTries
        triedFirstAtDate
        tickedFirstAtDate

        climb {
          id
          climbType
          positionX
          positionY
          gradeAuto
          grade
          gradeVotesCount
          gradeUsersVsAdmin
          picPath
          label
          name
          zones
          remarksLoc
          suitableForKids
          clips
          holds
          height
          overhang
          leadEnabled
          leadRequired
          ratingsAverage
          ticksCount
          inAt
          outAt
          outPlannedAt
          order
          setterName
          gym {
            id
            name
            nameSlug
            markBoulderNewDays
            markRouteNewDays
            markBoulderOutSoonDays
            markRouteOutSoonDays
            settingsLogBoulders
            settingsLogRoutes
            __typename
          }
          __typename
        }
        wall {
          id
          nameLoc
          idOnFloorplan
          height
          overhang
          bouldersEnabled
          routesEnabled
          climbTypeDefault
          labelX
          labelY
          order
          __typename
        }
        holdColor {
          id
          color
          colorSecondary
          nameLoc
          order
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;

export interface TopLoggerClimbUser extends MongoGraphQLObject {
  __typename: "ClimbUser";
  id: string;
  userId: string;
  tickType: number;
  points: number;
  pointsBonus: number;
  pointsExpireAtDate: Date;
  climbId: string;
  grade: string;
  rating: number;
  project: string;
  votedRenew: boolean;
  totalTries: number;
  triedFirstAtDate: Date;
  tickedFirstAtDate: Date;
  // Object fields
  climb: Reference;
  wall: Reference;
  holdColor: Reference;
}

interface Climb extends MongoGraphQLObject {
  grade: number;
  gym: Reference;
}

interface ClimbDereferenced extends Omit<Climb, "gym"> {
  gym: Gym;
}

interface Gym extends MongoGraphQLObject {
  name: string;
  nameSlug: string;
}

interface Wall extends MongoGraphQLObject {
  nameLoc: string;
}

interface HoldColor extends MongoGraphQLObject {
  color: string;
  nameLoc: string;
}

export interface TopLoggerClimbUserDereferenced
  extends Omit<TopLoggerClimbUser, "climb" | "wall" | "holdColor"> {
  climb: ClimbDereferenced;
  wall: Wall;
  holdColor: HoldColor;
}

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* (flushJSON) {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.TopLogger) continue;

      const attemptedAt = new Date();
      await Users.updateOne(
        { _id: new ObjectId(user.id) },
        { $set: { "dataSources.$[dataSource].lastAttemptedAt": attemptedAt } },
        { arrayFilters: [{ "dataSource.id": dataSource.id }] },
      );

      let authTokens = dataSource.config.authTokens;
      if (!authTokens || new Date(authTokens.refresh.expiresAt) < new Date()) {
        throw new Error(
          "No auth tokens or refresh token expired, please add auth tokens",
        );
      }

      await TopLoggerGraphQL.createIndexes([
        { key: { __typename: 1 } },
        { key: { id: 1 } },
        { key: { userId: 1 } },
        { key: { tickedFirstAtDate: 1 } },
        { key: { __typename: 1, id: 1 } },
        { key: { __typename: 1, userId: 1 } },
        { key: { __typename: 1, userId: 1, tickedFirstAtDate: 1 } },
      ]);

      let headers: HeadersInit = {};
      await flushJSON({ authTokens });
      // eslint-disable-next-line no-inner-declarations
      async function ensureAuthTokens() {
        if (!authTokens) {
          throw new Error("No auth tokens");
        }
        if (!user) {
          throw new Error("No user");
        }

        if (new Date(authTokens.access.expiresAt) < new Date()) {
          const authSigninRefreshTokenResponse = await fetchGraphQLQuery(
            gql`
              mutation ($refreshToken: JWT!) {
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
            `,
            { refreshToken: authTokens.refresh.token },
            "https://app.toplogger.nu/graphql",
            {
              headers: { authorization: `Bearer ${authTokens.refresh.token}` },
            },
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
              { $set: { topLoggerAuthTokens: authTokens } },
            );
            await flushJSON("Updated authTokens with refresh token");
            await flushJSON({ authTokens });
          } else {
            throw new Error("Failed to refresh token");
          }
        }

        headers = { authorization: `Bearer ${authTokens.access.token}` };
      }

      await ensureAuthTokens();

      const fetchQuery = <
        TData = Record<string, unknown>,
        TVariables extends Record<string, unknown> = Record<string, unknown>,
      >(
        query: DocumentNode,
        variables?: TVariables,
      ) =>
        fetchGraphQLQuery<TData>(
          query,
          variables,
          "https://app.toplogger.nu/graphql",
          { headers },
        );
      const fetchQueries = <TData = Record<string, unknown>>(
        reqs: GraphQLRequestTuple[],
      ) =>
        fetchGraphQLQueries<TData>(reqs, "https://app.toplogger.nu/graphql", {
          headers,
        });

      const userMeResponse = await fetchQuery(gql`
        query {
          userMe {
            id
            anonymous
            profileReviewed
            avatarUploadPath
            email
            firstName
            lastName
            fullName
            gender
            height
            weight
            birthdayAt
            city
            state
            countryCode
            bio
            locale
            gradingSystemBoulders
            gradingSystemRoutes
            __typename

            gym {
              id
              name
              nameSlug
              iconPath
              __typename
            }
            gymUserFavorites {
              id
              gym {
                id
                name
                nameSlug
                iconPath
                __typename
              }
            }
          }
        }
      `);

      const userId = (userMeResponse as { data: { userMe: { id: string } } })
        .data.userMe.id;

      await flushJSON({ userId });

      if (
        !userMeResponse.data!.userMe ||
        !(typeof userMeResponse.data!.userMe === "object") ||
        !("gymUserFavorites" in userMeResponse.data!.userMe) ||
        !userMeResponse.data!.userMe.gymUserFavorites ||
        !Array.isArray(userMeResponse.data!.userMe.gymUserFavorites)
      ) {
        throw new Error("No gymUserFavorites");
      }

      const gyms = (
        userMeResponse.data!.userMe.gymUserFavorites as { gym: Gym }[]
      ).map((guf) => guf.gym);

      for (const gym of shuffle(gyms)) {
        await flushJSON({ gym });
        await ensureAuthTokens();

        const graphqlTotalResponse = await fetchQuery(
          gql`
            query climbUsers(
              $gymId: ID
              $userId: ID
              $pagination: PaginationInputClimbUsers
            ) {
              __typename
              climbUsers(
                gymId: $gymId
                userId: $userId
                pagination: $pagination
              ) {
                pagination {
                  total
                  __typename
                }
                __typename
              }
            }
          `,
          {
            gymId: gym.id,
            userId,
            pagination: { page: 1, perPage: 1 },
          },
        );
        const graphqlCurrentTotalResponse = await fetchQuery(
          gql`
            query climbUsers(
              $gymId: ID
              $userId: ID
              $pagination: PaginationInputClimbUsers
              $pointsExpireAtDateMin: DateTime
            ) {
              __typename
              climbUsers(
                gymId: $gymId
                userId: $userId
                pagination: $pagination
                pointsExpireAtDateMin: $pointsExpireAtDateMin
              ) {
                pagination {
                  total
                  __typename
                }
                __typename
              }
            }
          `,
          {
            gymId: gym.id,
            userId,
            pagination: { page: 1, perPage: 1 },
            pointsExpireAtDateMin: addDays(new Date(), 1),
          },
        );
        const total = (
          graphqlTotalResponse as {
            data: { climbUsers: { pagination: { total: number } } };
          }
        ).data.climbUsers.pagination.total;
        const currentTotal = (
          graphqlCurrentTotalResponse as {
            data: { climbUsers: { pagination: { total: number } } };
          }
        ).data.climbUsers.pagination.total;

        await flushJSON({ total, currentTotal });

        const currentPageNumbers: number[] = [
          ...Array.from(
            { length: Math.ceil(currentTotal / 10) },
            (_, i) => i + 1,
          ),
        ];
        const pageNumbers: number[] = randomSlice(
          Array.from(
            { length: Math.ceil((total - currentTotal) / 10) },
            (_, i) => i + 1 + Math.ceil(currentTotal / 10),
          ),
          48,
        );

        await flushJSON({ currentPageNumbers, pageNumbers });

        const queries = [
          ...currentPageNumbers.map(
            (page): GraphQLRequestTuple => [
              climbUsersQuery,
              {
                gymId: gym.id,
                userId,
                pagination: { page },
                pointsExpireAtDateMin: addDays(new Date(), 1),
              },
            ],
          ),
          ...pageNumbers.map(
            (page): GraphQLRequestTuple => [
              climbUsersQuery,
              {
                gymId: gym.id,
                userId,
                pagination: { page },
              },
            ],
          ),
        ];
        const graphqlResponse2 = await fetchQueries(queries);

        for (let i = 0; i < queries.length; i++) {
          const [query, variables] = queries[i]!;
          const response = graphqlResponse2[i]!;

          const updateResult = await normalizeAndUpsertQueryData(
            query,
            variables,
            response.data!,
          );

          await flushJSON(updateResult);
        }
      }

      const successfulAt = new Date();
      await Users.updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            "dataSources.$[dataSource].lastSuccessfulAt": successfulAt,
            "dataSources.$[dataSource].lastSuccessfulRuntime":
              successfulAt.valueOf() - attemptedAt.valueOf(),
            "dataSources.$[dataSource].lastResult": "success",
          },
        },
        { arrayFilters: [{ "dataSource.id": dataSource.id }] },
      );
    }

    yield* materializeAllToploggerWorkouts({ user });
  });
