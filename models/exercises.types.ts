export enum Unit {
  BPM = "BPM",
  CM = "cm",
  Percent = "%",
  FPS = "fps",
  Fathoms = "fathoms",
  Floors = "floors",
  Ft = "ft",
  Hr = "hr",
  In = "in",
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
  Split = "split",
  Yd = "yd",
  Deg = "°",

  // Custom post-fitocracy units
  FrenchRounded = "french_rounded",
}

export enum SendType {
  Flash = 0,
  Top = 1,
  Zone = 2,
  Attempt = 3,
  Repeat = 4,
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
  Grade = "grade",
  Angle = "angle",
}

export enum TagType {
  Discipline = "Discipline",
  Equipment = "Equipment",
  ExperienceLevel = "Experience Level",
  MuscleGroup = "Muscle Group",
  Program = "Program",
  Type = "Type",
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
    // THIS ARRAY IS APPEND-ONLY, AS OPTIONS CHOSEN ARE STORED AS INDEXES HEREOF
    options?: { value: string }[];
    default_value?: number;
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
    video: { youtube_embed: string };
  };
  name: string;
  tags?: { name: string; type: TagType }[];
}

export enum AssistType {
  Assisted = "assisted",
  Weighted = "weighted",
}
