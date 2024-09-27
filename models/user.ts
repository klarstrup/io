export interface IUser {
  name: string;
  email: string;
  image: string;
  emailVerified: boolean;
  fitocracySessionId?: string | null;
  fitocracyUserId?: number;
  topLoggerId?: number | null;
  myFitnessPalToken?: string | null;
  myFitnessPalUserName?: string;
  myFitnessPalUserId?: string;
  runDoubleId?: string | null;
}
