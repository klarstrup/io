import DataLoader from "dataloader";
import {
  Interval,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { dbFetch } from "../fetch";
import {
  PointsScore,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  Score,
  ThousandDivideByScore,
} from "../lib";
import { percentile } from "../utils";

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
    bonus_percent_fl: string;
    bonus_percent_os: number;
  }

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
    gym_resources: GymResource[];
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
    gym_resources: GymResource[];
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
  }

  export enum Remarks {
    Empty = "",
    JumpStart = "Jump start",
    JumpStartWithoutArete = "Jump start, Without arete",
    WithoutArete = "Without arete",
  }

  export interface UserSingle {
    id: number;
    uid: number;
    first_name: string;
    last_name: string;
    avatar: string;
    anonymous: boolean;
    gender: Gender;
    score_count_gym: number;
    score_count_gym_routes: number;
    score_count_gym_boulders: number;
    score_grade_routes: string;
    score_grade_routes_count: number;
    score_grade_boulders: string;
    score_grade_boulders_count: number;
  }

  export interface AscendSingle {
    id: number;
    user_id: number;
    climb_id: number;
    topped: boolean;
    used: boolean;
    checks: number;
    date_logged?: Date;
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
    user: User;
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

  export interface HoldMultiple {
    id: number;
    gym_id: number;
    color: string;
    brand: string;
    order?: number;
  }
}

export const IO_TOPLOGGER_ID = 176390;

const fetchTopLogger = async <T>(
  input: string | URL,
  init?: RequestInit,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  dbFetch<T>(`https://api.toplogger.nu${String(input)}`, init, dbFetchOptions);

interface JSONParams {
  filters?: Record<
    string,
    | boolean
    | string
    | string[]
    | number
    | number[]
    | undefined
    | Record<
        string,
        boolean | string | string[] | number | number[] | undefined
      >
  >;
  includes?: string | string[];
}
const encodeJSONParams = (jsonParams: JSONParams = {}) =>
  encodeURI(JSON.stringify(jsonParams));

const getGroup = (id: number) =>
  fetchTopLogger<TopLogger.GroupSingle>(`/v1/groups/${id}.json`);
const fetchGyms = (
  jsonParams: JSONParams = {},
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchTopLogger<TopLogger.GymMultiple[]>(
    `/v1/gyms.json?json_params=${encodeJSONParams(jsonParams)}`,
    undefined,
    dbFetchOptions
  );
const gymLoader = new DataLoader(
  (ids: number[]) =>
    fetchGyms({ filters: { id: ids } }).then((items) =>
      ids.map((id) => items.find((item) => item.id === id) || null)
    ),
  { cache: false }
);

const getGymClimbs = (
  gymId: number,
  jsonParams: JSONParams = {},
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchTopLogger<TopLogger.ClimbMultiple[]>(
    `/v1/gyms/${gymId}/climbs.json?json_params=${encodeJSONParams(jsonParams)}`,
    undefined,
    dbFetchOptions
  );

export const getGymHolds = (
  gymId: number,
  jsonParams: JSONParams = {},
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchTopLogger<TopLogger.HoldMultiple[]>(
    `/v1/gyms/${gymId}/holds.json?json_params=${encodeJSONParams(jsonParams)}`,
    undefined,
    dbFetchOptions
  );
export const getGymHold = (
  gymId: number,
  holdId: number,
  jsonParams: JSONParams = {},
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchTopLogger<TopLogger.HoldMultiple>(
    `/v1/gyms/${gymId}/holds/${holdId}.json?json_params=${encodeJSONParams(
      jsonParams
    )}`,
    undefined,
    dbFetchOptions
  );

const gymClimbByIdLoadersByGym: Record<
  number,
  DataLoader<number, TopLogger.ClimbMultiple | null, number>
> = {};

export const getGymClimbById = (gymId: number, climbId: number) => {
  if (!gymClimbByIdLoadersByGym[gymId]) {
    gymClimbByIdLoadersByGym[gymId] = new DataLoader(
      (ids: number[]) =>
        getGymClimbs(gymId, { filters: { id: ids } }).then((items) =>
          ids.map((id) => items.find((item) => item.id === id) || null)
        ),
      { cache: false }
    );
  }
  return gymClimbByIdLoadersByGym[gymId].load(climbId);
};

const getUser = (id: number, dbFetchOptions?: Parameters<typeof dbFetch>[2]) =>
  fetchTopLogger<TopLogger.UserSingle>(
    `/v1/users/${id}.json`,
    undefined,
    dbFetchOptions
  );
export const getAscends = (
  jsonParams: JSONParams = {},
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchTopLogger<TopLogger.AscendSingle[]>(
    `/v1/ascends.json?json_params=${encodeJSONParams(
      jsonParams
    )}&serialize_checks=true`,
    undefined,
    dbFetchOptions
  );
export const getGroupsUsers = (
  jsonParams: JSONParams = {},
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchTopLogger<TopLogger.GroupUserMultiple[]>(
    `/v1/group_users.json?json_params=${encodeJSONParams(
      jsonParams
    )}&serializeall=false`,
    undefined,
    dbFetchOptions
  );
const getGroupClimbs = async (group: TopLogger.GroupSingle) => {
  const gyms = (
    await Promise.all(
      group.gym_groups.map(({ gym_id }) => gymLoader.load(gym_id))
    )
  ).filter(Boolean);

  return group.climb_groups.length
    ? (
        await Promise.all(
          group.climb_groups.map(({ climb_id }) =>
            Promise.all(gyms.map((gym) => getGymClimbById(gym.id, climb_id)))
          )
        )
      )
        .flat()
        .filter(Boolean)
    : (await Promise.all(gyms.map((gym) => getGymClimbs(gym.id))))
        .flat()
        .filter(
          (climb) =>
            (climb.name || climb.number) &&
            climb.date_live_start &&
            isWithinInterval(new Date(climb.date_live_start), {
              start: startOfDay(new Date(group.date_loggable_start)),
              end: new Date(group.date_loggable_end),
            })
        );
};

const TDB_BASE = 1000;
const TDB_FLASH_MULTIPLIER = 1.1;
const PTS_SEND = 100;
const PTS_FLASH_BONUS = 20;

export async function getIoTopLoggerGroupEvent(
  groupId: number,
  ioId: number,
  sex?: boolean
) {
  const group = await getGroup(groupId);
  const gyms = (
    await Promise.all(
      group.gym_groups.map(({ gym_id }) => gymLoader.load(gym_id))
    )
  ).filter(Boolean);
  const climbs = await getGroupClimbs(group);
  const groupInterval: Interval = {
    start: new Date(group.date_loggable_start),
    end: new Date(group.date_loggable_end),
  } as const;

  const io = await getUser(ioId);

  const groupUsers = await getGroupsUsers({
    filters: {
      group_id: groupId,
      user: sex ? { gender: io.gender } : undefined,
    },
    includes: "user",
  });

  const ascends = (
    await Promise.all(
      groupUsers.map(({ user_id }) =>
        climbs.length
          ? getAscends({
              filters: { user_id, climb_id: climbs.map((climb) => climb.id) },
            }).catch((error: unknown) => {
              if (
                error instanceof Object &&
                "errors" in error &&
                Array.isArray(error.errors) &&
                typeof error.errors[0] === "string" &&
                error.errors[0] === "Access denied."
              ) {
                // Some toplogger users have privacy enabled for their ascends
                return [];
              }

              throw error;
            })
          : []
      )
    )
  )
    .flat()
    .filter((ascend) => {
      const date = ascend.date_logged && new Date(ascend.date_logged);
      return (
        date &&
        isWithinInterval(date, groupInterval) &&
        climbs.some((climb) => ascend.climb_id === climb.id)
      );
    });

  const ioAscends = climbs.length
    ? ascends.filter((ascend) => ascend.user_id === ioId)
    : (
        await getAscends(
          { filters: { user_id: IO_TOPLOGGER_ID } },
          { maxAge: 86400 }
        )
      ).filter((ascend) => {
        const date = ascend.date_logged && new Date(ascend.date_logged);
        return date && isWithinInterval(date, groupInterval);
      });

  let firstAscend: Date | null = null;
  let lastAscend: Date | null = null;
  for (const ascend of ioAscends || []) {
    const date = ascend.date_logged && new Date(ascend.date_logged);
    if (!date) continue;
    if (!firstAscend || isBefore(date, firstAscend)) firstAscend = date;
    if (!lastAscend || isAfter(date, lastAscend)) lastAscend = date;
  }

  return {
    type: "competition",
    discipline: "bouldering",
    id: groupId,
    url: `https://app.toplogger.nu/en-us/${gyms[0].slug}/comp/${groupId}/details`,
    start: firstAscend || new Date(groupInterval.start),
    end: lastAscend || new Date(groupInterval.end),
    venue: gyms[0].name.trim(),
    location: gyms[0].address,
    event: group.name.trim().replace(" - Qualification", ""),
    category: sex ? io.gender : null,
    team: null,
    noParticipants: groupUsers.length || NaN,
    problems: climbs.length,
    problemByProblem: (
      await Promise.all(
        climbs.map(async (climb) => {
          const ioAscend = ioAscends.find(
            (ascend) => ascend.climb_id === climb.id
          );
          const hold = await getGymHold(climb.gym_id, climb.hold_id);
          return {
            number: climb.number || climb.name || "",
            color: hold.color || undefined,
            grade: climb.grade ? Number(climb.grade) : undefined,
            attempt: true,
            // TopLogger does not do zones, at least not for Beta Boulders
            zone: ioAscend ? ioAscend.checks >= 1 : false,
            top: ioAscend ? ioAscend.checks >= 1 : false,
            flash: ioAscend ? ioAscend.checks >= 2 : false,
          };
        })
      )
    ).sort((a, b) =>
      Intl.Collator("en-DK", { numeric: true }).compare(
        a.number || "",
        b.number || ""
      )
    ),
    scores: await getIoTopLoggerGroupScores(groupId, ioId, sex),
  } as const;
}

async function getIoTopLoggerGroupScores(
  groupId: number,
  ioId: number,
  sex?: boolean
) {
  const group = await getGroup(groupId);
  const climbs = await getGroupClimbs(group);
  const groupInterval: Interval = {
    start: new Date(group.date_loggable_start),
    end: new Date(group.date_loggable_end),
  } as const;

  const io = await getUser(ioId);

  const groupUsers = await getGroupsUsers({
    filters: {
      group_id: groupId,
      user: sex ? { gender: io.gender } : undefined,
    },
    includes: "user",
  });

  const ascends = (
    await Promise.all(
      groupUsers.map(({ user_id }) =>
        climbs.length
          ? getAscends({
              filters: { user_id, climb_id: climbs.map((climb) => climb.id) },
            }).catch((error: unknown) => {
              if (
                error instanceof Object &&
                "errors" in error &&
                Array.isArray(error.errors) &&
                typeof error.errors[0] === "string" &&
                error.errors[0] === "Access denied."
              ) {
                // Some toplogger users have privacy enabled for their ascends
                return [];
              }

              throw error;
            })
          : []
      )
    )
  )
    .flat()
    .filter((ascend) => {
      const date = ascend.date_logged && new Date(ascend.date_logged);
      return (
        date &&
        isWithinInterval(date, groupInterval) &&
        climbs.some((climb) => ascend.climb_id === climb.id)
      );
    });

  const topsByClimbId = ascends.reduce(
    (topMemo, { climb_id, user_id, checks }) => {
      if (groupUsers.some((user) => user.user_id === user_id)) {
        if (checks) topMemo.set(climb_id, (topMemo.get(climb_id) || 0) + 1);
      }
      return topMemo;
    },
    new Map<number, number>()
  );

  const usersWithResults = groupUsers.map(({ user, score, rank }) => {
    let tdbScore = 0;
    let ptsScore = 0;

    const userAscends = ascends.filter((ascend) => ascend.user_id === user.id);
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

    return { user, score, rank, ptsScore, tdbScore } as const;
  });

  const ioResults =
    usersWithResults.find(({ user }) => user.id === ioId) ?? null;

  const scores: Score[] = [];
  if (ioResults) {
    const noClimbers = groupUsers.length || NaN;

    if (group.score_system === "points") {
      scores.push({
        system: SCORING_SYSTEM.POINTS,
        source: SCORING_SOURCE.OFFICIAL,
        rank: ioResults.rank,
        percentile: percentile(ioResults.rank, noClimbers),
        points: Number(ioResults.score),
      } satisfies PointsScore);
    }
    if (group.score_system === "thousand_divide_by") {
      scores.push({
        system: SCORING_SYSTEM.THOUSAND_DIVIDE_BY,
        source: SCORING_SOURCE.OFFICIAL,
        rank: ioResults.rank,
        percentile: percentile(ioResults.rank, noClimbers),
        points: Number(ioResults.score),
      } satisfies ThousandDivideByScore);
    }
    if (ioResults.tdbScore) {
      const ioTDBRank =
        Array.from(usersWithResults)
          .sort((a, b) => b.tdbScore - a.tdbScore)
          .findIndex(({ user: { id } }) => id === ioId) + 1;
      scores.push({
        system: SCORING_SYSTEM.THOUSAND_DIVIDE_BY,
        source: SCORING_SOURCE.DERIVED,
        rank: ioTDBRank,
        percentile: percentile(ioTDBRank, noClimbers),
        points: Math.round(ioResults.tdbScore),
      } satisfies ThousandDivideByScore);
    }
    if (ioResults.ptsScore) {
      const ioPointsRank =
        Array.from(usersWithResults)
          .sort((a, b) => b.ptsScore - a.ptsScore)
          .findIndex(({ user: { id } }) => id === ioId) + 1;
      scores.push({
        system: SCORING_SYSTEM.POINTS,
        source: SCORING_SOURCE.DERIVED,
        rank: ioPointsRank,
        percentile: percentile(ioPointsRank, noClimbers),
        points: ioResults.ptsScore,
      } satisfies PointsScore);
    }
  }

  return scores;
}

const type = "training";
const discipline = "bouldering";
export const getBoulderingTrainingData = async (trainingInterval: Interval) => {
  const ascends = (
    (await getAscends(
      { filters: { user_id: IO_TOPLOGGER_ID }, includes: ["climb"] },
      { maxAge: 3600 }
    )) as (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[]
  ).filter((ascend) => {
    const date = ascend.date_logged && new Date(ascend.date_logged);
    return date && isWithinInterval(date, trainingInterval);
  });

  const problemByProblem = await Promise.all(
    ascends.map(async (ascend) => {
      const hold = await getGymHold(ascend.climb.gym_id, ascend.climb.hold_id);
      return {
        number: "",
        color: hold.color || undefined,
        grade: ascend.climb.grade ? Number(ascend.climb.grade) : undefined,
        attempt: true,
        // TopLogger does not do zones, at least not for Beta Boulders
        zone: ascend ? ascend.checks >= 1 : false,
        top: ascend ? ascend.checks >= 1 : false,
        flash: ascend ? ascend.checks >= 2 : false,
      };
    })
  );

  const count = ascends.length;

  return { type, discipline, count, problemByProblem } as const;
};
