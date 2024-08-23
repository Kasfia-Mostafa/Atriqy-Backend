import { ObjectId, Types } from "mongoose";

export interface TMessage {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  message: string;
}

export interface TConversation {
  participants: string[];
  messages: ObjectId[]; 
}
