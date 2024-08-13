import { Router } from "express";
import { UserRoutes } from "../module/users/users.routes";


const router = Router();

const modulesRoutes = [
  {
    path: "/user",
    route: UserRoutes,
  },
];

modulesRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
