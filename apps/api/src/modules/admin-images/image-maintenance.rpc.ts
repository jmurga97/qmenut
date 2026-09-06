import { createDb } from "@qmenut/db/client";
import { getImageReferenceHosts, upsertImageVariants } from "@qmenut/db/repositories/image-variants.repository";
import { WorkerEntrypoint } from "cloudflare:workers";
import { z } from "zod";

import { buildImageVariantCatalogEntries } from "./image-variant-catalog";
import { uploadManifestSchema } from "./image-worker.client";
import { parseEnv } from "../../config/env";
import { bumpPublicContentVersion } from "../../lib/theme/theme-worker-client";

import type { EnvBindings } from "../../config/env/schema";

const inputSchema = z
  .object({
    cursor: z.string().max(200).nullable().default(null),
    limit: z.number().int().min(1).max(20).default(10),
    presetId: z.enum(["qmenut-menu-image", "qmenut-branch-photo"]),
  })
  .strict();

const failureSchema = z.object({ uploadId: z.uuid(), code: z.string(), retryable: z.boolean() });
const manifestSchema = z.object({ uploadId: z.uuid(), manifest: uploadManifestSchema });
const workerErrorSchema = z.object({ code: z.string(), message: z.string(), retryable: z.boolean() });

const resultSchema = z.object({
  failed: z.number().int().nonnegative(),
  failures: z.array(failureSchema),
  manifests: z.array(manifestSchema),
  nextCursor: z.string().nullable(),
  processed: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
});
const envelopeSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: resultSchema }),
  z.object({
    success: z.literal(false),
    error: workerErrorSchema,
  }),
]);

/** Maintenance access is private to same-account service bindings; never exposed over HTTP. */
export class ImageMaintenanceRpc extends WorkerEntrypoint<EnvBindings> {
  async backfillVariants(rawInput: unknown) {
    const input = inputSchema.parse(rawInput);
    const env = parseEnv(this.env);
    const response = envelopeSchema.parse(await env.IMAGE_WORKER.backfillVariants({ ...input, productId: "qmenut" }));
    if (!response.success) throw new Error(`Image backfill failed: ${response.error.code}`);

    const db = createDb(env.DB);
    const variants = buildImageVariantCatalogEntries(response.data.manifests.map(({ manifest }) => manifest));
    const hosts = await getImageReferenceHosts({ db, canonicalUrls: variants.map(({ canonicalUrl }) => canonicalUrl) });
    await upsertImageVariants({ db, variants });
    // A failed invalidation rejects the batch, so an operator retries the same cursor.
    for (const host of hosts) await bumpPublicContentVersion(env, host);

    const { failed, failures, nextCursor, processed, succeeded } = response.data;
    return {
      failed,
      failures,
      nextCursor,
      processed,
      succeeded,
      catalogEntries: variants.length,
      invalidatedHosts: hosts.length,
    };
  }
}
