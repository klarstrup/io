import { type DocumentNode } from "graphql";
import gql from "graphql-tag";
import { ObjectId } from "mongodb";
import { auth } from "../../../auth";
import { isAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { chunk } from "../../../utils";
import {
  fetchGraphQLQueries,
  fetchGraphQLQuery,
  type GraphQLRequestTuple,
  type MongoGraphQLObject,
  normalizeAndUpsertQueryData,
  type Reference,
  TopLoggerGraphQL,
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

    let authTokens = user.topLoggerAuthTokens;
    if (!authTokens || new Date(authTokens.refresh.expiresAt) < new Date()) {
      throw new Error(
        "No auth tokens or refresh token expired, please add auth tokens",
      );
    }

    await TopLoggerGraphQL.createIndexes([{ key: { __typename: 1, id: 1 } }]);
    await TopLoggerGraphQL.createIndexes([
      { key: { __typename: 1, userId: 1 } },
    ]);

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

    const userMeStoreQuery = gql`
      query userMeStore {
        userMe {
          ...userMeStore
          __typename
        }
      }

      fragment userMeStore on UserMe {
        id
        locale
        gradingSystemRoutes
        gradingSystemBoulders
        anonymous
        profileReviewed
        avatarUploadPath
        firstName
        lastName
        fullName
        gender
        email
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
          __typename
        }
        __typename
      }
    `;

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

    const userId = (userMeResponse as { data: { userMe: { id: string } } }).data
      .userMe.id;

    await flushJSON({ userId });

    if (
      !userMeResponse.data!.userMe ||
      !(typeof userMeResponse.data!.userMe === "object") ||
      !("gymUserFavorites" in userMeResponse.data!.userMe!) ||
      !userMeResponse.data!.userMe!.gymUserFavorites || 
      !Array.isArray(userMeResponse.data!.userMe!.gymUserFavorites)
    ) {
      throw new Error("No gymUserFavorites");
    }

    const gyms = userMeResponse.data!.userMe!.gymUserFavorites.map(
      (guf) => guf.gym as Gym,
    );

    await flushJSON({ gyms });

    for (const gym of gyms) {
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
              pointsMin: 1
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

      const total = (
        graphqlTotalResponse as {
          data: { climbUsers: { pagination: { total: number } } };
        }
      ).data.climbUsers.pagination.total;

      await flushJSON({ total });

      const pageNumberss = chunk(
        Array.from({ length: Math.ceil(total / 10) }, (_, i) => i + 1),
        20,
      );

      await flushJSON({ pageNumberss });

      for (const pageNumbers of pageNumberss) {
        const queries = pageNumbers.map(
          (page): GraphQLRequestTuple => [
            climbUsersQuery,
            {
              gymId: gym.id,
              userId,
              pagination: {
                page,
                orderBy: [{ key: "tickedFirstAtDate", order: "desc" }],
              },
            },
          ],
        );
        const graphqlResponse2 = await fetchQueries(queries);

        for (let i = 0; i < queries.length; i++) {
          const [query, variables] = queries[i]!;
          const response = graphqlResponse2[i]!;

          const insertedDocuments = await normalizeAndUpsertQueryData(
            query,
            variables,
            response.data!,
          );

          await flushJSON(`Inserted ${insertedDocuments.length} documents`);
        }

        await new Promise((resolve) => setTimeout(resolve, 30000));
      }

      /*
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
    */
    }
  });
