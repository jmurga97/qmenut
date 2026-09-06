import { imageAssignments } from "@qmenut/db/schema/images";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getImageUpload } from "./image-worker.client";

import type { ImagePurpose } from "./image-input.schema";
import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { PendingImageReference } from "@qmenut/db/schema/images";
import type { BatchItem } from "drizzle-orm/batch";

export const imageChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("keep") }),
  z.object({ kind: z.literal("remove") }),
  z.object({ kind: z.literal("upload"), uploadId: z.uuid() }),
]);
export const pendingPhotoSchema = z
  .object({
    url: z.url().optional(),
    uploadId: z.uuid().optional(),
    position: z.number().int().min(0),
  })
  .refine(
    (photo) => Boolean(photo.url) !== Boolean(photo.uploadId),
    "Selecciona una imagen o conserva una foto existente",
  );

export type ImageChange = z.infer<typeof imageChangeSchema>;
export interface AssignmentTarget {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  entityId: string;
  purpose: ImagePurpose;
}

export function assignmentTargetFilter(input: AssignmentTarget) {
  return and(
    eq(imageAssignments.restaurantId, input.restaurantId),
    eq(imageAssignments.entityId, input.entityId),
    eq(imageAssignments.purpose, input.purpose),
  );
}

export function supersedeAssignmentStatement(input: AssignmentTarget): BatchItem<"sqlite"> {
  return input.db
    .update(imageAssignments)
    .set({ status: "superseded", revision: crypto.randomUUID(), updatedAt: Date.now() })
    .where(assignmentTargetFilter(input));
}

export async function pendingAssignmentStatement(
  input: AssignmentTarget & { env: RuntimeEnv; images: PendingImageReference[] },
): Promise<{ statement: BatchItem<"sqlite"> }> {
  await Promise.all(
    input.images
      .filter((image) => image.uploadId)
      .map((image) =>
        getImageUpload({
          worker: input.env.IMAGE_WORKER,
          restaurantId: input.restaurantId,
          branchId: input.branchId,
          purpose: input.purpose,
          uploadId: image.uploadId!,
        }),
      ),
  );
  const now = Date.now();
  const values = {
    restaurantId: input.restaurantId,
    branchId: input.branchId,
    entityId: input.entityId,
    purpose: input.purpose,
    revision: crypto.randomUUID(),
    images: input.images,
    status: "pending" as const,
    error: null,
    invalidatedAt: null,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now,
  };
  return {
    statement: input.db
      .insert(imageAssignments)
      .values({ id: crypto.randomUUID(), ...values })
      .onConflictDoUpdate({
        target: [imageAssignments.restaurantId, imageAssignments.entityId, imageAssignments.purpose],
        set: values,
      }),
  };
}

export async function imageChangeStatements(
  input: AssignmentTarget & { env: RuntimeEnv; change?: ImageChange },
): Promise<BatchItem<"sqlite">[]> {
  if (input.change?.kind === "keep") return [];
  if (input.change?.kind !== "upload") return [supersedeAssignmentStatement(input)];
  const pending = await pendingAssignmentStatement({
    ...input,
    images: [{ uploadId: input.change.uploadId, position: 0 }],
  });
  return [pending.statement];
}
