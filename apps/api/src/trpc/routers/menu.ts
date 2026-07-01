import { getPublicBranch, getPublicMenu } from "@qmenut/db/repositories/public-menu";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { resolveTenantFromRequest } from "../../tenant/resolve-tenant";
import { publicProcedure, router } from "../trpc";

const publicMenuInputSchema = z
  .object({
    host: z.string().trim().min(1).optional(),
  })
  .optional();

export const menuRouter = router({
  branch: publicProcedure.query(async ({ ctx }) => {
    const tenant = await resolveTenantFromRequest({ db: ctx.db, request: ctx.request });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No branch is mapped to this host",
      });
    }

    return getPublicBranch({ db: ctx.db, tenant });
  }),
  publicData: publicProcedure.input(publicMenuInputSchema).query(async ({ ctx, input }) => {
    const tenant = await resolveTenantFromRequest({
      db: ctx.db,
      request: ctx.request,
      host: input?.host,
    });

    if (!tenant) {
      return null;
    }

    return getPublicMenu({ db: ctx.db, tenant, nowMs: Date.now() });
  }),
});
