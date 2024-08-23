import { Conversation } from "../conversation/conversation.model";
import { Request, Response } from "express";
import { Message } from "./message.model";
import {  TMessage } from "./message.interface";
import { createSocketServer } from "../socket/socket";
import mongoose from "mongoose";
import app from "../../app";

const { getReceiverSocketId, io } = createSocketServer(app);

//*** Send Message
const sendMessage = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    // Assuming req.user is populated by your authentication middleware
    const senderId = (req.user as { id: string }).id; 
    const receiverId = req.params.id;
    const { textMessage: message } = req.body;

    // Ensure senderId and receiverId are valid
    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ success: false, message: "Sender or receiver ID is missing." });
    }

    // Validate ObjectId format
    if (
      !mongoose.isValidObjectId(senderId) ||
      !mongoose.isValidObjectId(receiverId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sender or receiver ID." });
    }

    // Find or create a conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    // Establish the conversation if not started yet.
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        messages: [],
      });
    }

    // Create a new message
    const newMessage = await Message.create({
      senderId,
      receiverId,
      message,
    });

    // Add the new message to the conversation
    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }

    await Promise.all([conversation.save(), newMessage.save()]);

    // Implement socket.io for real-time data transfer
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    return res.status(201).json({
      success: true,
      newMessage,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while sending the message.",
      });
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

    console.log("Sender ID:", senderId); 
    console.log("Receiver ID:", receiverId); 

    // Ensure both IDs are valid
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "Sender or receiver ID missing", 
      });
    }

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
    console.error("Error in getMessage:", error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

export const MessageController = {
  sendMessage,
  getMessage,
};
