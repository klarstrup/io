import type { ObjectId } from "mongodb";
import mongoose from "mongoose";

export interface IUser {
  _id: ObjectId;
  name: string;
  email: string;
  image: string;
  emailVerified: boolean;
  fitocracySessionId: string;
  fitocracyUserId: number;
  topLoggerId: number;
  myFitnessPalToken: string;
  myFitnessPalUserName: string;
  myFitnessPalUserId: string;
  runDoubleId: string;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    image: String,
    emailVerified: Boolean,
    fitocracySessionId: String,
    fitocracyUserId: Number,
    topLoggerId: Number,
    myFitnessPalToken: String,
    myFitnessPalUserName: String,
    myFitnessPalUserId: String,
    runDoubleId: String,
  },
  { toJSON: { flattenObjectIds: true } }
);

export const User = mongoose.model("User", userSchema, undefined, {
  overwriteModels: true,
});
