import { createDb } from "@qmenut/db/client";
import { upsertImageVariantsStatements } from "@qmenut/db/repositories/image-variants.repository";
import { branchPhotos, branches } from "@qmenut/db/schema/branches";
import { imageAssignments } from "@qmenut/db/schema/images";
import { categories, dishes } from "@qmenut/db/schema/menu";
import * as Sentry from "@sentry/cloudflare";
import { and, eq, exists, isNull, lte, not, or, sql } from "drizzle-orm";

import { buildImageVariantCatalogEntries } from "./image-variant-catalog";
import { getImageUpload } from "./image-worker.client";
import { bumpPublicContentVersion } from "../../lib/theme/theme-worker-client";

import type { VerifiedImageManifest } from "./image-worker.client";
import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { BatchItem } from "drizzle-orm/batch";

interface ImageFinalizationMessage {
  id: string;
  revision: string;
}
class ImagePreparationError extends Error {}

type Assignment = typeof imageAssignments.$inferSelect;

function revisionFilter(message: ImageFinalizationMessage) {
  return and(eq(imageAssignments.id, message.id), eq(imageAssignments.revision, message.revision));
}

function targetExists(db: DrizzleDb, assignment: Assignment) {
  const table = { categoryImage: categories, dishImage: dishes, branchPhoto: branches, branchLogo: branches }[
    assignment.purpose
  ];
  const filter = and(
    eq(table.id, assignment.entityId),
    eq(table.restaurantId, assignment.restaurantId),
    isNull(table.deletedAt),
  );
  return exists(db.select({ id: table.id }).from(table).where(filter));
}

function publicationStatements(input: {
  db: DrizzleDb;
  assignment: Assignment;
  photos: { url: string; position: number }[];
}): BatchItem<"sqlite">[] {
  const { db, assignment, photos } = input;
  const fence = and(revisionFilter(assignment), eq(imageAssignments.status, "pending"), targetExists(db, assignment));
  const current = exists(db.select({ id: imageAssignments.id }).from(imageAssignments).where(fence));
  if (assignment.purpose === "branchPhoto") {
    return [
      db.delete(branchPhotos).where(and(eq(branchPhotos.branchId, assignment.branchId), current)),
      ...photos.map((photo) =>
        db.insert(branchPhotos).select(
          db
            .select({
              id: sql<string>`${crypto.randomUUID()}`.as("id"),
              branchId: sql<string>`${assignment.branchId}`.as("branch_id"),
              url: sql<string>`${photo.url}`.as("url"),
              position: sql<number>`${photo.position}`.as("position"),
              createdAt: sql<number>`${Date.now()}`.as("created_at"),
            })
            .from(imageAssignments)
            .where(fence),
        ),
      ),
    ];
  }
  const url = photos[0]?.url ?? null;
  if (assignment.purpose === "branchLogo") {
    return [
      db
        .update(branches)
        .set({ logoUrl: url, updatedAt: Date.now() })
        .where(and(eq(branches.id, assignment.entityId), current)),
    ];
  }
  const table = assignment.purpose === "categoryImage" ? categories : dishes;
  return [
    db
      .update(table)
      .set({ imageUrl: url, updatedAt: Date.now() })
      .where(and(eq(table.id, assignment.entityId), current)),
  ];
}

async function resolveImages(env: RuntimeEnv, assignment: Assignment) {
  const manifests: VerifiedImageManifest[] = [];
  const photos: { url: string; uploadId?: string; position: number }[] = [];
  for (const image of assignment.images) {
    if (image.url) photos.push({ url: image.url, position: image.position });
    if (!image.uploadId) continue;
    const upload = await getImageUpload({ worker: env.IMAGE_WORKER, ...assignment, uploadId: image.uploadId });
    if (upload.status === "failed")
      throw new ImagePreparationError("No se pudo preparar la imagen. Reintenta o selecciona otra imagen.");
    if (upload.status !== "succeeded" || !upload.imageUrl || !upload.manifest) return null;
    const expected = assignment.purpose === "branchLogo" ? ["main"] : ["main", "w160", "w430", "w860"];
    const baseUrl = upload.imageUrl.slice(0, -"main.webp".length);
    if (
      expected.some((name) => {
        const variant = upload.manifest?.variants[name];
        return (
          variant?.name !== name ||
          variant.contentType !== "image/webp" ||
          variant.publicUrl !== `${baseUrl}${name}.webp`
        );
      })
    ) {
      throw new ImagePreparationError(
        "La imagen no contiene todas las variantes. Selecciona otra imagen o contacta con soporte.",
      );
    }
    manifests.push(upload.manifest);
    photos.push({ url: upload.imageUrl, uploadId: image.uploadId, position: image.position });
  }
  return { manifests, photos };
}

async function invalidateApplied(env: RuntimeEnv, message: ImageFinalizationMessage) {
  const db = createDb(env.DB);
  const filter = and(
    revisionFilter(message),
    eq(imageAssignments.status, "applied"),
    isNull(imageAssignments.invalidatedAt),
  );
  const row = await db.select().from(imageAssignments).where(filter).get();
  if (!row) return;
  const branch = await db
    .select({ host: branches.customDomain })
    .from(branches)
    .where(and(eq(branches.id, row.branchId), eq(branches.restaurantId, row.restaurantId), isNull(branches.deletedAt)))
    .get();
  // Let failures reach the scheduler: applied rows remain due until cache invalidation succeeds.
  if (branch?.host) await bumpPublicContentVersion(env, branch.host);
  await db.update(imageAssignments).set({ invalidatedAt: Date.now() }).where(revisionFilter(message));
}

async function finalizeImageAssignment(env: RuntimeEnv, message: ImageFinalizationMessage): Promise<void> {
  const db = createDb(env.DB);
  const assignment = await db.select().from(imageAssignments).where(revisionFilter(message)).get();
  if (!assignment || assignment.status === "superseded" || assignment.status === "failed") return;
  if (assignment.status === "applied") return invalidateApplied(env, message);
  const fence = and(revisionFilter(message), eq(imageAssignments.status, "pending"));
  const deletedTarget = and(fence, not(targetExists(db, assignment)));
  await db.update(imageAssignments).set({ status: "superseded", updatedAt: Date.now() }).where(deletedTarget);
  const live = await db.select({ id: imageAssignments.id }).from(imageAssignments).where(fence).get();
  if (!live) return;
  let resolved;
  try {
    resolved = await resolveImages(env, assignment);
    if (Date.now() - assignment.updatedAt > 24 * 60 * 60 * 1000 && !resolved) {
      throw new ImagePreparationError("La imagen no se ha recibido o preparado. Selecciona el archivo de nuevo.");
    }
  } catch (error) {
    // Only stable processing failures are terminal; RPC/network errors are retried by the next cron.
    if (!(error instanceof ImagePreparationError)) throw error;
    await db
      .update(imageAssignments)
      .set({ status: "failed", error: error.message, updatedAt: Date.now() })
      .where(fence);
    return;
  }
  if (!resolved) return;
  const [first, ...remaining] = publicationStatements({ db, assignment, photos: resolved.photos });
  if (!first) return;
  const publicationFilter = and(fence, targetExists(db, assignment));
  await db.batch([
    first,
    ...remaining,
    ...upsertImageVariantsStatements({ db, variants: buildImageVariantCatalogEntries(resolved.manifests) }),
    db
      .update(imageAssignments)
      .set({ status: "applied", images: resolved.photos, error: null, updatedAt: Date.now() })
      .where(publicationFilter),
  ]);
  await invalidateApplied(env, message);
}

/** D1 is the durable publication outbox; no product-side queue is needed. */
export async function publishPendingImages(env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);
  const now = Date.now();
  const needsInvalidation = and(eq(imageAssignments.status, "applied"), isNull(imageAssignments.invalidatedAt));
  const eligible = or(eq(imageAssignments.status, "pending"), needsInvalidation);
  const due = await db
    .select({ id: imageAssignments.id, revision: imageAssignments.revision })
    .from(imageAssignments)
    .where(and(lte(imageAssignments.nextAttemptAt, now), eligible))
    .orderBy(imageAssignments.nextAttemptAt)
    .limit(20);

  const results = await Promise.allSettled(
    due.map(async (message) => {
      const claimed = await db
        .update(imageAssignments)
        .set({ nextAttemptAt: now + 60_000 })
        .where(and(revisionFilter(message), lte(imageAssignments.nextAttemptAt, now), eligible))
        .returning({ id: imageAssignments.id });
      if (claimed.length > 0) await finalizeImageAssignment(env, message);
    }),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      Sentry.captureException(result.reason, { tags: { module: "image-publication" } });
    }
  }
}
