import { upsertImageVariantsStatements } from "@qmenut/db/repositories/image-variants.repository";

import { imageChangeStatements, pendingAssignmentStatement, supersedeAssignmentStatement } from "./image-assignment";
import { buildImageVariantCatalogEntries } from "./image-variant-catalog";
import { validateImageReference, validateImageReferences } from "./validate-image-reference";

import type { ImageChange } from "./image-assignment";
import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { PendingImageReference } from "@qmenut/db/schema/images";

export async function prepareBranchImageSave(input: {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
  branchId: string;
  existingLogo: string | null;
  existingPhotos: { url: string; position: number }[];
  logoUrl: string | null;
  logoUploadId?: string;
  photos: { url: string; position: number; uploadId?: string }[];
  changes?: { logo: ImageChange; gallery?: PendingImageReference[] };
}) {
  const target = { ...input, entityId: input.branchId, worker: input.env.IMAGE_WORKER };
  if (!input.changes) {
    const logo = await validateImageReference({
      ...target,
      purpose: "branchLogo",
      existingUrl: input.existingLogo,
      imageUrl: input.logoUrl,
      uploadId: input.logoUploadId,
    });
    const photos = await validateImageReferences({
      ...target,
      purpose: "branchPhoto",
      existingUrls: input.existingPhotos.map((photo) => photo.url),
      images: input.photos.map((photo) => ({ imageUrl: photo.url, uploadId: photo.uploadId })),
    });
    return {
      logoUrl: input.logoUrl,
      photos: input.photos,
      preserveLogo: false,
      preservePhotos: false,
      statements: [
        supersedeAssignmentStatement({ ...target, purpose: "branchLogo" }),
        supersedeAssignmentStatement({ ...target, purpose: "branchPhoto" }),
        ...upsertImageVariantsStatements({
          db: input.db,
          variants: buildImageVariantCatalogEntries([...(logo ? [logo] : []), ...photos]),
        }),
      ],
    };
  }
  const { logo, gallery } = input.changes;
  const statements = await imageChangeStatements({ ...target, purpose: "branchLogo", change: logo });
  const existing = (gallery ?? []).flatMap((photo) => (photo.url ? [{ imageUrl: photo.url }] : []));
  await validateImageReferences({
    ...target,
    purpose: "branchPhoto",
    existingUrls: input.existingPhotos.map((photo) => photo.url),
    images: existing,
  });
  const pending = gallery?.some((photo) => photo.uploadId) ?? false;
  if (gallery) {
    const operation = pending
      ? await pendingAssignmentStatement({ ...target, purpose: "branchPhoto", images: gallery })
      : { statement: supersedeAssignmentStatement({ ...target, purpose: "branchPhoto" }) };
    statements.push(operation.statement);
  }
  return {
    logoUrl: logo.kind === "remove" ? null : input.existingLogo,
    preserveLogo: logo.kind !== "remove",
    preservePhotos: gallery === undefined || pending,
    photos: (gallery ?? []).flatMap((photo) => (photo.url ? [{ url: photo.url, position: photo.position }] : [])),
    statements,
  };
}
