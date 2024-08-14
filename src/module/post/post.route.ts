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
router.get("/:id/like", authentication, PostController.likePost);
router.get("/:id/dislike", authentication, PostController.dislikePost);
router.post("/:id/comment", authentication, PostController.addComment);
router.post(
  "/:id/comment/all",
  authentication,
  PostController.getCommentsOfPost
);
router.delete("/delete/:id", authentication, PostController.deletePost);
router.get("/:id/bookmark", authentication, PostController.bookmarkPost);


export const PostRoutes = router;
