import { type DocumentNode } from "graphql";
import gql from "graphql-tag";
import { ObjectId } from "mongodb";
import { auth } from "../../../auth";
import { isAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { chunk } from "../../../utils";
import { proxyCollection } from "../../../utils.server";
import {
  fetchGraphQLQueries,
  fetchGraphQLQuery,
  type GraphQLID,
  type GraphQLRequestTuple,
  type GraphQLTypeName,
  isReference,
  normalize,
  type Reference,
  type RootFields,
  type Variables,
} from "../../../utils/graphql";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const climbsQuery = gql`
  query climbs(
    $gymId: ID!
    $climbType: ClimbType!
    $isReported: Boolean
    $userId: ID
    $compRoundId: ID
  ) {
    climbs(
      gymId: $gymId
      climbType: $climbType
      isReported: $isReported
      compRoundId: $compRoundId
    ) {
      data {
        ...climb
        ...climbWithClimbUser
        ...climbWithCompRoundClimb
        __typename
      }
      __typename
    }
  }

  fragment climbGroupClimb on ClimbGroupClimb {
    id
    climbGroupId
    order
    __typename
  }

  fragment climbUser on ClimbUser {
    id
    climbId
    grade
    rating
    project
    votedRenew
    tickType
    totalTries
    triedFirstAtDate
    tickedFirstAtDate
    compClimbUser(compRoundId: $compRoundId) {
      id
      points
      pointsJson
      tickType
      __typename
    }
    __typename
  }

  fragment compRoundClimb on CompRoundClimb {
    id
    points
    pointsJson
    leadRequired
    __typename
  }

  fragment climb on Climb {
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
    climbSetters {
      id
      gymAdmin {
        id
        name
        picPath
        __typename
      }
      __typename
    }
    wallId
    wall {
      id
      nameLoc
      labelX
      labelY
      __typename
    }
    wallSectionId
    wallSection {
      id
      name
      routesEnabled
      positionX
      positionY
      __typename
    }
    holdColorId
    holdColor {
      id
      color
      colorSecondary
      nameLoc
      order
      __typename
    }
    climbGroupClimbs {
      ...climbGroupClimb
      __typename
    }
    climbTagClimbs {
      id
      climbTagId
      order
      climbTag {
        id
        type
        nameLoc
        icon
        __typename
      }
      __typename
    }
    __typename
  }

  fragment climbWithClimbUser on Climb {
    id
    climbUser(userId: $userId) {
      ...climbUser
      __typename
    }
    __typename
  }

  fragment climbWithCompRoundClimb on Climb {
    id
    compRoundClimb(compRoundId: $compRoundId) {
      ...compRoundClimb
      __typename
    }
    __typename
  }
`;

const climbUsersQuery = gql`
  query climbUsers(
    $gymId: ID
    $userId: ID
    $pagination: PaginationInputClimbUsers
  ) {
    climbUsers(
      gymId: $gymId
      userId: $userId
      pagination: $pagination
      pointsMin: 1
    ) {
      data {
        id
        userId
        tickType
        points
        pointsBonus
        pointsExpireAtDate
        climbId
        grade
        rating
        project
        votedRenew
        tickType
        totalTries
        triedFirstAtDate
        tickedFirstAtDate

        climb {
          id
          name
          grade
          inAt
          outAt
          gym {
            id
            name
            nameSlug
            __typename
          }
          __typename
        }
        wall {
          id
          nameLoc
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

export interface MongoGraphQLObject {
  __typename: string;
  id: string;
}

interface TopLoggerClimbUser extends MongoGraphQLObject {
  __typename: "ClimbUser";
  id: string;
  tickType: string;
  points: number;
  pointsBonus: number;
  pointsExpireAtDate: string;
  climbId: string;
  grade: string;
  rating: number;
  project: string;
  votedRenew: boolean;
  totalTries: number;
  triedFirstAtDate: string;
  tickedFirstAtDate: string;
  // Object fields
  climb: Reference;
  wall: Reference;
  holdColor: Reference;
}

interface Climb extends MongoGraphQLObject {
  grade: number;
}

interface Wall extends MongoGraphQLObject {
  nameLoc: string;
}

interface HoldColor extends MongoGraphQLObject {
  color: string;
  nameLoc: string;
}

interface TopLoggerClimbUserDereferenced
  extends Omit<TopLoggerClimbUser, "climb" | "wall" | "holdColor"> {
  climb: Climb;
  wall: Wall;
  holdColor: HoldColor;
}

export const TopLoggerGraphQL = proxyCollection<
  (MongoGraphQLObject & { [key: string]: unknown }) | TopLoggerClimbUser
>("toplogger_graphql");

export const dereferenceDocument = async <
  D extends MongoGraphQLObject,
  R extends MongoGraphQLObject,
>(
  docRaw: D,
): Promise<R> => {
  const doc = { ...docRaw } as D & R;

  for (const key in doc) {
    if (isReference(doc[key])) {
      const [__typename, id] = doc[key].__ref.split(":") as [
        GraphQLID,
        GraphQLTypeName,
      ];
      const keyDoc = await TopLoggerGraphQL.findOne({ __typename, id });
      if (!keyDoc) {
        throw new Error(
          `Failed to dereference ${key} of ${doc.__typename}:${doc.id}`,
        );
      }
      doc[key] = keyDoc;
    }
  }

  return doc as R;
};

async function normalizeAndUpsertQueryData(
  query: DocumentNode,
  variables: Variables | undefined,
  data: RootFields,
) {
  const objects = Object.values(normalize(query, variables, data)).filter(
    (o) => o.__typename && o.id,
  );
  for (const object of objects) {
    await TopLoggerGraphQL.updateOne(
      { __typename: object.__typename as string, id: object.id as string },
      { $set: object },
      { upsert: true },
    );
  }

  return objects;
}

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* (flushJSON) {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    let authTokens = user.topLoggerAuthTokens;
    if (!authTokens || new Date(authTokens.refresh.expiresAt) < new Date()) {
      throw new Error(
        "No auth tokens or refresh token expired, please add auth tokens",
      );
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
        { headers: { authorization: `Bearer ${authTokens.refresh.token}` } },
      );

      if (
        typeof authSigninRefreshTokenResponse === "object" &&
        authSigninRefreshTokenResponse &&
        "data" in authSigninRefreshTokenResponse &&
        typeof authSigninRefreshTokenResponse.data === "object" &&
        authSigninRefreshTokenResponse.data &&
        "authSigninRefreshToken" in authSigninRefreshTokenResponse.data &&
        typeof authSigninRefreshTokenResponse.data.authSigninRefreshToken ===
          "object" &&
        isAuthTokens(authSigninRefreshTokenResponse.data.authSigninRefreshToken)
      ) {
        authTokens = authSigninRefreshTokenResponse.data.authSigninRefreshToken;
        await Users.updateOne(
          { _id: new ObjectId(user.id) },
          { $set: { topLoggerAuthTokens: authTokens } },
        );
        await flushJSON("Updated authTokens with refresh token");
      } else {
        throw new Error("Failed to refresh token");
      }
    }

    await flushJSON({ authTokens });

    const headers = { authorization: `Bearer ${authTokens.access.token}` };
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
        }
      }
    `);

    const userId = (userMeResponse as { data: { userMe: { id: string } } }).data
      .userMe.id;

    await flushJSON({ userId });

    const graphqlTotalResponse = await fetchQuery(
      gql`
        query climbUsers(
          $gymId: ID
          $userId: ID
          $pagination: PaginationInputClimbUsers
        ) {
          __typename
          climbUsers(gymId: $gymId, userId: $userId, pagination: $pagination) {
            pagination {
              total
              __typename
            }
            __typename
          }
        }
      `,
      {
        gymId: "rl63cez60dc4xo95uw3ta",
        userId,
        pagination: { page: 1, perPage: 1 },
      },
    );

    const total = (
      graphqlTotalResponse as {
        data: { climbUsers: { pagination: { total: number } } };
      }
    ).data.climbUsers.pagination.total;

    await flushJSON({ total });

    const pageNumberss = chunk(
      Array.from({ length: Math.ceil(total / 10) }, (_, i) => i + 1),
      20,
    ).slice(0, 1);

    await flushJSON({ pageNumberss });

    for (const pageNumbers of pageNumberss) {
      const queries = pageNumbers.slice(0, 1).map(
        (page): GraphQLRequestTuple => [
          climbUsersQuery,
          {
            gymId: "rl63cez60dc4xo95uw3ta",
            userId,
            pagination: {
              page,
              orderBy: [
                { key: "tickType", order: "desc" },
                { key: "tickedFirstAtDate", order: "desc" },
              ],
            },
          },
        ],
      );
      const graphqlResponse2 = await fetchQueries(queries);

      await flushJSON(
        await normalizeAndUpsertQueryData(
          queries[0]![0],
          queries[0]![1],
          graphqlResponse2[0]!.data!,
        ),
      );

      break; // Only fetch the first page while developing

      await new Promise((resolve) => setTimeout(resolve, 30000));
    }

    const rawDoc = await TopLoggerGraphQL.findOne<TopLoggerClimbUser>({
      __typename: "ClimbUser",
      userId,
    });

    if (!rawDoc) throw new Error("Failed to find climb ClimbUser for user");

    const doc = await dereferenceDocument<
      TopLoggerClimbUser,
      TopLoggerClimbUserDereferenced
    >(rawDoc);

    await flushJSON({ doc });
  });
