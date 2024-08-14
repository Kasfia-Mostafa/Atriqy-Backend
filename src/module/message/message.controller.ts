import { Conversation } from "../conversation/conversation.model";
import { Request, Response } from "express";
import { Message } from "./message.model";
import { TMessage } from "./message.interface";

//*** Send Message
const sendMessage = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const senderId = req.user?.id;
    const receiverId = req.params.id;
    const { textMessage: message } = req.body;
    // Ensure both senderId and receiverId are valid ObjectIds
    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ message: "Sender or receiver ID missing", success: false });
    }
    // Find or create a conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }
    // Create a new message
    const newMessage = await Message.create({
      senderId,
      receiverId,
      message,
    });
    // Add the new message to the conversation
    conversation.messages.push(newMessage._id);
    // Save both conversation and message
    await Promise.all([conversation.save(), newMessage.save()]);
    // Optionally: Implement Socket.IO for real-time notifications
    // const receiverSocketId = getReceiverSocketId(receiverId);
    // if (receiverSocketId) {
    //   io.to(receiverSocketId).emit('newMessage', newMessage);
    // }
    return res.status(201).json({
      success: true,
      newMessage,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

//*** Get Message
const getMessage = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const senderId = req.user?.id;
    const receiverId = req.params.id;
    // Find the conversation between the sender and receiver
    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate<{ messages: TMessage[] }>("messages"); 
    if (!conversation) {
      return res.status(200).json({ success: true, messages: [] });
    }
    return res
      .status(200)
      .json({ success: true, messages: conversation.messages });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

export const MessageController ={
  sendMessage,
  getMessage
}
