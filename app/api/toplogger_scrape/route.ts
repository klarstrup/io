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
    updatedAt
    compClimbUser(compRoundId: $compRoundId) {
      climbUser {
        id
        __typename
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
      compRoundClimb {
        id
        points
        pointsJson
        leadRequired
        __typename
        compRoundId
        climbId
        compId
      }
      compId
      userId
      climbId
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
    compRoundId
    climbId
    compId
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
      compRoundId
      climbId
      compId
      __typename
    }
    __typename
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

const compsQuery = gql`
  query comps(
    $gymId: ID!
    $search: String
    $climbType: ClimbType
    $inviteOnly: Boolean
    $registered: Boolean
    $pagination: PaginationInputComps
    $isAdmin: Boolean!
  ) {
    comps(
      gymId: $gymId
      search: $search
      climbType: $climbType
      inviteOnly: $inviteOnly
      registered: $registered
      pagination: $pagination
    ) {
      pagination {
        ...pagination
        __typename
      }
      data {
        id
        ...compForComps
        ...compForCompPage
        __typename
      }
      __typename
    }
  }

  fragment compForRegistrationStatus on Comp {
    id
    loggableStartAt
    loggableEndAt
    compUserMe {
      id
      userId
      compId
      comp {
        id
        __typename

        compGyms {
          id
          gymId
          compId
          gym {
            id
            name
            __typename
          }
          __typename
        }
      }
      approvalState
      __typename
    }
    __typename
  }

  fragment compForAdminStatus on Comp {
    id
    compAdminMe {
      id
      permitJudge
      permitAdmin
      __typename
    }
    __typename
  }

  fragment pagination on Pagination {
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

  fragment compForComps on Comp {
    id
    name
    subtitleLoc
    logoPath
    loggableStartAt
    loggableEndAt
    inviteOnly
    compGyms {
      id
      gymId
      compId
      gym {
        id
        name
        __typename
      }
      __typename
    }

    ...compForRegistrationStatus
    ...compForAdminStatus
    __typename
  }

  fragment roundForRegistrationStatusRound on CompRound {
    id
    selfLoggable
    loggableStartAt
    loggableEndAt
    compRoundUserMe {
      id
      __typename
    }
    __typename
  }

  fragment compForRoundToolbarTitle on Comp {
    id
    name
    isMultiPoule
    isMultiRound(includeHidden: $isAdmin)
    compPoules {
      id
      compId
      nameLoc
      compRounds(includeHidden: $isAdmin) {
        id
        nameLoc
        __typename
      }
      __typename
    }
    __typename
  }

  fragment compForInviteDialog on Comp {
    id
    name
    inviteToken
    __typename
  }

  fragment compForDetails on Comp {
    id
    logoPath
    name
    subtitleLoc
    descriptionLoc
    prizesLoc
    prizePaths
    loggableStartAt
    loggableEndAt
    visible @include(if: $isAdmin)
    ...compForInviteDialog @include(if: $isAdmin)
    __typename
  }

  fragment roundForClimbsLink on CompRound {
    id
    climbType
    __typename
  }

  fragment compForAdminStatusBanner on Comp {
    id
    compAdminMe {
      id
      permitJudge
      permitAdmin
      __typename
    }
    compPoules {
      id
      compRounds(includeHidden: $isAdmin) {
        id
        ...roundForClimbsLink
        __typename
      }
      __typename
    }
    __typename
  }

  fragment compForRegistrationDetails on Comp {
    id
    registrationStartAt
    registrationEndAt
    inviteOnly
    approveParticipation
    participantsMax
    participantsSpotsLeft
    __typename
  }

  fragment compForRegistrationDisabled on Comp {
    id
    inviteOnly
    registrationStartAt
    registrationEndAt
    loggableEndAt
    participantsMax
    participantsSpotsLeft
    compUserMe {
      id
      __typename
    }
    compPoules {
      id
      compRounds(includeHidden: $isAdmin) {
        id
        loggableEndAt
        compRoundUserMe {
          id
          participating
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }

  fragment roundForRegistrationDisabledRound on CompRound {
    id
    participantsPickedByAdmin
    loggableEndAt
    participantsMax
    participantsSpotsLeft
    __typename
  }

  fragment compForRegistrationDisabledRound on Comp {
    id
    isMultiRound(includeHidden: $isAdmin)
    __typename
  }

  fragment compForRoundSelect on Comp {
    id
    isMultiPoule
    isMultiRound(includeHidden: $isAdmin)
    compPoules {
      id
      nameLoc
      descriptionLoc
      compRounds(includeHidden: $isAdmin) {
        id
        compPouleId
        nameLoc
        loggableStartAt
        loggableEndAt
        __typename
      }
      __typename
    }
    __typename
  }

  fragment compForRegistrationDialog on Comp {
    id
    name
    registrationMessageLoc
    isMultiPoule
    isMultiRound(includeHidden: $isAdmin)
    registrationRoundsMax
    compUserMe {
      id
      approvalState
      __typename
    }
    compPoules {
      id
      compRounds(includeHidden: $isAdmin) {
        id
        ...roundForRegistrationDisabledRound
        __typename
      }
      __typename
    }
    ...compForRegistrationDisabledRound
    ...compForRoundSelect
    __typename
  }

  fragment roundForBtnSubscribeRound on CompRound {
    id
    nameLoc
    compRoundUserMe {
      id
      __typename
    }
    __typename
  }

  fragment roundForBtnUnsubscribeRound on CompRound {
    id
    nameLoc
    compRoundUserMe {
      id
      userId
      compRoundId
      __typename
    }
    __typename
  }

  fragment compForUnsubscribe on Comp {
    id
    name
    __typename
  }

  fragment compForRegistrationEdit on Comp {
    id
    name
    isMultiPoule
    isMultiRound(includeHidden: $isAdmin)
    registrationRoundsMax
    compPoules {
      id
      compRounds(includeHidden: $isAdmin) {
        id
        ...roundForRegistrationDisabledRound
        ...roundForBtnSubscribeRound
        ...roundForBtnUnsubscribeRound
        __typename
      }
      __typename
    }
    compUserMe {
      id
      firstName
      lastName
      email
      createdAt
      approvalState
      compRoundUsers {
        id
        compRoundId
        __typename
      }
      __typename
    }
    ...compForRegistrationStatus
    ...compForRegistrationDisabled
    ...compForRegistrationDisabledRound
    ...compForRoundSelect
    ...compForUnsubscribe
    __typename
  }

  fragment compForRegistrationBtn on Comp {
    id
    isMultiPoule
    compUserMe {
      id
      approvalState
      __typename
    }
    compPoules {
      id
      compRounds(includeHidden: $isAdmin) {
        id
        compRoundUserMe {
          id
          __typename
        }
        __typename
      }
      __typename
    }
    ...compForRegistrationStatus
    ...compForRegistrationDisabled
    ...compForRegistrationDialog
    ...compForRegistrationEdit
    __typename
  }

  fragment compForRegistrationStatusRound on Comp {
    id
    compUserMe {
      id
      approvalState
      __typename
    }
    __typename
  }

  fragment compForRegistrationAnonymizeBtn on Comp {
    id
    loggableEndAt
    compUserMe {
      id
      fullName
      approvalState
      __typename
    }
    __typename
  }

  fragment compForRoundDetailsBase on Comp {
    id
    isMultiRound(includeHidden: $isAdmin)
    __typename
  }

  fragment compForCompGymSelect on Comp {
    id
    compGyms {
      id
      gym {
        id
        iconPath
        name
        nameSlug
        __typename
      }
      __typename
    }
    __typename
  }

  fragment compForRoundClimbs on Comp {
    id
    __typename
  }

  fragment compForRegistrationBtnRound on Comp {
    id
    compUserMe {
      id
      approvalState
      __typename
    }
    isMultiPoule
    isMultiRound(includeHidden: $isAdmin)
    ...compForRegistrationStatusRound
    ...compForRegistrationDisabled
    ...compForRegistrationDisabledRound
    ...compForRegistrationDialog
    ...compForRegistrationEdit
    __typename
  }

  fragment compForRoundDetails on Comp {
    id
    climbType
    isMultiPoule
    isMultiRound(includeHidden: $isAdmin)
    compGyms {
      id
      __typename
    }
    ...compForDetails
    ...compForRoundDetailsBase
    ...compForCompGymSelect
    ...compForRoundClimbs
    ...compForRegistrationDetails
    ...compForRegistrationBtnRound
    __typename
  }

  fragment compForRoundRankingTable on Comp {
    id
    __typename
  }

  fragment compForRoundRankingClimbUser on Comp {
    id
    __typename
  }

  fragment compForRoundRanking on Comp {
    id
    ...compForRoundRankingTable
    ...compForRoundRankingClimbUser
    __typename
  }

  fragment compForRound on Comp {
    id
    name
    isMultiPoule
    isMultiRound(includeHidden: $isAdmin)
    ...compForRoundToolbarTitle
    ...compForRoundDetails
    ...compForRoundRanking
    __typename
  }

  fragment compForCompPage on Comp {
    id
    name
    loggableEndAt
    isMultiPoule
    compUserMe {
      id
      approvalState
      __typename
    }
    compPoules {
      id
      compRounds(includeHidden: $isAdmin) {
        id
        compRoundUserMe {
          id
          participating
          __typename
        }
        ...roundForRegistrationStatusRound
        __typename
      }
      __typename
    }
    ...compForRoundToolbarTitle
    ...compForDetails
    ...compForAdminStatusBanner
    ...compForRegistrationDetails
    ...compForRegistrationBtn
    ...compForRegistrationStatusRound
    ...compForRegistrationAnonymizeBtn
    ...compForRoundSelect
    ...compForRound
    ...compForRoundRanking
    __typename
  }
`;

const userMeStoreQuery = gql`
  query userMeStore {
    userMe {
      ...userMeStore
      __typename
    }
  }

  fragment userMeStoreFavorite on GymUserMe {
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

  fragment userMeStore on UserMe {
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
    gym {
      id
      nameSlug
      __typename
    }
    gymUserFavorites {
      ...userMeStoreFavorite
      __typename
    }
    __typename
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
  climbSetters: ClimbSetter[];
  wallId: string;
  wallSectionId: null;
  wallSection: null;
  holdColorId: string;
  climbGroupClimbs: ClimbGroupClimb[];
  climbUser: ClimbUser | null;
  compRoundClimb: CompRoundClimb;
}

export interface ClimbGroupClimb extends MongoGraphQLObject<"ClimbGroupClimb"> {
  climbGroupId: string;
  order: number;
}

export interface ClimbSetter extends MongoGraphQLObject<"ClimbSetter"> {
  id: string;
  gymAdmin: GymAdmin;
}

export interface GymAdmin extends MongoGraphQLObject<"GymAdmin"> {
  name: string;
  picPath: null;
}

export interface ClimbUser extends MongoGraphQLObject<"ClimbUser"> {
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
  points: number;
  pointsJson: CompClimbUserPointsJSON;
  tickType: number;
}
export interface CompClimbUserPointsJSON {
  zones: Zone[];
}

export interface Zone {
  points: number;
  pointsBase: number;
  pointsBonus: number;
}

export interface CompRoundClimb extends MongoGraphQLObject<"CompRoundClimb"> {
  points: number;
  pointsJson: CompRoundClimbPointsJSON;
  leadRequired: boolean;
  climbId: string;
  compId: string;
  compRoundId: string;
}

export interface CompRoundClimbPointsJSON {
  zones: number[];
}

interface ClimbDereferenced extends Omit<Climb, "gym" | "holdColor" | "wall"> {
  gym: Gym;
  holdColor: HoldColor;
  wall: Wall;
}

interface ClimbDay extends MongoGraphQLObject<"ClimbDay"> {
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
export interface ClimbLog extends MongoGraphQLObject<"ClimbLog"> {
  grade: number;
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

export interface UserMe extends MongoGraphQLObject<"UserMe"> {
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
  gym: UserMeGym;
  gymUserFavorites: GymUserFavorite[];
}

export interface Comp extends MongoGraphQLObject<"Comp"> {
  name: string;
  subtitleLoc: null;
  logoPath: null | string;
  loggableStartAt: Date;
  loggableEndAt: Date;
  inviteOnly: boolean;
  compUserMe: CompUser | null;
  compAdminMe: null;
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
export interface CompRound extends MongoGraphQLObject<"CompRound"> {
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
  scoreSystemRouteParams: ScoreSystemParams;
  scoreSystemBoulder: string;
  scoreSystemBoulderParams: ScoreSystemParams;
  tiebreakers: unknown[];
  compId: string;
}

export interface ScoreSystemParams {
  bonusFlPercent: number;
  bonusOsPercent: number;
}
export interface CompRoundUser extends MongoGraphQLObject<"CompRoundUser"> {
  participating: boolean;
}
export interface CompPoule extends MongoGraphQLObject<"CompPoule"> {
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
export interface TopLoggerCompUserDereferenced extends Omit<CompUser, "comp"> {
  comp: Comp;
}

export interface UserMeGym extends MongoGraphQLObject<"UserMeGym"> {
  nameSlug: string;
}

export interface GymUserFavorite extends MongoGraphQLObject<"GymUserFavorite"> {
  gym: GymUserFavoriteGym;
}

export interface GymUserFavoriteGym
  extends MongoGraphQLObject<"GymUserFavoriteGym"> {
  name: string;
  nameSlug: string;
  iconPath: string;
}

export interface Gym extends MongoGraphQLObject<"Gym"> {
  name: string;
  nameSlug: string;
}

interface Wall extends MongoGraphQLObject<"Wall"> {
  nameLoc: string;
}

export interface HoldColor extends MongoGraphQLObject<"HoldColor"> {
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

        const userMe = (await fetchQuery<{ userMe: UserMe }>(userMeStoreQuery))
          .data?.userMe;

        yield userMe;

        const gyms = userMe?.gymUserFavorites.map((fav) => fav.gym);

        if (gyms) {
          for (const gym of gyms) {
            const compsVariables = {
              gymId: gym.id,
              registered: true,
              isAdmin: false,
              pagination: {
                page: 1,
                perPage: 10,
                orderBy: [{ key: "loggableStartAt", order: "desc" }],
              },
            };
            const compsResponse = await fetchQuery<{
              comps: {
                pagination: {
                  total: number;
                  perPage: number;
                  page: number;
                };
                data: Comp[];
              };
            }>(compsQuery, compsVariables);

            const updateResult = await normalizeAndUpsertQueryData(
              compsQuery,
              compsVariables,
              compsResponse.data!,
            );

            yield updateResult;

            for (const comp of compsResponse.data?.comps.data ?? []) {
              for (const poule of comp.compPoules) {
                for (const round of poule.compRounds) {
                  const climbsVariables = {
                    gymId: gym.id,
                    climbType: "boulder",
                    compRoundId: round.id,
                    userId,
                  };
                  const climbsResponse = await fetchQuery<{
                    climbs: {
                      pagination: {
                        total: number;
                        perPage: number;
                        page: number;
                      };
                      data: Climb[];
                    };
                  }>(climbsQuery, climbsVariables);

                  const updateResult = await normalizeAndUpsertQueryData(
                    climbsQuery,
                    climbsVariables,
                    climbsResponse.data!,
                  );
                  console.log(climbsResponse.data?.climbs.data);
                  yield updateResult;
                }
              }
            }
          }
        }

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
