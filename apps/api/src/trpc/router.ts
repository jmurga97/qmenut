import { authRouter } from "./routers/auth";
import { healthRouter } from "./routers/health";
import { router } from "./trpc";
import { publicMenuRouter } from "../modules/public-menu/public-menu.router";

export const appRouter = router({
  auth: authRouter,
  health: healthRouter,
  menu: publicMenuRouter,
});

export type AppRouter = typeof appRouter;
