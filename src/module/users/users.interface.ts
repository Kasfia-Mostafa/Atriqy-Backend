import { Document, Types } from 'mongoose';

// Define the user profile structure
export interface TUserProfile {
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  posts: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
}

// Extend Document to include Mongoose document methods and properties
export interface TUser extends Document<Types.ObjectId>, TUserProfile {
  _id: Types.ObjectId;
}