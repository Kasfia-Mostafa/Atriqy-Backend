import { Types } from "mongoose";

export interface TConversation {
  participants:Types.ObjectId[];
  messages: Types.ObjectId[]; 
}
