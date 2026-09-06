import { upsertImageVariantsStatements } from "@qmenut/db/repositories/image-variants.repository";

import { imageChangeStatements } from "./image-assignment";
import { buildImageVariantCatalogEntries } from "./image-variant-catalog";
import { validateImageReference } from "./validate-image-reference";

import type { AssignmentTarget, ImageChange } from "./image-assignment";
import type { RuntimeEnv } from "../../config/env/schema";

export async function prepareMenuImageSave(
  input: AssignmentTarget & {
    env: RuntimeEnv;
    existingUrl: string | null;
    data: { imageUrl: string | null; imageUploadId?: string; imageChange?: ImageChange };
  },
) {
  const change = input.data.imageChange;
  const manifest = change
    ? null
    : await validateImageReference({
        ...input,
        worker: input.env.IMAGE_WORKER,
        imageUrl: input.data.imageUrl,
        uploadId: input.data.imageUploadId,
      });
  const preservedUrl = change ? input.existingUrl : input.data.imageUrl;
  return {
    imageUrl: change?.kind === "remove" ? null : preservedUrl,
    preserveImage: change?.kind === "keep" || change?.kind === "upload",
    statements: [
      ...(await imageChangeStatements({ ...input, change })),
      ...upsertImageVariantsStatements({
        db: input.db,
        variants: manifest ? buildImageVariantCatalogEntries([manifest]) : [],
      }),
    ],
  };
}
