import gql from "graphql-tag";
import {
  ClimbDayScalars,
  ClimbDayScalarsFragment,
  ClimbGroupClimbScalars,
  ClimbGroupClimbScalarsFragment,
  ClimbGroupScalars,
  ClimbGroupScalarsFragment,
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

export const climbsQuery = gql`
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
export interface ClimbsResponse {
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
}

export const authSigninRefreshTokenQuery = gql`
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

export const climbDaysSessionsQuery = gql`
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
export interface ClimbDaysSessionsResponse {
  climbDaysPaginated: PaginatedObjects<ClimbDayScalars>;
}

export const climbLogsQuery = gql`
  ${PaginationFragment}
  ${ClimbLogScalarsFragment}
  ${ClimbScalarsFragment}
  ${ClimbUserScalarsFragment}
  ${ClimbGroupClimbScalarsFragment}

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

          climbGroupClimbs {
            ...ClimbGroupClimbScalarsFragment
          }

          climbUser(userId: $userId) {
            ...ClimbUserScalarsFragment
          }
        }
      }
      __typename
    }
  }
`;
export interface ClimbLogsResponse {
  climbLogs: PaginatedObjects<ClimbLogScalars & { climb: ClimbScalars }>;
}

export const compsQuery = gql`
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
export interface CompsResponse {
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
}

export const userMeStoreQuery = gql`
  ${GymScalarsFragment}
  ${UserMeScalarsFragment}
  ${GymUserMeScalarsFragment}
  ${HoldColorScalarsFragment}
  ${WallScalarsFragment}
  ${WallSectionScalarsFragment}
  ${ClimbGroupScalarsFragment}

  query userMeStore {
    userMe {
      ...UserMeScalarsFragment

      gymUsers {
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
          climbGroups {
            ...ClimbGroupScalarsFragment
          }
        }
      }

      gym {
        ...GymScalarsFragment
      }
      gymUserFavorites {
        ...GymUserMeScalarsFragment
      }
    }
  }
`;
export interface UserMeStoreResponse {
  userMe: UserMeScalars & {
    gym: GymScalars;
    gymUserFavorites: GymUserMeScalars[];
    gymUsers: (GymUserMeScalars & {
      gym: GymScalars & {
        walls: WallScalars[];
        wallSections: WallSectionScalars[];
        holdColors: HoldColorScalars[];
        climbGroups: ClimbGroupScalars[];
      };
    })[];
  };
}

export const compRoundUsersForRankingQuery = gql`
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
export interface CompRoundUsersForRankingResponse {
  ranking: PaginatedObjects<
    CompRoundUserScalars & {
      compUser: CompUserScalars & { compPouleUsers: CompPouleUserScalars[] };
    }
  >;
}

export const compClimbUsersForRankingClimbUserQuery = gql`
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
export interface CompClimbUsersForRankingClimbUserResponse {
  compClimbUsers: PaginatedObjects<
    CompClimbUserScalars & {
      climb: ClimbScalars & {
        climbGroupClimbs: ClimbGroupClimbScalars[];
        climbUser: ClimbUserScalars;
        compRoundClimb: CompRoundClimbScalars;
      };
    }
  >;
}
