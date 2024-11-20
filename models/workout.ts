import type { AssistType, Unit } from "./exercises";

export enum WorkoutSource {
  Fitocracy = "fitocracy",
  MyFitnessPal = "myfitnesspal",
  RunDouble = "rundouble",
  TopLogger = "toplogger",
  Self = "self",
}

export interface WorkoutData {
  exercises: WorkoutExercise[];
  userId: string; // This is a string because it's a MongoDB ObjectId
  createdAt: Date;
  updatedAt: Date;
  workedOutAt: Date;
  deletedAt?: Date;
  source?: WorkoutSource;
  location?: string;
}

export interface WorkoutDataShallow extends Omit<WorkoutData, "exercises"> {
  exercises: Omit<WorkoutExercise, "sets">[];
}

export interface WorkoutExercise {
  exerciseId: number;
  sets: WorkoutExerciseSet[];
}

export interface WorkoutExerciseSet {
  createdAt?: Date;
  updatedAt?: Date;
  inputs: WorkoutExerciseSetInput[];
}

export interface WorkoutExerciseSetInput {
  unit?: Unit;
  value: number;
  assistType?: AssistType;
}
