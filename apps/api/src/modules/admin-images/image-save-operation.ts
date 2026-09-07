import { adminSaveOperations } from "@qmenut/db/schema/images";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { DrizzleDb } from "@qmenut/db/client";
import type { BatchItem } from "drizzle-orm/batch";

interface SaveOperationInput {
  db: DrizzleDb;
  restaurantId: string;
  operationId?: string;
  scope: string;
  input: unknown;
  entityId?: string;
  save: (operation: { entityId: string; statements: BatchItem<"sqlite">[] }) => Promise<{ id: string }>;
}

export async function imageSaveOperation(input: SaveOperationInput): Promise<{ id: string }> {
  const entityId = input.entityId ?? crypto.randomUUID();
  if (!input.operationId) return input.save({ entityId, statements: [] });
  const id = `${input.restaurantId}:${input.operationId}`;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([input.scope, input.input])),
  );
  const fingerprint = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const read = async () => {
    const previous = await input.db.select().from(adminSaveOperations).where(eq(adminSaveOperations.id, id)).get();
    if (previous && previous.fingerprint !== fingerprint) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Este guardado ya se utilizó con otros cambios. Actualiza el formulario.",
      });
    }
    return previous ? { id: previous.entityId } : null;
  };
  const previous = await read();
  if (previous) return previous;
  const statement = input.db
    .insert(adminSaveOperations)
    .values({ id, restaurantId: input.restaurantId, fingerprint, entityId, createdAt: Date.now() });
  try {
    return await input.save({ entityId, statements: [statement] });
  } catch (error) {
    // A concurrent replay can lose the unique insert, rolling its whole batch back.
    const accepted = await read();
    if (accepted) return accepted;
    throw error;
  }
}
