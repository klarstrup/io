import type { Duration } from "date-fns";
import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import { Unit } from "../models/exercises";
import {
  WorkoutSource,
  type WorkoutData,
  type WorkoutExercise,
  type WorkoutExerciseSet,
  type WorkoutExerciseSetInput,
} from "../models/workout";

export namespace Fitocracy {
  export interface Result<T> {
    data: T;
    error: string;
    success: boolean;
  }

  export interface ExerciseData {
    aliases: string[];
    id: number;
    inputs: {
      allowed_units?: { conversion_factor: number; name: Unit }[];
      bounds?: { maximum: number; minimum: number };
      display_name: string;
      hidden_by_default: boolean;
      id: number;
      imperial_unit?: Unit;
      input_ordinal: number;
      metric_unit?: Unit;
      type: InputType;
      options?: { value: string }[];
    }[];
    instructions: { value: string }[];
    is_hidden: boolean;
    is_popular: boolean;
    media?: {
      image: {
        image_full_hash: string;
        image_full_url: string;
        image_medium_hash: string;
        image_medium_url: string;
        image_thumb_hash: string;
        image_thumb_url: string;
      };
      video: {
        youtube_embed: string;
      };
    };
    name: string;
    tags?: { name: string; type: TagType }[];
  }

  export enum Unit {
    BPM = "BPM",
    CM = "cm",
    Empty = "%",
    FPS = "fps",
    Fathoms = "fathoms",
    Floors = "floors",
    Ft = "ft",
    Holes = "holes",
    Hr = "hr",
    In = "in",
    JumpingJacks = "jumping jacks",
    Jumps = "jumps",
    KM = "km",
    KMHr = "km/hr",
    Kg = "kg",
    LB = "lb",
    Laps25M = "laps (25m)",
    Laps50M = "laps (50m)",
    M = "m",
    MS = "m/s",
    Mi = "mi",
    Min = "min",
    Min100M = "min/100m",
    MinKM = "min/km",
    MinMi = "min/mi",
    Mph = "mph",
    Reps = "reps",
    SEC = "sec",
    SECLap25M = "sec/lap (25m)",
    SECLap50M = "sec/lap (50m)",
    Slams = "slams",
    Split = "split",
    Throws = "throws",
    Yd = "yd",

    // What the fuck is the deal with these
    AssistedSquats = "assisted squats",
    BentKneeBenchDips = "bent knee bench dips",
    Easy = "easy",
    Flat = "flat",
    FlatKneeRaises = "flat knee raises",
    InclinePikePushUPS = "incline pike push ups",
    KneelingPlank = "kneeling plank",
    LegAssistedPullUPS = "leg assisted pull-ups",
    Practice = "practice",
    SplashingAround = "splashing around",
    The1InchBand = "1-inch band",
    VerticalPullsDoorPulls = "vertical pulls (door pulls)",
    WallPushUPS = "wall push ups",
  }

  export enum InputType {
    Distance = "distance",
    Heartrate = "heartrate",
    Options = "options",
    Pace = "pace",
    Percent = "percent",
    Rate = "rate",
    Reps = "reps",
    Time = "time",
    Weight = "weight",
    Weightassist = "weightassist",
  }

  enum TagType {
    Equipment = "Equipment",
    ExperienceLevel = "Experience Level",
    MuscleGroup = "Muscle Group",
    Program = "Program",
    Type = "Type",
  }

  // https://www.fitocracy.com/api/v2/user/528455/workouts/?start_date=2001-09-11&end_date=2031-09-11
  // https://www.fitocracy.com/api/v2/user/528455/workout/53763572/

  export interface WorkoutData {
    awards: {
      achievements?: Achievement[];
      quests?: Achievement[];
    };
    comment_count: number;
    id: number;
    points: number;
    prop_count: number;
    root_group: {
      children: { exercise: Exercise; id: number; type: ChildType }[];
      id: number;
      name: string;
      notes: string;
      type: RootGroupType;
    };
    share_url: string;
    submitted: boolean;
    updated_timestamp: string;
    workout_timestamp: string;
    routine_id?: number;
  }

  export interface MongoWorkout
    extends Omit<WorkoutData, "updated_timestamp" | "workout_timestamp"> {
    user_id: number;
    updated_timestamp: Date;
    workout_timestamp: Date;
  }

  export interface Achievement {
    comment_count: number;
    description: string;
    entry_id: number;
    id: number;
    image_url: string;
    prop_count: number;
    title: string;
    type: AchievementType;
    points?: number;
  }

  export enum AchievementType {
    Achievement = "achievement",
    LevelUp = "level_up",
    Quest = "quest",
  }

  export interface Exercise {
    exercise_id: number;
    name: string;
    notes: string;
    sets: {
      description_string: string;
      id: number;
      inputs: {
        id: number;
        input_ordinal: number;
        type: InputType;
        unit?: Unit;
        value: number;
        assist_type?: AssistType;
      }[];
      is_personal_record: boolean;
      points: number;
    }[];
  }

  export enum AssistType {
    Assisted = "assisted",
    Weighted = "weighted",
  }

  export enum ChildType {
    Exercise = "exercise",
  }

  export enum RootGroupType {
    Group = "group",
  }

  export interface ProfileResult {
    [id: number]: ProfileData;
  }

  export interface ProfileData {
    points_overall: number;
    workouts_30day: number;
    points_levelup: number;
    pic: string;
    points_90day: number;
    need_email_update: boolean;
    height_imperial_string: string;
    id: number;
    badges: {
      milestones: Milestone[];
      z_index: number;
      description: string;
      pic: string;
      badgegroup: number;
      id: number;
      name: string;
    }[];
    date_joined: Date;
    weight_metric_string: string;
    workouts_7day: number;
    title: null;
    live_challenge_count: number;
    points_level: number;
    imperial: boolean;
    following_count: number;
    days_on_fitocracy: number;
    follower_count: number;
    height_metric_string: string;
    username: string;
    points_30day: number;
    hero: boolean;
    tags: { is_hidden: boolean; id: number; name: string }[];
    workouts_90day: number;
    group_count: number;
    points_7day: number;
    workouts_overall: number;
    info: string;
    level: number;
    gender: string;
    age: number;
    weight_imperial_string: string;
    prop_count: number;
    show_bota_promotion: boolean;
    quests: {
      milestones: Milestone[];
      description: string;
      name: string;
      parent_quest: null;
      id: number;
      points: number;
    }[];
    referral: string;
  }

  export interface Milestone {
    description: null | string;
    id: number;
    name: null | string;
  }
}

export const theDayFitocracyDied = new Date(2024, 6, 15);

export interface ExerciseScheduleEntry {
  exerciseId: number;
  enabled: boolean;
  frequency: Duration;
  increment?: number;
  workingSets?: number;
  workingReps?: number;
  deloadFactor?: number;
  baseWeight?: number;
}

export const exerciseIdsThatICareAbout = [
  {
    exerciseId: 1, // bench
    enabled: false,
    frequency: { days: 5 },
    increment: 1.25,
    workingSets: 3,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 20,
  },
  {
    exerciseId: 2, // squat
    enabled: false,
    frequency: { days: 3 },
    increment: 2.5,
    workingSets: 3,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 20,
  },
  {
    exerciseId: 3, // deadlift
    enabled: true,
    frequency: { days: 5 },
    increment: 2.5,
    workingSets: 1,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 60,
  },
  {
    exerciseId: 183, // ohp
    enabled: false,
    frequency: { days: 5 },
    increment: 1.25,
    workingSets: 3,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 20,
  },
  {
    exerciseId: 251, // tricep dips
    enabled: true,
    frequency: { days: 5 },
    increment: 1.25,
    workingSets: 3,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 0,
  },
  {
    exerciseId: 288, // pullups
    enabled: true,
    frequency: { days: 5 },
    increment: 1.25,
    workingSets: 3,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 0,
  },
  {
    exerciseId: 474, // bulgarians
    enabled: true,
    frequency: { days: 5 },
    increment: 1.25,
    workingSets: 3,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 20,
  },
  {
    exerciseId: 532, // Pendlay Row
    enabled: true,
    frequency: { days: 5 },
    increment: 1.25,
    workingSets: 3,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 20,
  },
  {
    exerciseId: 181, // arnold press
    enabled: true,
    frequency: { days: 5 },
    increment: 1.25,
    workingSets: 3,
    workingReps: 5,
    deloadFactor: 0.9,
    baseWeight: 5,
  },
  {
    exerciseId: 2001, // bouldering
    enabled: true,
    frequency: { days: 1 },
  },
  {
    exerciseId: 2003, // board climbing
    enabled: true,
    frequency: { days: 4 },
  },
] satisfies ExerciseScheduleEntry[];

export function workoutFromFitocracyWorkout(
  user: Session["user"],
  workout: WithId<Fitocracy.MongoWorkout>,
): WorkoutData {
  const exercises = workout.root_group.children.map(
    ({ exercise }): WorkoutExercise => ({
      exerciseId: exercise.exercise_id,
      sets: exercise.sets.map(
        ({ inputs }): WorkoutExerciseSet => ({
          inputs: inputs.map(
            ({ unit, value, assist_type }): WorkoutExerciseSetInput => ({
              unit: unit as Unit | undefined,
              value,
              assistType: assist_type,
            }),
          ),
        }),
      ),
    }),
  );

  return {
    id: workout.id.toString(),
    exercises,
    userId: user.id,
    createdAt: workout.updated_timestamp,
    updatedAt: workout.updated_timestamp,
    workedOutAt: workout.workout_timestamp,
    source: WorkoutSource.Fitocracy,
  };
}
