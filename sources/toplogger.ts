import DataLoader from "dataloader";
import {
  Interval,
  addHours,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  isWithinInterval,
  subHours,
} from "date-fns";
import dbConnect from "../dbConnect";
import { dbFetch } from "../fetch";
import {
  EventEntry,
  PointsScore,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  Score,
  ThousandDivideByScore,
} from "../lib";
import { User } from "../models/user";
import { RelativeURL, percentile } from "../utils";

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

const fetchTopLogger = async <T>(
  input: string | URL,
  init?: RequestInit | null,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => dbFetch<T>(new URL(input, "https://api.toplogger.nu/"), init, dbOptions);

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

export const getGroup = (
  id: number,
  dbOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchTopLogger<TopLogger.GroupSingle>(
    `/v1/groups/${id}.json`,
    null,
    dbOptions
  );
const fetchGyms = (
  jsonParams?: JSONParams,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new RelativeURL(`/v1/gyms.json`);
  if (jsonParams) {
    url.searchParams.set("json_params", JSON.stringify(jsonParams));
  }

  return fetchTopLogger<TopLogger.GymMultiple[]>(url, undefined, dbOptions);
};
export const gymLoader = new DataLoader(
  (ids: number[]) =>
    fetchGyms({ filters: { id: ids } }).then((items) =>
      ids.map((id) => items.find((item) => item.id === id) || null)
    ),
  { cache: false }
);

const getGymClimbs = (
  gymId: number,
  jsonParams?: JSONParams,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new RelativeURL(`/v1/gyms/${gymId}/climbs.json`);
  if (jsonParams) {
    url.searchParams.set("json_params", JSON.stringify(jsonParams));
  }

  return fetchTopLogger<TopLogger.ClimbMultiple[]>(url, null, dbOptions);
};

export const getGymHolds = (
  gymId: number,
  jsonParams?: JSONParams,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new RelativeURL(`/v1/gyms/${gymId}/holds.json`);
  if (jsonParams) {
    url.searchParams.set("json_params", JSON.stringify(jsonParams));
  }

  return fetchTopLogger<TopLogger.Hold[]>(url, null, dbOptions);
};
export const getGymHold = (
  gymId: number,
  holdId: number,
  jsonParams?: JSONParams,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new RelativeURL(`/v1/gyms/${gymId}/holds/${holdId}.json`);
  if (jsonParams) {
    url.searchParams.set("json_params", JSON.stringify(jsonParams));
  }

  return fetchTopLogger<TopLogger.Hold>(url, null, dbOptions);
};

const gymClimbByIdLoadersByGym: Record<
  number,
  DataLoader<number, TopLogger.ClimbMultiple | null, number>
> = {};

export const getGymClimbById = (
  gymId: number,
  climbId: number,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) => {
  let gymClimbByIdLoader = gymClimbByIdLoadersByGym[gymId];
  if (!gymClimbByIdLoader) {
    gymClimbByIdLoader = new DataLoader(
      (ids: number[]) =>
        getGymClimbs(gymId, { filters: { id: ids } }, dbFetchOptions).then(
          (items) =>
            ids.map((id) => items.find((item) => item.id === id) || null)
        ),
      { cache: false }
    );
    gymClimbByIdLoadersByGym[gymId] = gymClimbByIdLoader;
  }
  return gymClimbByIdLoader.load(climbId);
};

export const getUser = (
  id: number,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => fetchTopLogger<TopLogger.User>(`/v1/users/${id}.json`, null, dbOptions);
export const getAscends = (
  jsonParams?: JSONParams,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new RelativeURL(`/v1/ascends.json`);
  url.searchParams.set("serialize_checks", "true");
  if (jsonParams) {
    url.searchParams.set("json_params", JSON.stringify(jsonParams));
  }

  return fetchTopLogger<TopLogger.AscendSingle[]>(url, null, dbOptions);
};
export const getGroupsUsers = <T = TopLogger.GroupUserMultiple>(
  jsonParams?: JSONParams,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new RelativeURL("/v1/group_users.json");
  url.searchParams.set("serializeall", "false");
  if (jsonParams) {
    url.searchParams.set("json_params", JSON.stringify(jsonParams));
  }

  return fetchTopLogger<T[]>(url, null, dbOptions);
};

export const getGymGymGroups = (
  gymId: number,
  jsonParams?: JSONParams,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new RelativeURL(`/v1/gyms/${gymId}/gym_groups.json`);
  url.searchParams.set("serializeall", "false");

  url.searchParams.set(
    "json_params",
    JSON.stringify({ deleted: false, live: true, ...jsonParams })
  );

  return fetchTopLogger<TopLogger.GymGroup[]>(url, null, dbOptions);
};

export const getGroupClimbs = async (
  group: TopLogger.GroupSingle,
  dbOptions?: Parameters<typeof dbFetch>[2]
) => {
  const gyms = (
    await gymLoader.loadMany(group.gym_groups.map(({ gym_id }) => gym_id))
  ).filter((gym): gym is TopLogger.GymMultiple =>
    Boolean(gym && !(gym instanceof Error))
  );

  if (group.climb_groups.length) {
    const climbPromises: Promise<TopLogger.ClimbMultiple | null>[] = [];

    for (const { climb_id } of group.climb_groups) {
      for (const gym of gyms) {
        climbPromises.push(getGymClimbById(gym.id, climb_id, dbOptions));
      }
    }

    return (await Promise.all(climbPromises)).filter(Boolean);
  }

  const climbs: TopLogger.ClimbMultiple[] = [];
  for (const gym of gyms) {
    for (const climb of await getGymClimbs(gym.id, undefined, dbOptions)) {
      if (
        (climb.name || climb.number) &&
        climb.date_live_start &&
        isWithinInterval(new Date(climb.date_live_start), {
          start: subHours(new Date(group.date_loggable_start), 16),
          end: addHours(new Date(group.date_loggable_end), 21),
        })
      ) {
        climbs.push(climb);
      }
    }
  }

  return climbs;
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
  const DB = (await dbConnect()).connection.db;

  const group = await DB.collection<TopLogger.GroupSingle>(
    "toplogger_groups"
  ).findOne({ id: groupId });
  if (!group) throw new Error("Group not found");

  const groupInterval: Interval = {
    start: group.date_loggable_start,
    end: group.date_loggable_end,
  } as const;

  const gyms = (
    await Promise.all(
      group.gym_groups.map(({ gym_id }) => gymLoader.load(gym_id))
    )
  ).filter(Boolean);

  let climbs: TopLogger.ClimbMultiple[] = [];
  if (group.climb_groups.length) {
    climbs = await DB.collection<TopLogger.ClimbMultiple>("toplogger_climbs")
      .find({ id: { $in: group.climb_groups.map(({ climb_id }) => climb_id) } })
      .toArray();
  } else {
    for (const { gym_id } of group.gym_groups) {
      for (const climb of await DB.collection<TopLogger.ClimbMultiple>(
        "toplogger_climbs"
      )
        .find({ gym_id })
        .toArray()) {
        if (
          (climb.name || climb.number) &&
          climb.date_live_start &&
          isWithinInterval(climb.date_live_start, {
            start: subHours(group.date_loggable_start, 16),
            end: addHours(group.date_loggable_end, 21),
          })
        ) {
          climbs.push(climb);
        }
      }
    }
  }

  const io = await DB.collection<TopLogger.User>("toplogger_users").findOne({
    id: ioId,
  });

  if (!io) throw new Error("io not found");

  const groupUsers = await DB.collection<
    Omit<TopLogger.GroupUserMultiple, "user">
  >("toplogger_group_users")
    .find({ group_id: groupId })
    .toArray();

  const ascends = (
    await DB.collection<TopLogger.AscendSingle>("toplogger_ascends")
      .find({
        user_id: { $in: groupUsers.map(({ user_id }) => user_id) },
        climb_id: { $in: climbs.map(({ id }) => id) },
      })
      .toArray()
  ).filter(
    (ascend) =>
      ascend.date_logged &&
      isWithinInterval(ascend.date_logged, groupInterval) &&
      climbs.some((climb) => ascend.climb_id === climb.id)
  );

  const ioAscends = climbs.length
    ? ascends.filter((ascend) => ascend.user_id === ioId)
    : (
        await DB.collection<TopLogger.AscendSingle>("toplogger_ascends")
          .find({ user_id: ioId })
          .toArray()
      ).filter(
        (ascend) =>
          ascend.date_logged &&
          isWithinInterval(ascend.date_logged, groupInterval)
      );

  let firstAscend: Date | null = null;
  let lastAscend: Date | null = null;
  for (const ascend of ioAscends || []) {
    const date = ascend.date_logged;
    if (!date) continue;
    if (!firstAscend || isBefore(date, firstAscend)) firstAscend = date;
    if (!lastAscend || isAfter(date, lastAscend)) lastAscend = date;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const gym = gyms[0]!;

  const holds = await DB.collection<TopLogger.Hold>("toplogger_holds")
    .find({ gym_id: { $in: climbs.map(({ gym_id }) => gym_id) } })
    .toArray();

  return {
    source,
    discipline,
    type: "competition",
    id: groupId,
    ioId,
    url: `https://app.toplogger.nu/en-us/${gym.slug}/comp/${groupId}/details`,
    start: firstAscend || new Date(groupInterval.start),
    end: isFuture(new Date(groupInterval.end))
      ? new Date(groupInterval.end)
      : lastAscend || new Date(groupInterval.end),
    venue: gym.name.trim(),
    location: gym.address,
    event: group.name
      .replace("- Qualification", "")
      .replace("(Qualification)", "")
      .replace("(Mini-Comp)", "")
      .trim(),
    subEvent: group.name.includes("- Qualification")
      ? "Qualification"
      : group.name.includes("(Qualification)")
      ? "Qualification"
      : group.name.includes("(Mini-Comp)")
      ? "Mini-Comp"
      : null,
    category: sex ? io.gender : null,
    team: null,
    noParticipants:
      (await DB.collection<TopLogger.User>("toplogger_users").countDocuments({
        id: { $in: groupUsers.map(({ user_id }) => user_id) },
        gender: sex ? io.gender : undefined,
      })) || NaN,
    problems: climbs.length,
    problemByProblem: climbs
      .map((climb) => {
        const ioAscend = ioAscends.find(
          (ascend) => ascend.climb_id === climb.id
        );

        return {
          number: climb.number || climb.name || "",
          color:
            holds.find((hold) => hold.id === climb.hold_id)?.color || undefined,
          grade:
            climb.grade && Number(climb.grade_stability) > 0
              ? Number(climb.grade)
              : undefined,
          attempt: true,
          // TopLogger does not do zones, at least not for Beta Boulders
          zone: ioAscend ? ioAscend.checks >= 1 : false,
          top: ioAscend ? ioAscend.checks >= 1 : false,
          flash: ioAscend ? ioAscend.checks >= 2 : false,
        };
      })
      .sort((a, b) =>
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
  const DB = (await dbConnect()).connection.db;

  const group = await DB.collection<TopLogger.GroupSingle>(
    "toplogger_groups"
  ).findOne({ id: groupId });
  if (!group) throw new Error("Group not found");
  const groupInterval: Interval = {
    start: group.date_loggable_start,
    end: group.date_loggable_end,
  } as const;

  let climbs: TopLogger.ClimbMultiple[] = [];
  if (group.climb_groups.length) {
    climbs = await DB.collection<TopLogger.ClimbMultiple>("toplogger_climbs")
      .find({ id: { $in: group.climb_groups.map(({ climb_id }) => climb_id) } })
      .toArray();
  } else {
    for (const { gym_id } of group.gym_groups) {
      for (const climb of await DB.collection<TopLogger.ClimbMultiple>(
        "toplogger_climbs"
      )
        .find({ gym_id })
        .toArray()) {
        if (
          (climb.name || climb.number) &&
          climb.date_live_start &&
          isWithinInterval(climb.date_live_start, {
            start: subHours(group.date_loggable_start, 16),
            end: addHours(group.date_loggable_end, 21),
          })
        ) {
          climbs.push(climb);
        }
      }
    }
  }

  const io = await DB.collection<TopLogger.User>("toplogger_users").findOne({
    id: ioId,
  });

  if (!io) throw new Error("io not found");

  const groupUsers = await DB.collection<
    Omit<TopLogger.GroupUserMultiple, "user">
  >("toplogger_group_users")
    .find({ group_id: groupId })
    .toArray();

  const ascends = (
    await Promise.all(
      groupUsers.map(({ user_id }) =>
        climbs.length
          ? DB.collection<TopLogger.AscendSingle>("toplogger_ascends")
              .find({ user_id, climb_id: { $in: climbs.map(({ id }) => id) } })
              .toArray()
          : []
      )
    )
  )
    .flat()
    .filter(
      ({ climb_id, date_logged }) =>
        date_logged &&
        isWithinInterval(date_logged, groupInterval) &&
        climbs.some(({ id }) => climb_id === id)
    );

  const topsByClimbId = ascends.reduce(
    (topMemo, { climb_id, user_id, checks }) => {
      if (groupUsers.some((user) => user.user_id === user_id) && checks) {
        topMemo.set(climb_id, (topMemo.get(climb_id) || 0) + 1);
      }
      return topMemo;
    },
    new Map<number, number>()
  );

  const usersWithResults = await Promise.all(
    groupUsers.map(async ({ user_id, score, rank }) => {
      const user = await DB.collection<TopLogger.User>(
        "toplogger_users"
      ).findOne({ id: user_id });
      let tdbScore = 0;
      let ptsScore = 0;

      const userAscends = ascends.filter(
        (ascend) => ascend.user_id === user_id
      );
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
    })
  );

  const ioResults =
    usersWithResults.find(({ user_id }) => user_id === ioId) ?? null;

  const scores: Score[] = [];
  if (ioResults && isPast(groupInterval.start)) {
    const noClimbers =
      (await DB.collection<TopLogger.User>("toplogger_users").countDocuments({
        id: { $in: groupUsers.map(({ user_id }) => user_id) },
        gender: sex ? io.gender : undefined,
      })) || NaN;

    const ioRank =
      Array.from(usersWithResults)
        .filter(({ user }) => (sex ? user?.gender === io.gender : true))
        .sort((a, b) => Number(b.score) - Number(a.score))
        .findIndex(({ user_id }) => user_id === ioId) + 1;

    if (group.score_system === "points") {
      scores.push({
        system: SCORING_SYSTEM.POINTS,
        source: SCORING_SOURCE.OFFICIAL,
        rank: ioRank,
        percentile: percentile(ioRank, noClimbers),
        points: Number(ioResults.score),
      } satisfies PointsScore);
    }
    if (group.score_system === "thousand_divide_by") {
      scores.push({
        system: SCORING_SYSTEM.THOUSAND_DIVIDE_BY,
        source: SCORING_SOURCE.OFFICIAL,
        rank: ioRank,
        percentile: percentile(ioRank, noClimbers),
        points: Number(ioResults.score),
      } satisfies ThousandDivideByScore);
    }
    // If the group has climbs explicitly associated, we can calculate derived scores
    // in other scoring systems. These disappear on old competitions, so we can't
    // use them for all past events regrettably.
    if (group.climb_groups.length) {
      if (ioResults.tdbScore) {
        const ioTDBRank =
          Array.from(usersWithResults)
            .filter(({ user }) => (sex ? user?.gender === io.gender : true))
            .sort((a, b) => b.tdbScore - a.tdbScore)
            .findIndex(({ user_id }) => user_id === ioId) + 1;
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
            .filter(({ user }) => (sex ? user?.gender === io.gender : true))
            .sort((a, b) => b.ptsScore - a.ptsScore)
            .findIndex(({ user_id }) => user_id === ioId) + 1;
        scores.push({
          system: SCORING_SYSTEM.POINTS,
          source: SCORING_SOURCE.DERIVED,
          rank: ioPointsRank,
          percentile: percentile(ioPointsRank, noClimbers),
          points: ioResults.ptsScore,
        } satisfies PointsScore);
      }
    }
  }

  return scores;
}

export async function getTopLoggerGroupEventEntry(
  groupId: number,
  userId: number
): Promise<EventEntry> {
  const DB = (await dbConnect()).connection.db;

  const group = await DB.collection<TopLogger.GroupSingle>(
    "toplogger_groups"
  ).findOne({ id: groupId });
  if (!group) throw new Error("Group not found");

  const gyms = await DB.collection<TopLogger.GymSingle>("toplogger_gyms")
    .find({ id: { $in: group.gym_groups.map(({ gym_id }) => gym_id) } })
    .toArray();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const gym = gyms[0]!;

  return {
    source,
    type: "competition",
    discipline,
    id: groupId,
    venue: gym.name.trim(),
    location: gym.address || null,
    event: group.name
      .replace("- Qualification", "")
      .replace("(Qualification)", "")
      .trim(),
    subEvent: null,
    ioId: userId,
    start: group.date_loggable_start,
    end: group.date_loggable_end,
  } as const;
}

const source = "toplogger";
const type = "training";
const discipline = "bouldering";
export const getBoulderingTrainingData = async (trainingInterval: Interval) => {
  const DB = (await dbConnect()).connection.db;

  // Io is the only user in the database,
  const user = (await User.findOne())!;
  const topLoggerId = user.topLoggerId!;

  const ascends = (
    await DB.collection<TopLogger.AscendSingle>("toplogger_ascends")
      .find({ user_id: topLoggerId })
      .toArray()
  ).filter(
    (ascend) =>
      ascend.date_logged &&
      isWithinInterval(ascend.date_logged, trainingInterval)
  );

  const holds = await DB.collection<TopLogger.Hold>("toplogger_holds")
    .find()
    .toArray();

  let problemByProblem = await Promise.all(
    ascends.map(async ({ climb_id, checks }) => {
      const climb = await DB.collection<TopLogger.ClimbMultiple>(
        "toplogger_climbs"
      ).findOne({ id: climb_id });

      return {
        number: "",
        color:
          (climb && holds.find((hold) => hold.id === climb.hold_id)?.color) ||
          undefined,
        grade: (climb && Number(climb.grade)) || undefined,
        attempt: true,
        // TopLogger does not do zones, at least not for Beta Boulders
        zone: checks >= 1,
        top: checks >= 1,
        flash: checks >= 2,
      };
    })
  );
  const grades = Array.from(
    problemByProblem.reduce((set, { grade }) => {
      if (grade) set.add(grade);
      return set;
    }, new Set<number>())
  )
    .sort()
    .reverse();

  problemByProblem = problemByProblem
    .sort((a, b) => {
      const gradeA = a.grade || 0;
      const gradeB = b.grade || 0;
      return gradeB - gradeA;
    })
    .filter(({ grade }) => {
      if (grade) return grades.includes(grade);
    })
    .slice(0, 15);

  const count = ascends.length;

  return { source, type, discipline, count, problemByProblem } as const;
};
