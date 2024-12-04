import type { ExerciseSchedule } from "../sources/fitocracy";
import type { UserDataSource } from "../sources/utils";

export interface IUser {
  name: string;
  email: string;
  image: string;
  emailVerified: boolean;
  timeZone?: string | null;
  exerciseSchedules?: ExerciseSchedule[];
  dataSources?: UserDataSource[];
}
