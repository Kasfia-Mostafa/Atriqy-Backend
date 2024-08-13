import { model, Schema } from "mongoose";
import { TUser } from "./users.interface";

// Define the schema
const UserProfileSchema: Schema<TUser> = new Schema<TUser>(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: { type: String },
    bio: { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
    followers: [{ type: Schema.Types.ObjectId, ref: "UserProfile" }],
    following: [{ type: Schema.Types.ObjectId, ref: "UserProfile" }],
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "Post" }],
  },
  { timestamps: true }
);

// Create the UserProfile model
export const UserProfile = model<TUser>("UserProfile", UserProfileSchema);
