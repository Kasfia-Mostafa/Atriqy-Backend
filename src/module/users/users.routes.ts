import express from "express";
import { UserControllers } from "./users.controllers";
import { UserValidation } from "./users.validation";
import validateRequest from "../../utils/validateRequest";
import authentication from "../../middlewares/authentication";
import upload from "../../middlewares/multer";

const router = express.Router();

router.post(
  "/register",
  validateRequest(UserValidation.registerSchema),
  UserControllers.register
);

router.post(
  "/login",
  validateRequest(UserValidation.loginSchema),
  UserControllers.login
);

router.get("/logout", UserControllers.logout);

router.get(
  "/:id/profile",
  authentication,
  UserControllers.getProfile
);

router.post(
  "/profile/edit",
  authentication,
  upload.single('profilePhoto'),
  validateRequest(UserValidation.editProfileSchema),
  UserControllers.editProfile
);

router.get(
  "/suggested",
  authentication,
  UserControllers.getSuggestedUsers
);

router.post(
  "/followOrUnfollow/:id",
  authentication,
  UserControllers.followOrUnfollow
);


export const UserRoutes = router;
