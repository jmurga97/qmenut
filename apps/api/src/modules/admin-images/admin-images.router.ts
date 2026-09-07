import { imageUploads } from "@qmenut/db/schema/images";

import { imageAssignmentsRouter } from "./image-assignment.router";
import { createImageUploadSchema, getImageUploadSchema } from "./image-input.schema";
import { createImageUpload, getImageUpload } from "./image-worker.client";
import { router, tenantProcedure } from "../../trpc/trpc";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";

import type { ImagePurpose } from "./image-input.schema";
import type { TenantContext } from "../../trpc/trpc";

function requireImagePermission(tenant: TenantContext, purpose: ImagePurpose): void {
  requirePermission(tenant, purpose === "branchLogo" || purpose === "branchPhoto" ? "branch.write" : "menu.write");
}

export const adminImagesRouter = router({
  assignments: imageAssignmentsRouter,
  createUpload: tenantProcedure.input(createImageUploadSchema).mutation(async ({ ctx, input }) => {
    requireImagePermission(ctx.tenant, input.purpose);
    await assertBranchAccess({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });

    const upload = await createImageUpload({
      worker: ctx.env.IMAGE_WORKER,
      restaurantId: ctx.tenant.restaurantId,
      ...input,
    });
    // Repeating createUpload recovers a worker success followed by a failed local write.
    await ctx.db
      .insert(imageUploads)
      .values({
        uploadId: upload.uploadId,
        restaurantId: ctx.tenant.restaurantId,
        branchId: input.branchId,
        purpose: input.purpose,
        createdAt: Date.now(),
      })
      .onConflictDoNothing();
    return upload;
  }),
  getUpload: tenantProcedure.input(getImageUploadSchema).query(async ({ ctx, input }) => {
    requireImagePermission(ctx.tenant, input.purpose);
    await assertBranchAccess({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });

    return getImageUpload({
      worker: ctx.env.IMAGE_WORKER,
      restaurantId: ctx.tenant.restaurantId,
      ...input,
    });
  }),
});
