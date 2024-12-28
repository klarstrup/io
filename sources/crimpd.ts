import { proxyCollection } from "../utils.server";

export namespace Crimpd {
  export interface WorkoutLogResponse {
    success: Success;
    workout_logs: WorkoutLog[];
  }

  export interface Success {
    message: string;
  }

  export interface WorkoutLog {
    currentGrades: CurrentGrades;
    completionPercent: number;
    intensity: number;
    workload: number;
    estimatedWorkDuration: number;
    estimatedDuration: number;
    customExercise: boolean;
    _id: string;
    _user: string;
    _workout: string;
    logDate: Date;
    timerSummary: unknown[];
    dateCreated: Date;
    lastUpdated: Date;
    bodyWeight: number;
    weightUnit: string;
    permission: string;
    __v: number;
    activityLog: unknown[];
    workout: WorkoutClass;
  }

  export interface CurrentGrades {
    maxSportGrade: string;
    maxBoulderGrade: string;
    sessionSportGrade: string;
    sessionBoulderGrade: string;
    flashSportGrade: string;
    flashBoulderGrade: string;
  }

  export interface WorkoutClass {
    tags: unknown[];
    _id: string;
    name: string;
    _type: string;
    _target: string;
    type: string;
    target: string;
  }
}

export const CrimpdWorkoutLogs = proxyCollection<
  Crimpd.WorkoutLog & { _io_userId: string }
>("crimpd_workout_logs");
