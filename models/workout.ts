import mongoose from "mongoose";
import type { AssistType, InputType, Unit } from "./exercises";

export interface WorkoutData {
  exercises: Exercise[];
  user_id: string; // This is a string because it's a MongoDB ObjectId
  created_at: Date;
  updated_at: Date;
  worked_out_at: Date;
  deleted_at?: Date;
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

const workoutInputSchema = new mongoose.Schema<
  WorkoutData["exercises"][number]["sets"][number]["inputs"][number]
>(
  {
    id: Number,
    type: String,
    unit: String,
    value: Number,
    assist_type: String,
  },
  { _id: false }
);

const workoutSetSchema = new mongoose.Schema<
  WorkoutData["exercises"][number]["sets"][number]
>(
  {
    inputs: [workoutInputSchema],
  },
  { _id: false }
);

const workoutExerciseSchema = new mongoose.Schema<
  WorkoutData["exercises"][number]
>(
  {
    exercise_id: Number,
    sets: [workoutSetSchema],
  },
  { _id: false }
);

const workoutSchema = new mongoose.Schema<WorkoutData>(
  {
    exercises: [workoutExerciseSchema],
    user_id: String,
    created_at: Date,
    updated_at: Date,
    worked_out_at: Date,
    deleted_at: Date,
  },
  { toJSON: { flattenObjectIds: true } }
);

export const Workout = mongoose.model("Workout", workoutSchema, undefined, {
  overwriteModels: true,
});
