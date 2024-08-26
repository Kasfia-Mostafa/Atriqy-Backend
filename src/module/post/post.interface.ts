import { Document, Types } from 'mongoose';

export interface TPost extends Document {
  caption: string;
  image: string;
  author: Types.ObjectId;
  likes: Types.ObjectId[];
  comments: Types.ObjectId[];
  updatedAt?: Date;
}

export interface UserSocketMap {
  [userId: string]: string;
}
