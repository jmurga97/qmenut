import { trpcClient } from "~/lib/trpc";

import { isAcceptedImageType } from "./image-draft";
import { reserveImageTransfer, startImageTransfers } from "./image-transfers";

import type { ImageDraft, ImagePurpose, PreparedImage } from "./image-draft";

interface PrepareDraftsInput {
  branchId: string;
  purpose: ImagePurpose;
  drafts: ImageDraft[];
  updateDraft: (id: string, patch: Partial<ImageDraft>) => void;
  concurrency?: number;
}

async function prepareOne(input: PrepareDraftsInput, draft: ImageDraft): Promise<PreparedImage> {
  if (!draft.file) return { imageUrl: draft.imageUrl, imageChange: { kind: draft.changed ? "remove" : "keep" } };
  if (!isAcceptedImageType(draft.file.type)) throw new Error("Selecciona una imagen JPEG, PNG o WebP.");
  const metadata = {
    branchId: input.branchId,
    purpose: input.purpose,
    filename: draft.file.name,
    contentType: draft.file.type,
    sizeBytes: draft.file.size,
    idempotencyKey: draft.idempotencyKey,
  };
  try {
    const upload = await trpcClient.admin.images.createUpload.mutate(metadata);
    reserveImageTransfer({ input: metadata, file: draft.file, uploadId: upload.uploadId });
    input.updateDraft(draft.id, { uploadId: upload.uploadId, error: undefined });
    return { imageUrl: null, uploadId: upload.uploadId, imageChange: { kind: "upload", uploadId: upload.uploadId } };
  } catch (error) {
    input.updateDraft(draft.id, { status: "failed", error: "No se pudo iniciar la subida. Inténtalo de nuevo." });
    throw error;
  }
}

const prepare = async (input: PrepareDraftsInput): Promise<PreparedImage[]> => {
  const results: PreparedImage[] = [];
  for (let index = 0; index < input.drafts.length; index += 3) {
    results.push(...(await Promise.all(input.drafts.slice(index, index + 3).map((draft) => prepareOne(input, draft)))));
  }
  return results;
};
const start = (images: PreparedImage[]) =>
  startImageTransfers(images.flatMap((image) => (image.uploadId ? [image.uploadId] : [])));
export function usePrepareImageDrafts() {
  return { prepare, start };
}
