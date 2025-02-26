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
  fetchGraphQLQuery,
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

interface ClimbDaysSessionsQueryResponse {
  climbDaysPaginated: {
    pagination: {
      total: number;
      page: number;
      perPage: number;
      orderBy: {
        key: string;
        order: string;
        __typename: string;
      }[];
    };
    data: TopLoggerClimbDayDereferenced[];
  };
}
const climbDaysSessionsQuery = gql`
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
        total
        page
        perPage
        orderBy {
          key
          order
          __typename
        }
        __typename
      }
      data {
        id
        statsAtDate
        gradeDistributionRoutes
        gradeDistributionBoulders
        bouldersTotalTries
        bouldersDayGrade
        bouldersDayGradeMax
        bouldersDayGradeFlPct
        bouldersDayGradeRepeatPct
        routesTotalTries
        routesDayGrade
        routesDayGradeMax
        routesDayGradeOsPct
        routesDayGradeRepeatPct
        routesTotalHeight

        gym {
          id
          name
          nameSlug
          iconPath
          markBoulderNewDays
          markRouteNewDays
          markBoulderOutSoonDays
          markRouteOutSoonDays
          settingsLogBoulders
          settingsLogRoutes
          __typename
        }
        user {
          id
          fullName
          avatarUploadPath
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;

interface ClimbLogsQueryResponse {
  climbLogs: {
    pagination: {
      total: number;
      page: number;
      perPage: number;
      orderBy: {
        key: string;
        order: string;
        __typename: string;
      }[];
    };
    data: TopLoggerClimbLogDereferenced[];
  };
  [key: string]: unknown;
}
const climbLogsQuery = gql`
  query climbLogsSession(
    $gymId: ID
    $userId: ID!
    $climbedAtDate: DateTime!
    $pagination: PaginationInputClimbLogs
    $compRoundId: ID
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
        total
        page
        perPage
        orderBy {
          key
          order
          __typename
        }
        __typename
      }
      data {
        id
        climbId
        userId
        points
        pointsBonus
        tryIndex
        tickIndex
        ticked
        tickType
        gymId
        climbType
        topped
        foreknowledge
        zones
        clips
        holds
        duration
        lead
        hangs
        comments
        climbedAtDate

        compClimbLog(compRoundId: $compRoundId) {
          id
          points
          pointsBase
          pointsBonus
          pointsJson
          __typename
        }

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
          holdColor {
            id
            color
            colorSecondary
            nameLoc
            order
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
          gym {
            id
            name
            nameSlug
            iconPath
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

        __typename
      }
      __typename
    }
  }
`;

interface Climb extends MongoGraphQLObject {
  grade: number;
  gym: Reference;
  holdColor: Reference;
  wall: Reference;
}

interface ClimbDereferenced extends Omit<Climb, "gym" | "holdColor" | "wall"> {
  gym: Gym;
  holdColor: HoldColor;
  wall: Wall;
}

interface ClimbDay extends MongoGraphQLObject {
  __typename: "ClimbDay";
  statsAtDate: Date;
  bouldersTotalTries: number;
  bouldersDayGradeMax: number;
  routesTotalTries: number;
  routesDayGradeMax: number;
  gradeDistributionRoutes: {
    grade: string;
    countFl: number;
    countOs: number;
    countRp: number;
  }[];
  gradeDistributionBoulders: {
    grade: string;
    countFl: number;
    countOs: number;
    countRp: number;
  }[];
  gym: Reference;
  user: Reference;
  bouldersDayGrade: number;
  bouldersDayGradeFlPct: number;
  bouldersDayGradeRepeatPct: number;
  routesDayGrade: number;
  routesDayGradeFlPct: number;
  routesDayGradeRepeatPct: number;
  routesTotalHeight: number;
}

type ClimbType = "boulder" | "route";
interface ClimbLog extends MongoGraphQLObject {
  grade: number;
  __typename: "ClimbLog";
  climb: Reference;
  climbId: string;
  climbType: ClimbType;
  climbedAtDate: Date;
  clips: number;
  comments: unknown;
  compClimbLog: unknown;
  duration: number;
  foreknowledge: boolean;
  gymId: string;
  hangs: number;
  holds: number;
  lead: boolean;
  points: number;
  pointsBonus: number;
  tickIndex: number;
  tickType: number;
  ticked: boolean;
  topped: boolean;
  tryIndex: number;
  userId: string;
  zones: number;
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

interface TopLoggerClimbLogDereferenced extends Omit<ClimbLog, "climb"> {
  climb: ClimbDereferenced;
}

interface TopLoggerClimbDayDereferenced extends Omit<ClimbDay, "gym"> {
  gym: Gym;
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
        ) =>
          fetchGraphQLQuery<TData>(
            query,
            variables,
            "https://app.toplogger.nu/graphql",
            { headers: { ...agentHeaders, ...headers } },
            operationName,
          );

        const userId = dataSource.config.graphQLId;

        let climbDays: TopLoggerClimbDayDereferenced[] = [];

        let page = 1;
        let graphqlClimbDaysPaginatedResponse =
          await fetchQuery<ClimbDaysSessionsQueryResponse>(
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
          graphqlClimbDaysPaginatedResponse =
            await fetchQuery<ClimbDaysSessionsQueryResponse>(
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
          const graphqlClimbLogsResponse =
            await fetchQuery<ClimbLogsQueryResponse>(
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
