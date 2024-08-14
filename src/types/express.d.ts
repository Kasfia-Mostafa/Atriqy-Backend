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

interface CustomJwtPayload extends JwtPayload {
  userId: string;
}


declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload | { id: string };
  }
}

