import { z } from "zod";

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(1, "Username is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  }),
});

const editProfileSchema = z.object({
  body: z.object({
    bio: z.string().optional(),
    gender: z.string().optional(),
  }),
  file: z.any().optional(),
});


export const UserValidation = {
  registerSchema,
  loginSchema,
  editProfileSchema,
};
