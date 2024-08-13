import { model, Schema } from "mongoose";
import { TMessage } from "./message.interface";

const MessageSchema = new Schema<TMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  message:{
    type:String,
    required:true
  }
});

export const Message = model<TMessage>("Message",MessageSchema )
