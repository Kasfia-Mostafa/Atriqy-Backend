import { Server } from "socket.io";
import express from "express";
import http from "http";

// Define the type for the userSocketMap
interface UserSocketMap {
    [userId: string]: string; 
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        // origin: process.env.URL,
        origin: "http://localhost:5173",
        methods: ['GET', 'POST']
    }
});

const userSocketMap: UserSocketMap = {}; 

// Type for receiverId parameter
export const getReceiverSocketId = (receiverId: string): string | undefined => userSocketMap[receiverId];

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string; // Cast to string
    if (userId) {
        userSocketMap[userId] = socket.id;
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    socket.on('disconnect', () => {
        if (userId) {
            delete userSocketMap[userId];
        }
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

export { app, server, io };
