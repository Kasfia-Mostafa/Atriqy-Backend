import express from "express";
import authentication from "../../middlewares/authentication";
import { MessageController } from "./message.controller";

const router = express.Router();

router.post("/send/:id", authentication, MessageController.sendMessage);

router.get("/all/:id", authentication, MessageController.getMessage);

export const MessageRoutes = router;
