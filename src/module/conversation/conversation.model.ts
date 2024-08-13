import { model, Schema } from "mongoose";
import { TConversation } from "./conversation.interface";

const ConversationSchema = new Schema<TConversation>({
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  message: [
    {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
  ],
});

export const Conversation = model<TConversation>(
  "Conversation",
  ConversationSchema
);
