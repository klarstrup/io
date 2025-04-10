import gql from "graphql-tag";

type ClimbType = "boulder" | "route";

export interface GraphQLObject<T extends string> {
  __typename: T;
  id: string;
}

export const PaginationFragment = gql`
  fragment PaginationFragment on Pagination {
    __typename
    total
    page
    perPage
    orderBy {
      key
      order
      __typename
    }
  }
`;
export interface PaginationObject {
  __typename: "Pagination";
  total: number;
  page: number;
  perPage: number;
  orderBy: {
    key: string;
    order: "asc" | "desc";
    __typename: "OrderBy";
  }[];
}
export interface PaginatedObjects<T> {
  pagination: PaginationObject;
  data: T[];
}

export const UserScalarsFragment = gql`
  fragment UserScalarsFragment on User {
    id
    avatarUploadPath
    __typename
  }
`;
export interface UserScalars extends GraphQLObject<"User"> {
  avatarUploadPath: null | string;
}

export const UserMeScalarsFragment = gql`
  fragment UserMeScalarsFragment on UserMe {
    __typename
    id
    locale
    gradingSystemRoutes
    gradingSystemBoulders
    profileReviewed
    avatarUploadPath
    firstName
    lastName
    fullName
    gender
    email
    privacy
    gymId
  }
`;
export interface UserMeScalars extends GraphQLObject<"UserMe"> {
  locale: string;
  gradingSystemRoutes: null;
  gradingSystemBoulders: null;
  profileReviewed: boolean;
  avatarUploadPath: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  email: string;
  privacy: string;
  // gym: UserMeGym;
  // gymUserFavorites: GymUserFavorite[];
}

export const GymScalarsFragment = gql`
  fragment GymScalarsFragment on Gym {
    __typename
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
    latitude
    longitude
    visibleSoon
    climbTypeDefault
    city
    countryCode
    visible
    bouldersEnabled
    routesEnabled
  }
`;
export interface GymScalars extends GraphQLObject<"Gym"> {
  name: string;
  nameSlug: string;
  iconPath: string;
  markBoulderNewDays: number;
  markRouteNewDays: number;
  markBoulderOutSoonDays: number;
  markRouteOutSoonDays: number;
  settingsLogBoulders: {
    reportBtnEnabled: boolean;
    voteRenewEnabled: boolean;
  };
  settingsLogRoutes: {
    reportBtnEnabled: boolean;
    voteRenewEnabled: boolean;
  };
  latitude: number;
  longitude: number;
  visibleSoon: boolean;
  climbTypeDefault: ClimbType;
  city: string | null;
  countryCode: string;
  visible: boolean;
  bouldersEnabled: boolean;
  routesEnabled: boolean;
}

export const CompGymScalarsFragment = gql`
  fragment CompGymScalarsFragment on CompGym {
    __typename
    id
    compId
    gymId
  }
`;

export const CompPouleScalarsFragment = gql`
  fragment CompPouleScalarsFragment on CompPoule {
    __typename
    id
    compId
    nameLoc
    descriptionLoc
  }
`;

export const GymUserMeScalarsFragment = gql`
  fragment GymUserMeScalarsFragment on GymUserMe {
    __typename
    id
    userId
    gymId
  }
`;
export interface GymUserMeScalars extends GraphQLObject<"GymUserMe"> {
  userId: string;
  gymId: string;
}

export const ClimbScalarsFragment = gql`
  fragment ClimbScalarsFragment on Climb {
    __typename
    id
    gymId
    wallId
    wallSectionId
    holdColorId
    grade
    climbType
    positionX
    positionY
    gradeAuto
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
    autobelay
    leadEnabled
    leadRequired
    ratingsAverage
    ticksCount
    inAt
    outAt
    outPlannedAt
    order
    setterName
  }
`;
export const ClimbGroupClimbScalarsFragment = gql`
  fragment ClimbGroupClimbScalarsFragment on ClimbGroupClimb {
    id
    climbId
    gymId
    climbGroupId
    order
    __typename
  }
`;

export const ClimbUserScalarsFragment = gql`
  fragment ClimbUserScalarsFragment on ClimbUser {
    __typename
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
    updatedAt
  }
`;

export const CompClimbUserScalarsFragment = gql`
  fragment CompClimbUserScalarsFragment on CompClimbUser {
    __typename
    id
    climbType
    compId
    userId
    compUserId
    climbId
    points
    pointsJson
    tickType
    totalTries
  }
`;
export const CompUserScalarsFragment = gql`
  fragment CompUserScalarsFragment on CompUser {
    id
    userId
    compId
    fullName
    disqualified
    __typename
    approvalState
    firstName
    lastName
    email
    # Only available in compUserMe objects
    # createdAt
  }
`;
export interface CompUserScalars extends GraphQLObject<"CompUser"> {
  id: string;
  userId: string;
  compId: string;
  fullName: string;
  disqualified: boolean;
  approvalState: "APPROVED";
  firstName: string;
  lastName: string;
  email: null;
}

export const CompRoundScalarsFragment = gql`
  fragment CompRoundScalarsFragment on CompRound {
    __typename
    id
    climbType
    loggableEndAt
    selfLoggable
    loggableStartAt
    participantsPickedByAdmin
    participantsMax
    participantsSpotsLeft
    nameLoc
    compPouleId
  }
`;

export const CompRoundClimbScalarsFragment = gql`
  fragment CompRoundClimbScalarsFragment on CompRoundClimb {
    __typename
    id
    points
    pointsJson
    leadRequired
    compRoundId
    climbId
    compId
  }
`;

export const CompRoundUserScalarsFragment = gql`
  fragment CompRoundUserScalarsFragment on CompRoundUser {
    __typename
    id
    userId
    compUserId
    compRoundId
    score
    totMaxZones
    totMaxClips
    totMaxHolds
    totMinTries
    totMinDuration
    climbsWithScoresCount
    participating
    # compUser
    # user
  }
`;
export interface CompRoundUserScalars extends GraphQLObject<"CompRoundUser"> {
  userId: string;
  compUserId: string;
  compRoundId: string;
  score: number;
  totMaxZones: number;
  totMaxClips: number;
  totMaxHolds: number;
  totMinTries: number;
  totMinDuration: number;
  climbsWithScoresCount: number;
  participating: boolean;
  // compUser: CompUser;
  // user: User;
}

export const CompClimbLogScalarsFragment = gql`
  fragment CompClimbLogScalarsFragment on CompClimbLog {
    __typename
    id
    points
    pointsBase
    pointsBonus
    pointsJson
  }
`;

export const WallScalarsFragment = gql`
  fragment WallScalarsFragment on Wall {
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
`;

export const WallSectionScalarsFragment = gql`
  fragment WallSectionScalarsFragment on WallSection {
    id
    name
    routesEnabled
    positionX
    positionY
    __typename
  }
`;

export const HoldColorScalarsFragment = gql`
  fragment HoldColorScalarsFragment on HoldColor {
    id
    color
    colorSecondary
    nameLoc
    order
    __typename
  }
`;

export const ClimbDayScalarsFragment = gql`
  fragment ClimbDayScalarsFragment on ClimbDay {
    __typename
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
    gymId
  }
`;
export interface ClimbDayScalars extends GraphQLObject<"ClimbDay"> {
  statsAtDate: Date;
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
  bouldersTotalTries: number;
  bouldersDayGrade: number;
  bouldersDayGradeMax: number;
  bouldersDayGradeFlPct: number;
  bouldersDayGradeRepeatPct: number;
  routesTotalTries: number;
  routesDayGrade: number;
  routesDayGradeMax: number;
  routesDayGradeOsPct: number;
  routesDayGradeFlPct: number;
  routesDayGradeRepeatPct: number;
  routesTotalHeight: number;
  gymId: string;
  // gym: Reference;
  // user: Reference;
}

export const ClimbTagClimbScalarsFragment = gql`
  fragment ClimbTagClimbScalarsFragment on ClimbTagClimb {
    __typename
    id
    climbTagId
    order
  }
`;

export const ClimbTagScalarsFragment = gql`
  fragment ClimbTagScalarsFragment on ClimbTag {
    id
    type
    nameLoc
    icon
    __typename
  }
`;

export const CompScalarsFragment = gql`
  fragment CompScalarsFragment on Comp {
    __typename
    id
    name
    subtitleLoc
    logoPath
    loggableStartAt
    loggableEndAt
    inviteOnly
    isMultiPoule
    isMultiRound
    registrationStartAt
    registrationEndAt
    participantsMax
    participantsSpotsLeft
    registrationMessageLoc
    registrationRoundsMax
    descriptionLoc
    prizesLoc
    prizePaths
    approveParticipation
    climbType
  }
`;
