import { dbFetch } from "../fetch";

export namespace Fitocracy {
  export interface ActivityHistoryItem {
    count: number;
    id: number;
    name: string;
  }

  export interface ActionSet {
    actions: ActionElement[];
    date: Date;
    id: Date;
  }

  export interface ActionElement {
    action: ActionAction;
    action_group_id: number;
    actiondate: Date;
    actiontime: Date;
    allow_share: boolean;
    api_id: string;
    api_source: string;
    effort0: number;
    effort0_imperial: number;
    effort0_imperial_string: string;
    effort0_imperial_unit: EffortUnit;
    effort0_metric: number;
    effort0_metric_string: string;
    effort0_metric_unit: EffortUnit;
    effort0_string: string;
    effort0_unit: EffortUnit;
    effort1: number;
    effort1_imperial: number;
    effort1_imperial_string: Effort1String;
    effort1_imperial_unit: EffortUnit;
    effort1_metric: number;
    effort1_metric_string: Effort1String;
    effort1_metric_unit: EffortUnit;
    effort1_string: Effort1String;
    effort1_unit: EffortUnit;
    effort2: null;
    effort2_imperial: null;
    effort2_imperial_string: null;
    effort2_imperial_unit: null;
    effort2_metric: null;
    effort2_metric_string: null;
    effort2_metric_unit: null;
    effort2_string: null;
    effort2_unit: null;
    effort3: null;
    effort3_imperial: null;
    effort3_imperial_string: null;
    effort3_imperial_unit: null;
    effort3_metric: null;
    effort3_metric_string: null;
    effort3_metric_unit: null;
    effort3_string: null;
    effort3_unit: null;
    effort4: null;
    effort4_imperial: null;
    effort4_imperial_string: null;
    effort4_imperial_unit: null;
    effort4_metric: null;
    effort4_metric_string: null;
    effort4_metric_unit: null;
    effort4_string: null;
    effort4_unit: null;
    effort5: null;
    effort5_imperial: null;
    effort5_imperial_string: null;
    effort5_imperial_unit: null;
    effort5_metric: null;
    effort5_metric_string: null;
    effort5_metric_unit: null;
    effort5_string: null;
    effort5_unit: null;
    id: number;
    is_pr: boolean;
    notes: Notes;
    points: number;
    string: string;
    string_imperial: string;
    string_metric: string;
    subgroup: number;
    subgroup_order: number;
    submitted: boolean;
    user: User;
  }

  export interface ActionAction {
    actiontype: number;
    description: string;
    effort0: boolean;
    effort0_label: Effort0Label;
    effort1: boolean;
    effort1_label: Effort1Label;
    effort2: boolean;
    effort2_label: string;
    effort3: boolean;
    effort3_label: string;
    effort4: boolean;
    effort4_label: string;
    effort5: boolean;
    effort5_label: string;
    id: number;
    multiplier: number;
    name: Name;
    set_name: SetName;
  }

  export enum Effort0Label {
    Weight = "Weight",
  }

  export enum Effort1Label {
    Kilograms = "Kilograms",
    Pounds = "Pounds",
    Reps = "Reps",
  }

  export enum Name {
    BarbellBenchPress = "Barbell Bench Press",
  }

  export enum SetName {
    Set = "Set",
  }

  export interface EffortUnit {
    abbr: Abbr;
    id: number;
    name: Effort1Label;
  }

  export enum Abbr {
    Kg = "kg",
    LB = "lb",
    Reps = "reps",
  }

  export enum Effort1String {
    The10Reps = "10 reps",
    The11Reps = "11 reps",
    The12Reps = "12 reps",
    The14Reps = "14 reps",
    The15Reps = "15 reps",
    The16Reps = "16 reps",
    The18Reps = "18 reps",
    The1Reps = "1 reps",
    The20Reps = "20 reps",
    The21Reps = "21 reps",
    The24Reps = "24 reps",
    The2Reps = "2 reps",
    The3Reps = "3 reps",
    The40Reps = "40 reps",
    The4Reps = "4 reps",
    The5Reps = "5 reps",
    The6Reps = "6 reps",
    The7Reps = "7 reps",
    The8Reps = "8 reps",
    The9Reps = "9 reps",
  }

  export enum Notes {
    Empty = "",
    ISuck = "i suck",
    TheStruggleIsReal = "the struggle is real ",
    Weaksauce = "weaksauce ",
  }

  export interface User {
    hero: boolean;
    id: number;
    imperial: boolean;
    info: string;
    level: number;
    pic: Pic;
    points: number;
    title: null;
    username: Username;
  }

  export enum Pic {
    UserImagesProfile52845584Ac3169Ebea7Ea3B5691E40Eb6F010AJpg = "user_images/profile/528455/84ac3169ebea7ea3b5691e40eb6f010a.jpg",
  }

  export enum Username {
    DRThrax = "DrThrax",
  }
}

export const IO_FITOCRACY_ID = 528455;

const fetchFitocracy = async <T>(
  input: string | URL,
  init?: RequestInit,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  dbFetch<T>(`https://www.fitocracy.com${String(input)}`, init, dbFetchOptions);

const getUserActivities = (
  userId: number,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchFitocracy<Fitocracy.ActivityHistoryItem[]>(
    `/get_user_activities/${userId}/`,
    {
      headers: process.env.FITOCRACY_SESSION_ID
        ? { cookie: `sessionid=${process.env.FITOCRACY_SESSION_ID};` }
        : undefined,
    },
    dbFetchOptions
  );

const getActivityHistory = (
  activityId: number,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  fetchFitocracy<Fitocracy.ActionSet[]>(
    `/_get_activity_history_json/?activity-id=${activityId}`,
    {
      headers: process.env.FITOCRACY_SESSION_ID
        ? { cookie: `sessionid=${process.env.FITOCRACY_SESSION_ID};` }
        : undefined,
    },
    dbFetchOptions
  );

export const getUserActivityLogs = async (
  userId: number,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  (
    await Promise.all(
      (
        await getUserActivities(userId, dbFetchOptions)
      ).map((activity) => getActivityHistory(activity.id, dbFetchOptions))
    )
  ).flat();
