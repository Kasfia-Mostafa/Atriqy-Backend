import { Types } from "mongoose";

export interface TConversation {
  participants:Types.ObjectId[];
  message: Types.ObjectId[]; 
}
