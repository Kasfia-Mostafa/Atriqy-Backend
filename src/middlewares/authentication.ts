import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../app/config";
import { CustomJwtPayload, AuthenticatedRequest } from "../types/express";

const authentication = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }

    const decode = jwt.verify(token, config.jwt_access_secret) as CustomJwtPayload;

    if (!decode || !decode.userId) {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }

    req.userId = decode.userId; // Attach userId to the request
    console.log("Authenticated User ID:", req.userId); // Debugging line
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

export default authentication;
