import express, { Request, Response, urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import router from "./router";

// Initialize Express
const app = express();

// CORS configuration
const corsOption = {
  origin: "http://localhost:5173",
  credentials: true,
  optionSuccessStatus: 200,
};

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOption));
app.use(urlencoded({ extended: true }));

// Routes
app.use("/api", router);

app.get("/", (req: Request, res: Response) => {
  res.send("Response is 10");
});

export default app;
