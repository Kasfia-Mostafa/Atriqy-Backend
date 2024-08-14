import { Schema } from "mongoose";
import { TComment } from "./comment.interface";
import { model } from "mongoose";

const CommentSchema: Schema<TComment> = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'UserProfile', required: true }, // Reference to the User model
  text: { type: String, required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true }, // Reference to the Post model
  createdAt: { type: Date, default: Date.now },
});
export const Comment = model<TComment>('Comment', CommentSchema);