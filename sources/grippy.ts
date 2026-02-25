import { isGrippyAuthTokens } from "../lib";
import { proxyCollection } from "../utils.server";

export namespace Grippy {
  export interface AuthTokens {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    refresh_token: string;
  }

  export interface WorkoutLogsResponse {
    metadata: Metadata;
    data: WorkoutLog[];
  }

  export interface WorkoutLog {
    uuid: string;
    workout: Workout;
    version: number;
    rating: number | null;
    effort: number;
    weight_added: number;
    weight_added_unit: string;
    start_time: Date;
    end_time: Date;
    completed: boolean;
    total_hang_time: number;
    with_motherboard: boolean;
    compliance: number;
    media: Media[];
  }

  export interface Media {
    uuid: string;
    url: string;
    creation_time: Date;
    capture_time: Date;
    download_url: string;
    processing_successful: null;
    type: string;
    width: number;
    height: number;
  }

  export interface Workout {
    name: string;
    equipment: Equipment[];
    cover_image_url: null;
    uuid: string;
    author: Author;
    content_summary: ContentSummary;
  }

  export interface Author {
    name: string;
    uuid: string;
    coach_uuid: string | null;
  }

  export interface ContentSummary {
    holds: Holds;
    fingers: Finger[];
    grip_types: GripType[];
  }

  export enum Finger {
    Four = "FOUR",
    Middle = "MIDDLE",
    ThreeB = "THREE_B",
    ThreeF = "THREE_F",
    TwoB = "TWO_B",
    TwoF = "TWO_F",
    TwoM = "TWO_M",
  }

  export enum GripType {
    Halfcrimp = "HALFCRIMP",
    Jug = "JUG",
    Open = "OPEN",
  }

  export interface Holds {
    LH: HoldClass | null;
    RH: HoldClass | null;
  }

  export interface HoldClass {
    BEAST1K?: number;
    BEAST2K?: number;
  }

  export interface Metadata {
    count: number;
    next: null;
    previous: null;
  }

  export type FingersFrequency = Record<Finger, number>;

  export interface Set {
    start_time: Date | null;
    end_time: Date | null;
    completed: boolean;
    reps: Rep[];
  }

  export interface Rep {
    start_time: Date;
    end_time: Date;
    success: boolean;
  }

  export interface TimeLog {
    type: Type;
    success?: boolean;
    end_time: Date;
    start_time: Date;
    set: number;
  }

  export enum Type {
    Rep = "rep",
    RepREST = "rep_rest",
  }

  export interface WorkoutLogDetails {
    uuid: string;
    workout: Workout;
    version: number;
    rating: null;
    effort: number;
    compliance: number;
    notes: null;
    weight_added: number;
    weight_added_unit: string;
    media: unknown[];
    start_time: Date;
    end_time: Date;
    completed: boolean;
    total_hang_time: number;
    pauses: unknown[];
    sets: Set[];
    fingers_frequency: FingersFrequency;
    grip_types_frequency: GripTypesFrequency;
    time_log: TimeLog[];
    equipment: Equipment;
    with_motherboard: boolean;
  }

  export interface GripTypesFrequency {
    HALFCRIMP?: number;
    OPEN?: number;
    JUG?: number;
  }

  export enum Equipment {
    Beast1K = "BEAST1K",
    Beast2K = "BEAST2K",
  }

  export interface WorkoutDetails {
    uuid: string;
    author: AuthorDetails;
    name: string;
    description: null | string;
    version: number;
    cover_image: null;
    media: unknown[];
    ability: string;
    focus: string[];
    equipment: Equipment[];
    endurance_type: null;
    skills: Skill[];
    climb_types: unknown[];
    duration: number;
    moving_duration: number;
    rest_duration: number;
    content_summary: ContentSummary;
    creation_time: Date;
    update_time: Date;
    sets: WorkoutSet[];
    versions: Version[];
    liked: boolean;
    public: boolean;
    rating: number | null;
    completions: number;
  }

  export interface AuthorDetails {
    uuid: string;
    first_name?: string;
    last_name?: string;
    name: string;
    picture_url: string;
    basecamp?: null;
    coach_uuid?: string;
    city?: string;
    country?: string;
  }

  export interface WorkoutSet {
    instructions: null | string;
    holds: Holds;
    movement: Movement;
    reps: number;
    rest_time: number;
    hang_time?: number;
    rep_rest_time?: number;
  }

  export enum Movement {
    Hang = "HANG",
    Pullup = "PULLUP",
  }

  export enum Skill {
    Endurance = "ENDURANCE",
    Power = "POWER",
    Strength = "STRENGTH",
  }

  export interface Version {
    number: number;
    creation_time: Date;
  }
}

export const GrippyWorkoutLogs = proxyCollection<
  Grippy.WorkoutLog & { _io_userId: string }
>("grippy_workout_logs");
export const GrippyWorkoutLogDetails = proxyCollection<
  Grippy.WorkoutLogDetails & { _io_userId: string }
>("grippy_workout_log_details");
export const GrippyWorkoutDetails = proxyCollection<
  Grippy.WorkoutDetails & { _io_userId: string }
>("grippy_workout_details");

export const logInGrippy = async (email: string, password: string) => {
  const body = new FormData();
  body.append("grant_type", "password");
  body.append("username", email);
  body.append("password", password);

  const res = await fetch("https://api.griptonite.io/auth/token", {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data" },
    body,
  });
  if (!res.ok) {
    throw new Error("Failed to log in to Grippy: " + (await res.text()));
  }
  const json = (await res.json()) as unknown;

  if (!isGrippyAuthTokens(json)) {
    throw new Error("Invalid response from Grippy auth token endpoint");
  }

  return json;
};
