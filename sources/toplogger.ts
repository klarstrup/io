import { isAfter, isBefore, isFuture } from "date-fns";
import type {
  Climb,
  ClimbLog,
  Comp,
  CompGym,
  CompPoule,
  CompRound,
  CompRoundClimb,
  CompUser,
  Gym,
  HoldColor,
} from "../app/api/toplogger_scrape/route";
import {
  type DateInterval,
  type EventEntry,
  EventSource,
  type Score,
} from "../lib";
import { TopLoggerGraphQL, dereferenceReference } from "../utils/graphql";

export namespace TopLogger {
  export interface GroupSingle {
    id: number;
    name: string;
    description: string;
    live: boolean;
    lived: boolean;
    date_live_start: Date;
    date_loggable_start: Date;
    date_loggable_end: Date;
    climbs_type: string;
    score_system: "points" | "thousand_divide_by";
    score_system_params: ScoreSystemParams;
    approve_participation: boolean;
    split_gender: boolean;
    split_age: boolean;
    gym_groups: GymGroup[];
    climb_groups: ClimbGroup[];
    group_users: GroupUser[];
    poules: unknown[];
  }

  export interface ClimbGroup {
    id: number;
    climb_id: number;
    group_id: number;
  }

  export interface GroupUser {
    id: number;
    user_id: number;
    group_id: number;
    approved: boolean;
    score_estimate: string;
    score_estimate_base: string;
    score: string;
    deleted: boolean;
  }

  export interface GymGroup {
    id: number;
    gym_id: number;
    group_id: number;
    admin: boolean;
    added: boolean;
    deleted: boolean;
  }

  export interface ScoreSystemParams {
    bonus_percent_fl?: string;
    bonus_percent_os?: BonusPercentOS;
    points?: string;
    points_flash?: string;
    points_onsight?: string;
  }

  export type BonusPercentOS = number | string;

  export interface GymSingle {
    id: number;
    id_name: string;
    slug: string;
    name: string;
    name_short: string;
    gym_type: string;
    has_routes: boolean;
    live: boolean;
    floorplan_version: number;
    edit_climb_show_number: boolean;
    edit_climb_show_name: boolean;
    edit_climb_show_remarks: boolean;
    edit_climb_show_setter: boolean;
    edit_climb_show_position: boolean;
    edit_climb_show_expected_removal_at: boolean;
    vote_renewal: boolean;
    report_btn: boolean;
    rope_numbers: boolean;
    show_repeat_btns: boolean;
    boulders_grouped_by_wall: boolean;
    routes_grouped_by_wall: boolean;
    latitude: string;
    longitude: string;
    address: string;
    city: string;
    country: string;
    postal_code: string;
    url_website: string;
    url_facebook: string;
    opening_hours: OpeningHours;
    description: string;
    parking: string;
    nr_of_climbs: number;
    nr_of_routes: number;
    nr_of_boulders: number;
    nr_of_users: number;
    ask_community_grade: boolean;
    show_for_kids: boolean;
    label_new_days: number;
    label_removed_days: number;
    local_device_pwd: string;
    remarks_quick_add: string;
    tablets_on_manual: boolean;
    tablets_on: boolean;
    grading_system_routes: string;
    grading_system_boulders: string;
    grade_distribution_routes: unknown[];
    grade_distribution_boulders: GradeDistributionBoulder[];
    auto_grade: boolean;
    auto_grade_stable_votes: number;
    show_grade_stability_admin: boolean;
    show_zones: boolean;
    show_setter: boolean;
    renew: boolean;
    show_setter_popularity: boolean;
    reservations_enabled: boolean;
    reservations_guest_enabled: boolean;
    reservations_self_checkout_enabled: boolean;
    reservations_spots_per_booking: number;
    revervation_settings_json: string;
    reservations_book_advance_days: number;
    reservations_bookings_per_days_bookings: number;
    reservations_bookings_per_days_days: number;
    reservations_overbooking_count: number;
    reservations_cancel_advance_hours: number;
    reservations_unrestricted_last_minutes: number;
    reservations_bookings_advance_max: number;
    reservations_open_slots_at_midnight: boolean;
    reservations_open_slots_at_fixed_time: boolean;
    reservations_open_slots_at_time: Date;
    time_zone: string;
    serializer: string;
  }

  export interface GymMultiple {
    id: number;
    id_name: string;
    slug: string;
    name: string;
    name_short: string;
    live?: boolean;
    latitude?: string;
    longitude?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country: string;
    url_website?: string;
    url_facebook?: string;
    phone_number?: string;
    nr_of_climbs: number;
    nr_of_routes: number;
    nr_of_boulders: number;
    my_ascends_count: number;
    local_device_pwd: string;
    serializer: Serializer;
    scale_collapse_climbs?: string;
    scale_collapse_walls?: string;
    url_google_plus?: string;
  }

  export interface GymResource {
    id: number;
    gym_id: number;
    resource_type: ResourceType;
    url: string;
    order?: number;
  }

  export enum Serializer {
    List = "list",
  }

  export interface GradeDistributionBoulder {
    value: string;
    count: number;
  }

  export interface GymResource {
    id: number;
    gym_id: number;
    resource_type: ResourceType;
    url: string;
    order?: number;
  }

  export enum ResourceType {
    Impression = "impression",
    MainImpression = "main_impression",
  }

  export interface OpeningHours {
    version: number;
    items: Items;
    days: Days;
  }

  export interface Days {
    Monday: Day;
    Tuesday: Day;
    Wednesday: Day;
    Thursday: Day;
    Friday: Day;
    Saturday: Day;
    Sunday: Day;
  }

  export interface Day {
    closed: boolean;
    items: Items;
  }

  export interface Items {
    item1: string;
    item2: string;
    item3: null;
    item4: null;
  }

  export interface ClimbMultiple {
    id: number;
    name?: string;
    grade: string;
    wall_id?: number;
    position_x: string;
    position_y: string;
    remarks?: Remarks;
    climb_type: ClimbType;
    suitable_for_kids: boolean;
    gym_id: number;
    setter_id?: number;
    hold_id: number;
    live: boolean;
    lived: boolean;
    deleted: boolean;
    date_live_start?: Date;
    date_live_end?: Date;
    date_deleted?: Date;
    date_set?: Date;
    created_at: Date;
    nr_of_ascends: number;
    average_opinion: string;
    auto_grade: boolean;
    grade_stability: string;
    grade_stability_admin: string;
    zones?: number;
    renew: boolean;
    number?: string;
    date_removed?: Date;
  }

  export enum ClimbType {
    Boulder = "boulder",
    Route = "route",
  }

  export enum Remarks {
    Empty = "",
    JumpStart = "Jump start",
    JumpStartWithoutArete = "Jump start, Without arete",
    WithoutArete = "Without arete",
  }

  export interface AscendSingle {
    id: number;
    user_id: number;
    climb_id: number;
    topped: boolean;
    used: boolean;
    checks: number;
    date_logged: Date;
  }

  export interface GroupUserMultiple {
    id: number;
    user_id: number;
    group_id: number;
    approved: boolean;
    score_estimate: string;
    score_estimate_base: string;
    score: string;
    rank: number;
    deleted: boolean;
  }

  export interface User {
    id: number;
    uid: number;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    anonymous: boolean;
    gender: Gender;
  }

  export enum Gender {
    Female = "female",
    Male = "male",
    Other = "other",
  }

  export interface Hold {
    id: number;
    gym_id: number;
    color?: string;
    brand: string;
    order?: number;
  }
}

const getCompClimbs = async (comp: Comp) => {
  const poules = await TopLoggerGraphQL.find<CompPoule>({
    compId: comp.id,
    __typename: "CompPoule",
  }).toArray();

  const rounds = await TopLoggerGraphQL.find<CompRound>({
    compPouleId: { $in: poules.map(({ id }) => id) },
    __typename: "CompRound",
  }).toArray();

  const compRoundClimbs = await TopLoggerGraphQL.find<CompRoundClimb>({
    compRoundId: { $in: rounds.map(({ id }) => id) },
    __typename: "CompRoundClimb",
  }).toArray();

  const climbs = await TopLoggerGraphQL.find<Climb>({
    id: { $in: compRoundClimbs.map(({ climbId }) => climbId) },
    __typename: "Climb",
  }).toArray();

  return climbs;
};

export async function getIoTopLoggerCompEvent(compId: string, ioId: string) {
  const compUser = await TopLoggerGraphQL.findOne<CompUser>({
    compId,
    userId: ioId,
    __typename: "CompUser",
  });

  if (!compUser) throw new Error("CompUser not found");

  const comp = await TopLoggerGraphQL.findOne<Comp>({
    id: compUser.compId,
    __typename: "Comp",
  });

  if (!comp) throw new Error("Comp not found");

  const compGyms = await Promise.all(
    comp.compGyms.map((compGym) =>
      dereferenceReference<"CompGym", CompGym>(compGym),
    ),
  );

  const gyms = await Promise.all(
    compGyms.map((compGym) => dereferenceReference<"Gym", Gym>(compGym.gym)),
  );

  const compInterval: DateInterval = {
    start: comp.loggableStartAt,
    end: comp.loggableEndAt,
  };

  const climbs = await getCompClimbs(comp);

  const io = compUser;
  if (!io) throw new Error("io not found");

  const ioClimbLogs = await TopLoggerGraphQL.find<ClimbLog>({
    __typename: "ClimbLog",
    userId: ioId,
    climbId: { $in: climbs.map(({ id }) => id) },
    climbedAtDate: { $gt: new Date(0) },
  }).toArray();

  let firstClimbLog: Date | null = null;
  let lastClimbLog: Date | null = null;
  for (const climbLog of ioClimbLogs || []) {
    const date = climbLog.climbedAtDate;
    if (!date) continue;
    if (!firstClimbLog || isBefore(date, firstClimbLog)) firstClimbLog = date;
    if (!lastClimbLog || isAfter(date, lastClimbLog)) lastClimbLog = date;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const gym = gyms[0]!;

  const holdColors = await TopLoggerGraphQL.find<HoldColor>({
    __typename: "HoldColor",
  }).toArray();

  const r = {
    source: EventSource.TopLogger,
    discipline: "bouldering",
    type: "competition",
    id: compId,
    ioId,
    url: `https://app.toplogger.nu/en-us/${gym.nameSlug}/competitions/${compId}`,
    start: firstClimbLog || compInterval.start,
    end: isFuture(compInterval.end)
      ? compInterval.end
      : lastClimbLog || compInterval.end,
    venue: gyms.map((gym) => gym.name).join(", ") || null,
    location: gyms.map((gym) => gym.name).join(", ") || null,
    event: comp.name
      .replace("- Qualification", "")
      .replace("(Qualification)", "")
      .replace("(Mini-Comp)", "")
      .trim(),
    subEvent: comp.name.includes("- Qualification")
      ? "Qualification"
      : comp.name.includes("(Qualification)")
        ? "Qualification"
        : comp.name.includes("(Mini-Comp)")
          ? "Mini-Comp"
          : null,
    category: null, // TODO: Io poule names
    team: null,
    noParticipants: NaN,
    problems: climbs.length,
    problemByProblem: climbs
      .map((climb) => {
        const ioClimbLog = ioClimbLogs.find(
          (climbLog) => climbLog.climbId === climb.id,
        );

        return {
          number: climb.name || "",
          color:
            holdColors.find((holdColor) => holdColor.id === climb.holdColorId)
              ?.color || undefined,
          grade: climb.grade ? Number(climb.grade / 100) : undefined,
          attempt: ioClimbLog ? ioClimbLog.tickType == 0 : false,
          // TopLogger does not do zones, at least not for Beta Boulders
          zone: ioClimbLog ? ioClimbLog.tickType >= 1 : false,
          top: ioClimbLog ? ioClimbLog.tickType >= 1 : false,
          flash: ioClimbLog ? ioClimbLog.tickType >= 2 : false,
          repeat: false,
        };
      })
      .sort((a, b) =>
        Intl.Collator("en-DK", { numeric: true }).compare(
          a.number || "",
          b.number || "",
        ),
      ),
    // Left as an exercise for the reader
    scores: [] as Score[] /* ||
      getIoTopLoggerGroupScores(
        comp,
        io,
        groupUsers,
        participants,
        ascends,
        sex,
      )*/,
  } as const;

  return r;
}

/*
function getIoTopLoggerGroupScores(
  comp: Comp,
  io: CompUser,
  groupUsers: Omit<TopLogger.GroupUserMultiple, "user">[],
  participants: TopLogger.User[],
  ascends: TopLogger.AscendSingle[],
  sex?: boolean,
) {
  const topsByClimbId = ascends.reduce(
    (topMemo, { climb_id, user_id, checks }) => {
      if (groupUsers.some((user) => user.user_id === user_id) && checks) {
        topMemo.set(climb_id, (topMemo.get(climb_id) || 0) + 1);
      }
      return topMemo;
    },
    new Map<number, number>(),
  );

  const usersWithResults = groupUsers.map(({ user_id, score, rank }) => {
    const user = participants.find(({ id }) => id === user_id);
    let tdbScore = 0;
    let ptsScore = 0;

    const userAscends = ascends.filter((ascend) => ascend.user_id === user_id);
    for (const { climb_id, checks } of userAscends) {
      let problemTDBScore = TDB_BASE / (topsByClimbId.get(climb_id) || 0);

      if (checks) {
        ptsScore += PTS_SEND;
        if (checks >= 2) {
          ptsScore += PTS_FLASH_BONUS;
          problemTDBScore *= TDB_FLASH_MULTIPLIER;
        }
        tdbScore += problemTDBScore;
      }
    }

    return { user_id, user, score, rank, ptsScore, tdbScore } as const;
  });

  const ioResults =
    usersWithResults.find(({ user_id }) => user_id === io.id) ?? null;

  const noParticipants = participants.length || NaN;

  const scores: Score[] = [];
  if (ioResults && isPast(comp.loggableStartAt)) {
    const ioRank =
      Array.from(usersWithResults)
        .filter(({ user }) => (sex ? user?.gender === io.gender : true))
        .sort((a, b) => Number(b.score) - Number(a.score))
        .findIndex(({ user_id }) => user_id === io.id) + 1;

    if (comp.score_system === "points") {
      scores.push({
        system: SCORING_SYSTEM.POINTS,
        source: SCORING_SOURCE.OFFICIAL,
        rank: ioRank,
        percentile: percentile(ioRank, noParticipants),
        points: Number(ioResults.score),
      } satisfies PointsScore);
    }
    if (comp.score_system === "thousand_divide_by") {
      scores.push({
        system: SCORING_SYSTEM.THOUSAND_DIVIDE_BY,
        source: SCORING_SOURCE.OFFICIAL,
        rank: ioRank,
        percentile: percentile(ioRank, noParticipants),
        points: Number(ioResults.score),
      } satisfies ThousandDivideByScore);
    }
  }

  return scores;
}
*/
export async function getTopLoggerCompEventEntry(
  compId: string,
  userId: string,
): Promise<EventEntry> {
  const compUser = await TopLoggerGraphQL.findOne<CompUser>({
    compId,
    userId,
    __typename: "CompUser",
  });

  if (!compUser) throw new Error("CompUser not found");

  const comp = await TopLoggerGraphQL.findOne<Comp>({
    id: compUser.compId,
    __typename: "Comp",
  });

  if (!comp) throw new Error("Comp not found");

  const compGyms = await Promise.all(
    comp.compGyms.map((compGym) =>
      dereferenceReference<"CompGym", CompGym>(compGym),
    ),
  );

  const gyms = await Promise.all(
    compGyms.map((compGym) => dereferenceReference<"Gym", Gym>(compGym.gym)),
  );

  return {
    source: EventSource.TopLogger,
    type: "competition",
    discipline: "bouldering",
    id: compUser.compId,
    venue: gyms.map((gym) => gym.name).join(", ") || null,
    location: gyms.map((gym) => gym.name).join(", ") || null,
    event: comp.name
      .replace("- Qualification", "")
      .replace("(Qualification)", "")
      .trim(),
    subEvent: null,
    ioId: userId,
    start: comp.loggableStartAt,
    end: comp.loggableEndAt,
  } as const;
}
