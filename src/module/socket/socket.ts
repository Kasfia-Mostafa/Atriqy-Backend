// yourSocketServerFile.ts
import { Server } from "socket.io";
import http from "http";
import { Express } from "express";

// Define the type for the userSocketMap
interface UserSocketMap {
  [userId: string]: string;
}

// Function to create a Socket.IO server
export const createSocketServer = (app: Express) => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  const userSocketMap: UserSocketMap = {};

  // Function to get receiver's socket ID
  const getReceiverSocketId = (receiverId: string): string | undefined =>
    userSocketMap[receiverId];

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      userSocketMap[userId] = socket.id;
      console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      if (userId) {
        delete userSocketMap[userId];
        console.log(`User disconnected: ${userId}`);
      }
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  // Ensure to return getReceiverSocketId here
  return { server, io, getReceiverSocketId };
};
