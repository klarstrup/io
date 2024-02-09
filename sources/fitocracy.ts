import { format, type Interval } from "date-fns";
import dbConnect from "../dbConnect";
import { dbFetch } from "../fetch";
import { User } from "../models/user";
import { HOUR_IN_SECONDS, WEEK_IN_SECONDS } from "../utils";

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

  enum InputType {
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

const fetchFitocracy = async <T>(
  fitocracySessionId: string,
  input: string | URL,
  init?: RequestInit,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) => {
  const result = await dbFetch<Fitocracy.Result<T>>(
    `https://www.fitocracy.com${String(input)}`,
    {
      ...init,
      headers: { cookie: `sessionid=${fitocracySessionId}`, ...init?.headers },
    },
    dbFetchOptions
  );
  if (!result.success) throw new Error(result.error);

  return result.data;
};

const getExercises = async (
  fitocracySessionId: string,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  await fetchFitocracy<Fitocracy.ExerciseData[]>(
    fitocracySessionId,
    "/api/v2/exercises/",
    undefined,
    { maxAge: WEEK_IN_SECONDS, ...dbFetchOptions }
  );

export const getUserWorkoutIds = async (
  fitocracySessionId: string,
  userId: number,
  interval?: Interval,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  Object.values(
    await fetchFitocracy<{ [date: string]: number[] }>(
      fitocracySessionId,
      `/api/v2/user/${userId}/workouts/?start_date=${format(
        interval?.start || new Date(2001, 9, 11),
        "yyyy-MM-dd"
      )}&end_date=${format(interval?.end || new Date(), "yyyy-MM-dd")}`,
      undefined,
      dbFetchOptions
    )
  ).flat();
export const getUserWorkout = async (
  fitocracySessionId: string,
  userId: number,
  workoutId: number,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) =>
  await fetchFitocracy<Fitocracy.WorkoutData>(
    fitocracySessionId,
    `/api/v2/user/${userId}/workout/${workoutId}/`,
    undefined,
    dbFetchOptions
  );

export const getUserProfileBySessionId = async (fitocracySessionId: string) => {
  const result = await dbFetch<
    Fitocracy.ProfileResult | { error: "missing source credentials" }
  >(
    `https://www.fitocracy.com/api/user/profile/?sessionid=${fitocracySessionId}`,
    { headers: { cookie: `sessionid=${fitocracySessionId}` } },
    { maxAge: HOUR_IN_SECONDS }
  );

  if ("error" in result) throw new Error(result.error);

  return Object.values(result)[0] as Fitocracy.ProfileData;
};

const type = "training";
const discipline = "lifting";

let exercises: Fitocracy.ExerciseData[] | null = null;

export const getLiftingTrainingData = async (trainingInterval: Interval) => {
  // Io is the only user in the database,
  const user = (await User.findOne())!;

  const fitocracySessionId = user?.fitocracySessionId;
  if (!fitocracySessionId) return null;

  let fitocracyUserId = user.fitocracyUserId;
  if (!fitocracyUserId) {
    const fitocracySessionId = user?.fitocracySessionId;
    if (!fitocracySessionId) return null;
    let fitocracyProfile: Fitocracy.ProfileData;
    try {
      fitocracyProfile = await getUserProfileBySessionId(fitocracySessionId);
    } catch (e) {
      return null;
    }
    fitocracyUserId = fitocracyProfile.id;
    await user.updateOne({ fitocracyUserId });
  }

  if (!exercises) {
    exercises = await getExercises(fitocracySessionId);
  }

  const workoutsCollection = (
    await dbConnect()
  ).connection.db.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  const workoutsCursor = workoutsCollection.find({
    user_id: fitocracyUserId,
    workout_timestamp: {
      $gte: new Date(trainingInterval["start"]),
      $lt: new Date(trainingInterval["end"]),
    },
  });

  const biggestLifts: Record<
    string,
    Fitocracy.WorkoutData["root_group"]["children"][number]["exercise"]["sets"][number]
  > = {};
  let count = 0;
  for await (const workout of workoutsCursor) {
    for (const child of workout.root_group.children) {
      for (const set of child.exercise.sets) {
        let reps: number | undefined, weight: number | undefined;
        for (const input of set.inputs) {
          switch (input.unit) {
            case Fitocracy.Unit.Reps: {
              reps = input.value;
              break;
            }
            case Fitocracy.Unit.Kg: {
              weight = input.value;
              break;
            }
          }
        }
        if (reps && weight) {
          count += reps * weight;

          const key = child.exercise.exercise_id;
          const biggestLift = biggestLifts[key];
          const biggestWeight = biggestLift?.inputs.find(
            ({ unit }) => unit === Fitocracy.Unit.Kg
          )?.value;
          const setReps = set.inputs.find(
            ({ unit }) => unit === Fitocracy.Unit.Reps
          )?.value;
          if (
            !biggestLift ||
            (((biggestWeight && biggestWeight < weight) ||
              (biggestWeight === weight && set.is_personal_record)) &&
              setReps &&
              setReps >= 5)
          ) {
            biggestLifts[key] = set;
          }
        }
      }
    }
  }

  return {
    source: "fitocracy",
    type,
    discipline,
    count,
    liftByLift: Object.entries(biggestLifts)
      .map(
        ([exerciseId, set]) =>
          [
            exercises!.find(({ id }) => id === Number(exerciseId))!,
            set,
          ] as const
      )
      .filter(([exercise]) => exerciseIdsThatICareAbout.includes(exercise.id)),
  } as const;
};
const exerciseIdsThatICareAbout = [1, 2, 3, 174, 183, 532];
