import { addDays } from "date-fns";
import { type DocumentNode } from "graphql";
import gql from "graphql-tag";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { auth } from "../../../auth";
import { isAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { randomSliceOfSize } from "../../../utils";
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

const authSigninRefreshTokenQuery = gql`
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
`;

const totalQuery = gql`
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
`;

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

export const GET = (request: NextRequest) =>
  // eslint-disable-next-line require-yield
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
          { key: { __typename: 1, id: 1 } },
          { key: { __typename: 1, userId: 1 } },
          { key: { __typename: 1, userId: 1, tickedFirstAtDate: 1 } },
        ]);

        let headers: HeadersInit = {};
        yield { authTokens };
        // eslint-disable-next-line no-inner-declarations
        async function* ensureAuthTokens() {
          if (!authTokens) {
            throw new Error("No auth tokens");
          }
          if (!user) {
            throw new Error("No user");
          }

          if (new Date(authTokens.access.expiresAt) < new Date()) {
            const authSigninRefreshTokenResponse = await fetchGraphQLQuery(
              authSigninRefreshTokenQuery,
              { refreshToken: authTokens.refresh.token },
              "https://app.toplogger.nu/graphql",
              {
                headers: {
                  authorization: `Bearer ${authTokens.refresh.token}`,
                },
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
              yield "Updated authTokens with refresh token";
              yield { authTokens };
            } else {
              throw new Error("Failed to refresh token");
            }
          }

          headers = { authorization: `Bearer ${authTokens.access.token}` };
        }

        yield* ensureAuthTokens();

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
        ) =>
          fetchGraphQLQuery<TData>(
            query,
            variables,
            "https://app.toplogger.nu/graphql",
            { headers: { ...agentHeaders, ...headers } },
          );
        const fetchQueries = <TData = Record<string, unknown>>(
          reqs: GraphQLRequestTuple[],
        ) =>
          fetchGraphQLQueries<TData>(reqs, "https://app.toplogger.nu/graphql", {
            headers: { ...agentHeaders, ...headers },
          });

        const userId = dataSource.config.graphQLId;

        const graphqlTotalResponse = await fetchQuery(totalQuery, {
          userId,
          pagination: { page: 1, perPage: 1 },
        });
        const graphqlCurrentTotalResponse = await fetchQuery(totalQuery, {
          userId,
          pagination: { page: 1, perPage: 1 },
          pointsExpireAtDateMin: addDays(new Date(), 1),
        });
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

        yield { total, currentTotal };

        const currentPageNumbers = randomSliceOfSize(
          Array.from({ length: Math.ceil(currentTotal / 10) }, (_, i) => i + 1),
          6,
        );
        const pageNumbers: number[] = randomSliceOfSize(
          Array.from({ length: Math.ceil(total / 10) }, (_, i) => i + 1),
          4,
        );

        yield { currentPageNumbers, pageNumbers };

        const queries = [
          ...currentPageNumbers.map(
            (page): GraphQLRequestTuple => [
              climbUsersQuery,
              {
                userId,
                pagination: { page },
                pointsExpireAtDateMin: addDays(new Date(), 1),
              },
            ],
          ),
          ...pageNumbers.map(
            (page): GraphQLRequestTuple => [
              climbUsersQuery,
              { userId, pagination: { page } },
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

          yield updateResult;
        }
      });
    }

    yield* materializeAllToploggerWorkouts({ user });
  });
