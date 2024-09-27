import type { AssistType, InputType, Unit } from "./exercises";

export enum WorkoutSource {
  Fitocracy = "fitocracy",
  MyFitnessPal = "myfitnesspal",
  RunDouble = "rundouble",
  TopLogger = "toplogger",
  Self = "self",
}

export interface WorkoutData {
  exercises: Exercise[];
  user_id: string; // This is a string because it's a MongoDB ObjectId
  created_at: Date;
  updated_at: Date;
  worked_out_at: Date;
  deleted_at?: Date;
  source?: WorkoutSource;
  location?: string;
}

interface Exercise {
  exercise_id: number;
  sets: {
    inputs: {
      id: number;
      type: InputType;
      unit?: Unit;
      value: number;
      assist_type?: AssistType;
    }[];
  }[];
}
