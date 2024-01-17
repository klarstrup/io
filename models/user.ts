import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  email: String,
  image: String,
  emailVerified: Boolean,
});

export const User = mongoose.model("User", userSchema, undefined, {
  overwriteModels: true,
});
