import { Schema, model } from "mongoose";
import { TPost } from "./post.interface";

// Define the Post schema
const PostSchema = new Schema<TPost>(
  {
    caption: { type: String, required: true },
    image: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "UserProfile" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true }
);

// Create and export the Post model
export const Post = model<TPost>("Post", PostSchema);
