import { router, publicProcedure } from "../trpc";

export const authRouter = router({
  session: publicProcedure.query(({ ctx }) => ctx.getSession()),
});
