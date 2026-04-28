import { Duration } from "../sources/fitocracy";
import type { UserDataSource } from "../sources/utils";

export interface IUser {
  name: string;
  email?: string | null;
  image: string;
  emailVerified?: boolean | null;
  timeZone?: string | null;
  todoSchedules?: ITodoSchedule[];
  dataSources?: UserDataSource[];
}

export interface ITodoSchedule {
  id: string;
  name: string;
  exerciseProgram?: {
    exerciseId: number;
    increment?: number | null;
    workingSets?: number | null;
    workingReps?: number | null;
    deloadFactor?: number | null;
    baseWeight?: number | null;
  } | null;
  frequency: Duration;
  enabled: boolean;
  snoozedUntil?: Date | null;
}
export type ITodoScheduleWithExerciseProgram = Omit<
  ITodoSchedule,
  "exerciseProgram"
> & {
  exerciseProgram: NonNullable<ITodoSchedule["exerciseProgram"]>;
};
