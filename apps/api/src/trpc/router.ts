import { authRouter } from "./routers/auth";
import { healthRouter } from "./routers/health";
import { menuRouter } from "./routers/menu";
import { router } from "./trpc";

export const appRouter = router({
  auth: authRouter,
  health: healthRouter,
  menu: menuRouter,
});

export type AppRouter = typeof appRouter;
