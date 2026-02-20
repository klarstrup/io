import type { ExerciseSchedule } from "../sources/fitocracy";
import type { UserDataSource } from "../sources/utils";

export interface IUser {
  name: string;
  email?: string | null;
  image: string;
  emailVerified?: boolean | null;
  timeZone?: string | null;
  exerciseSchedules?: ExerciseSchedule[];
  dataSources?: UserDataSource[];
}
