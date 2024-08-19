// express.d.ts

import { Request } from "express";
import { File } from "multer";
import { JwtPayload } from "jsonwebtoken";

// Extend the Request interface to include `userId`
declare global {
  namespace Express {
    interface Request {
      userId?: string; 
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      file?: File;
      files?: { [fieldname: string]: File[] }; 
    }
  }
}



declare module "express-serve-static-core" {
  interface Request {
    id?: string; // or whatever type your userId is
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload | { id: string };
  }
}


export interface CustomJwtPayload {
  userId: string;
  // Include other properties if necessary
}

// Extend the Request interface
export interface AuthenticatedRequest extends Request {
  userId?: string; // This will be populated by the authentication middleware
}


