import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getPublicBranch } from "./get-public-branch";
import { getPublicMenu } from "./get-public-menu";
import { resolvePublicTenant } from "./resolve-public-tenant";
import { publicProcedure, router } from "../../trpc/trpc";

const publicMenuInputSchema = z
  .object({
    host: z.string().trim().min(1).optional(),
  })
  .optional();

export const publicMenuRouter = router({
  branch: publicProcedure.query(async ({ ctx }) => {
    const tenant = await resolvePublicTenant({ db: ctx.db, request: ctx.request });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No branch is mapped to this host",
      });
    }

    return getPublicBranch({ db: ctx.db, tenant });
  }),
  publicData: publicProcedure.input(publicMenuInputSchema).query(async ({ ctx, input }) => {
    const tenant = await resolvePublicTenant({
      db: ctx.db,
      request: ctx.request,
      host: input?.host,
    });

    if (!tenant) {
      return null;
    }

    return getPublicMenu({ db: ctx.db, tenant });
  }),
});
