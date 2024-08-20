import cors from "cors";
import express, { Application, Request, Response, urlencoded } from "express";
import cookieParser from "cookie-parser";
import router from "./router";
import { app,server } from "./module/socket/socket";

// const app: Application = express();

const corsOption = {
  origin: "http://localhost:5173",
  credentials: true,
};

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(cors(corsOption));

// Routes
app.use("/api", router);

const test = (req: Request, res: Response) => {
  res.send("Response is 10");
};

app.get("/", test);

export default app;
