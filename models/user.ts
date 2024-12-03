import type { TopLoggerAuthTokens } from "../lib";
import type { ExerciseSchedule } from "../sources/fitocracy";
import type { UserDataSource } from "../sources/utils";

export interface IUser {
  name: string;
  email: string;
  image: string;
  emailVerified: boolean;
  geohash?: string | null;
  timeZone?: string | null;
  topLoggerId?: number | null;
  topLoggerGraphQLId?: string | null;
  topLoggerAuthTokens?: TopLoggerAuthTokens;
  exerciseSchedules?: ExerciseSchedule[];
  dataSources?: UserDataSource[];
}
