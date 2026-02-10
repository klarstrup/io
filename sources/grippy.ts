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

  export interface WorkoutLogDetail {
    uuid: string;
    workout: Workout;
    version: number;
    rating: null;
    effort: number;
    compliance: number;
    notes: null;
    weight_added: number;
    weight_added_unit: string;
    media: Media[];
    start_time: Date;
    end_time: Date;
    completed: boolean;
    total_hang_time: number;
    pauses: unknown[];
    sets: Set[];
    fingers_frequency: FingersFrequency;
    grip_types_frequency: GripTypesFrequency;
    time_log: TimeLog[];
    equipment: string;
    with_motherboard: boolean;
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
    equipment: string[];
    cover_image_url: null;
    uuid: string;
    author: Author;
    content_summary: ContentSummary;
  }

  export interface Author {
    name: string;
    uuid: string;
    coach_uuid: string;
  }

  export interface ContentSummary {
    holds: Holds;
    fingers: Finger[];
    grip_types: string[];
  }

  export enum Finger {
    Four = "FOUR",
    ThreeF = "THREE_F",
    TwoM = "TWO_M",
  }

  export interface Holds {
    LH: Lh;
    RH: Lh;
  }

  export interface Lh {
    BEAST1K?: number;
    BEAST2K?: number;
  }

  export interface Metadata {
    count: number;
    next: null;
    previous: null;
  }

  export interface FingersFrequency {
    FOUR: number;
    THREE_F: number;
  }

  export interface GripTypesFrequency {
    JUG: number;
    OPEN: number;
  }

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
}

export const GrippyWorkoutLogs = proxyCollection<
  Grippy.WorkoutLog & { _io_userId: string }
>("grippy_workout_logs");

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
  const json = await res.json();

  if (!isGrippyAuthTokens(json)) {
    throw new Error("Invalid response from Grippy auth token endpoint");
  }

  return json;
};
