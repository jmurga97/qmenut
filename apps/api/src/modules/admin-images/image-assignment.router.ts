import { imageAssignments } from "@qmenut/db/schema/images";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { dispatchImageAssignments } from "./image-finalization";
import { getImageUpload, retryImageUpload } from "./image-worker.client";
import { router, tenantProcedure } from "../../trpc/trpc";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";

const branchInput = z.object({ branchId: z.string().min(1) });
const retryInput = branchInput.extend({ id: z.uuid(), revision: z.uuid() });

export const imageAssignmentsRouter = router({
  list: tenantProcedure.input(branchInput).query(async ({ ctx, input }) => {
    await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });
    const recentSuccess = and(
      eq(imageAssignments.status, "applied"),
      gte(imageAssignments.updatedAt, Date.now() - 60_000),
    );
    const visible = or(inArray(imageAssignments.status, ["pending", "failed"]), recentSuccess);
    const filter = and(
      eq(imageAssignments.restaurantId, ctx.tenant.restaurantId),
      eq(imageAssignments.branchId, input.branchId),
      visible,
    );
    return ctx.db.select().from(imageAssignments).where(filter).orderBy(desc(imageAssignments.updatedAt)).limit(100);
  }),
  retry: tenantProcedure.input(retryInput).mutation(async ({ ctx, input }) => {
    await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });
    const filter = and(
      eq(imageAssignments.id, input.id),
      eq(imageAssignments.revision, input.revision),
      eq(imageAssignments.restaurantId, ctx.tenant.restaurantId),
      eq(imageAssignments.branchId, input.branchId),
    );
    const row = await ctx.db.select().from(imageAssignments).where(filter).get();
    if (!row || row.status === "superseded") throw new TRPCError({ code: "NOT_FOUND" });
    requirePermission(
      ctx.tenant,
      row.purpose === "branchLogo" || row.purpose === "branchPhoto" ? "branch.write" : "menu.write",
    );
    if (row.status === "applied") return { needsFile: false };
    for (const image of row.images) {
      if (!image.uploadId) continue;
      const ownership = {
        restaurantId: row.restaurantId,
        branchId: row.branchId,
        purpose: row.purpose,
        uploadId: image.uploadId,
        worker: ctx.env.IMAGE_WORKER,
      };
      const upload = await getImageUpload(ownership);
      if (upload.status === "awaiting_upload") return { needsFile: true };
      if (upload.status !== "failed") continue;
      if (!upload.error?.retryable) return { needsFile: true };
      await retryImageUpload(ownership);
    }
    await ctx.db
      .update(imageAssignments)
      .set({ status: "pending", error: null, nextAttemptAt: Date.now(), createdAt: Date.now(), updatedAt: Date.now() })
      .where(and(filter, inArray(imageAssignments.status, ["pending", "failed"])));
    await dispatchImageAssignments(ctx.env);
    return { needsFile: false };
  }),
});
