import { z } from "zod";

import { getPublicMenu } from "./get-public-menu";
import { resolvePublicTenant } from "./resolve-public-tenant";
import { publicProcedure, router } from "../../trpc/trpc";

const localeSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/);

const publicMenuInputSchema = z
  .object({
    host: z.string().trim().min(1).optional(),
    locale: localeSchema.optional(),
  })
  .optional();

export const publicMenuRouter = router({
  publicData: publicProcedure.input(publicMenuInputSchema).query(async ({ ctx, input }) => {
    const tenant = await resolvePublicTenant({
      db: ctx.db,
      request: ctx.request,
      host: input?.host,
    });

    if (!tenant) {
      return null;
    }

    return getPublicMenu({ db: ctx.db, tenant, locale: input?.locale });
  }),
});
