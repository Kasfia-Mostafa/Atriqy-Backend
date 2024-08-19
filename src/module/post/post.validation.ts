import { z } from "zod";

// Schema for adding a new post
const addNewPostSchema = z.object({
  body: z.object({
    caption: z.string().min(1, "Caption is required"),
  }),
  // file: z.instanceof(Buffer).or(z.null()).optional(), 
});

// Schema for adding a comment
const addCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1, "Text is required"),
  }),
});

export const PostValidation = {
  addNewPostSchema,
  addCommentSchema,
};
