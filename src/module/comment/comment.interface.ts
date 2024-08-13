import { Types } from "mongoose";

export interface TComment extends Document {
  author: Types.ObjectId;
  text: string;
  post: Types.ObjectId;
  createdAt?: Date;
}
