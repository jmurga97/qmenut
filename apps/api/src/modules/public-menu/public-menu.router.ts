import { getGoogleReviewsConfig } from "@qmenut/db/repositories/google-reviews.repository";
import { hasFeature } from "@qmenut/permissions";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getPublicMenu } from "./get-public-menu";
import { getGoogleReviews } from "./google-reviews.service";
import { publicProcedure, router } from "../../trpc/trpc";
import { resolveTenantFromRequest } from "../tenant/resolve-tenant";

const localeSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/);

const publicMenuInputSchema = z
  .object({
    host: z.string().trim().min(1).optional(),
    locale: localeSchema.optional(),
  })
  .optional();

export const publicMenuRouter = router({
  publicData: publicProcedure.input(publicMenuInputSchema).query(async ({ ctx, input }) => {
    const tenant = await resolveTenantFromRequest({
      db: ctx.db,
      request: ctx.request,
      host: input?.host,
    });

    if (!tenant) {
      return null;
    }

    return getPublicMenu({ db: ctx.db, env: ctx.env, tenant, locale: input?.locale });
  }),
  googleReviews: publicProcedure.input(publicMenuInputSchema).query(async ({ ctx, input }) => {
    const tenant = await resolveTenantFromRequest({
      db: ctx.db,
      request: ctx.request,
      host: input?.host,
    });
    if (!tenant || !hasFeature([tenant.planCode], "contact.googleReviews")) return null;

    const config = await getGoogleReviewsConfig({ db: ctx.db, tenant });
    if (!config?.enabled || !config.placeId) return null;
    if (!ctx.env.GOOGLE_PLACES_API_KEY) return null;

    const forwardedIp = ctx.request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
    const visitorIp = ctx.request.headers.get("cf-connecting-ip") ?? forwardedIp ?? "unknown";
    const throttle = await ctx.env.PUBLIC_REVIEWS_LIMITER.limit({ key: `${tenant.branchId}:${visitorIp}` });
    if (!throttle.success) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiadas solicitudes de reseñas" });
    }

    try {
      return await getGoogleReviews({
        apiKey: ctx.env.GOOGLE_PLACES_API_KEY,
        locale: input?.locale,
        placeId: config.placeId,
      });
    } catch (error) {
      console.error(`No se pudieron cargar las reseñas de Google para la sucursal ${tenant.branchId}`, error);
      throw new TRPCError({ cause: error, code: "BAD_GATEWAY", message: "No se pudieron cargar las reseñas" });
    }
  }),
});
