import { Router } from "express";
import { UserRoutes } from "../module/users/users.routes";
import { MessageRoutes } from "../module/message/message.route";
import { PostRoutes } from "../module/post/post.route";

const router = Router();

const modulesRoutes = [
  {
    path: "/user",
    route: UserRoutes,
  },
  {
    path: "/post",
    route: PostRoutes,
  },
  {
    path: "/message",
    route: MessageRoutes,
  },
];

modulesRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
