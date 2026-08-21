import { TRPCError } from "@trpc/server";

import { assertCompletedImageUpload, isQmenutMediaUrl } from "./image-worker.client";

import type { ImagePurpose } from "./image-input.schema";
import type { ServiceWorkerBinding } from "../../config/env/schema";

interface ValidateImageReferenceInput {
  worker: ServiceWorkerBinding;
  restaurantId: string;
  branchId: string;
  purpose: ImagePurpose;
  existingUrl: string | null;
  imageUrl: string | null;
  uploadId?: string;
}

export async function validateImageReference(input: ValidateImageReferenceInput): Promise<void> {
  if (input.imageUrl === input.existingUrl || input.imageUrl === null) return;

  if (!input.uploadId || !isQmenutMediaUrl(input.imageUrl)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Las imágenes nuevas deben subirse desde el administrador de qmenut",
    });
  }

  await assertCompletedImageUpload({
    worker: input.worker,
    restaurantId: input.restaurantId,
    branchId: input.branchId,
    purpose: input.purpose,
    uploadId: input.uploadId,
    imageUrl: input.imageUrl,
  });
}

interface ImageReferenceRow {
  imageUrl: string;
  uploadId?: string;
}

interface ValidateImageReferencesInput {
  worker: ServiceWorkerBinding;
  restaurantId: string;
  branchId: string;
  purpose: ImagePurpose;
  existingUrls: string[];
  images: ImageReferenceRow[];
}

export async function validateImageReferences(input: ValidateImageReferencesInput): Promise<void> {
  const availableExistingUrls = new Map<string, number>();
  for (const url of input.existingUrls) {
    availableExistingUrls.set(url, (availableExistingUrls.get(url) ?? 0) + 1);
  }

  const changed = input.images.filter((image) => {
    const available = availableExistingUrls.get(image.imageUrl) ?? 0;
    if (available === 0) return true;
    availableExistingUrls.set(image.imageUrl, available - 1);
    return false;
  });

  await Promise.all(
    changed.map((image) =>
      validateImageReference({
        worker: input.worker,
        restaurantId: input.restaurantId,
        branchId: input.branchId,
        purpose: input.purpose,
        existingUrl: null,
        imageUrl: image.imageUrl,
        uploadId: image.uploadId,
      }),
    ),
  );
}
