import express from "express";
import authentication from "../../middlewares/authentication";
import { PostController } from "./post.controller";
import upload from "../../middlewares/multer";

const router = express.Router();

router.post(
  "/addpost",
  authentication,
  upload.single("image"),
  PostController.addNewPost
);
router.get("/all", authentication, PostController.getAllPost);
router.get("/userpost/all", authentication, PostController.getUserPost);
router.post("/:id/like", authentication, PostController.likePost);
router.post("/:id/dislike", authentication, PostController.dislikePost);
router.post("/:id/comments", authentication, PostController.addComment);
router.post(
  "/:id/comment/all",
  authentication,
  PostController.getCommentsOfPost
);
router.delete("/delete/:id", authentication, PostController.deletePost);
router.post("/:id/bookmark", authentication, PostController.bookmarkPost);


export const PostRoutes = router;
