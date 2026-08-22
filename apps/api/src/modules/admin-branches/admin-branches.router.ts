import { listBranchPhotos } from "@qmenut/db/repositories/admin-branches.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { saveBranchSettingsSchema } from "./branch-input.schema";
import { getBranchSettings } from "./get-branch-settings";
import { searchMaptilerAddresses } from "./maptiler-geocoding.service";
import { saveBranchSettings } from "./save-branch-settings";
import { bumpPublicContentVersionForRestaurant } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { validateImageReference, validateImageReferences } from "../admin-images/validate-image-reference";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";

const branchIdSchema = z.object({ branchId: z.string().trim().min(1) });
const searchAddressesSchema = branchIdSchema.extend({ query: z.string().trim().min(3).max(200) });

export const adminBranchesRouter = router({
  get: tenantProcedure
    .input(branchIdSchema)
    .query(({ ctx, input }) =>
      getBranchSettings({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId }),
    ),
  searchAddresses: tenantProcedure.input(searchAddressesSchema).query(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "branch.write");
    await assertBranchAccess({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });

    const throttle = await ctx.env.GEOCODING_LIMITER.limit({ key: ctx.tenant.membershipId });
    if (!throttle.success) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiadas búsquedas, espera un momento" });
    }

    if (!ctx.env.MAPTILER_API_KEY) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "El autocompletado de direcciones no está configurado",
      });
    }

    try {
      return await searchMaptilerAddresses({ apiKey: ctx.env.MAPTILER_API_KEY, query: input.query });
    } catch (error) {
      console.error("No se pudieron obtener sugerencias de MapTiler", error);
      throw new TRPCError({
        cause: error,
        code: "BAD_GATEWAY",
        message: "No se pudieron buscar direcciones en este momento",
      });
    }
  }),
  save: tenantProcedure.input(saveBranchSettingsSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "branch.write");
    const branch = await assertBranchAccess({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    const existingPhotos = await listBranchPhotos({ db: ctx.db, branchId: input.branchId });
    await Promise.all([
      validateImageReference({
        worker: ctx.env.IMAGE_WORKER,
        restaurantId: ctx.tenant.restaurantId,
        branchId: input.branchId,
        purpose: "branchLogo",
        existingUrl: branch.logoUrl,
        imageUrl: input.info.logoUrl,
        uploadId: input.info.logoUploadId,
      }),
      validateImageReferences({
        worker: ctx.env.IMAGE_WORKER,
        restaurantId: ctx.tenant.restaurantId,
        branchId: input.branchId,
        purpose: "branchPhoto",
        existingUrls: existingPhotos.map((photo) => photo.url),
        images: input.photos.map((photo) => ({ imageUrl: photo.url, uploadId: photo.uploadId })),
      }),
    ]);
    await saveBranchSettings({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      timezone: input.timezone,
      legal: input.legal,
      info: input.info,
      schedules: input.schedules,
      photos: input.photos,
    });
    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });
    return { id: input.branchId };
  }),
});
