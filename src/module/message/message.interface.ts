import { Types } from "mongoose";

export interface TMessage {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  message: string;
}
