import { trpcClient } from "~/lib/trpc";
import { uploadFile } from "~/shared/services/upload-file";

import { isAcceptedImageType, validateImageFile } from "./image-draft";

import type { ImageDraft, ImagePurpose, PreparedImage } from "./image-draft";
import type { FileOperation } from "../components/forms/file-operation-progress";

export interface ImageDraftGroup {
  purpose: ImagePurpose;
  drafts: ImageDraft[];
  updateDraft: (id: string, patch: Partial<ImageDraft>) => void;
}
interface TransferInput {
  branchId: string;
  groups: ImageDraftGroup[];
  signal: AbortSignal;
  onProgress: (operation: FileOperation) => void;
}
interface TransferItem {
  draft: ImageDraft;
  group: ImageDraftGroup;
}

function preparedUpload(uploadId: string): PreparedImage {
  return { imageUrl: null, uploadId, imageChange: { kind: "upload", uploadId } };
}

async function transferOne(input: {
  item: TransferItem;
  branchId: string;
  signal: AbortSignal;
  onProgress: (loaded: number) => void;
}): Promise<PreparedImage> {
  const { draft, group } = input.item;
  const file = draft.file;
  if (!file)
    return {
      imageUrl: draft.imageUrl,
      uploadId: draft.uploadId,
      imageChange: { kind: draft.changed ? "remove" : "keep" },
    };
  if (draft.transferred && draft.uploadId) return preparedUpload(draft.uploadId);
  if (!isAcceptedImageType(file.type)) throw new Error("Selecciona una imagen JPEG, PNG o WebP.");
  group.updateDraft(draft.id, { status: "uploading", error: undefined });
  const upload = await trpcClient.admin.images.createUpload.mutate(
    {
      branchId: input.branchId,
      purpose: group.purpose,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      idempotencyKey: draft.idempotencyKey,
    },
    { signal: input.signal },
  );
  input.signal.throwIfAborted();
  group.updateDraft(draft.id, { uploadId: upload.uploadId });
  if (upload.status === "failed") throw new Error("No se pudo preparar la imagen. Selecciona otra imagen.");
  if (upload.status === "awaiting_upload") {
    if (!upload.upload) throw new Error("No se pudo obtener la URL de subida. Pulsa Guardar para reintentar.");
    input.onProgress(0);
    await uploadFile({ ...upload.upload, file, signal: input.signal, onProgress: input.onProgress });
  }
  input.onProgress(file.size);
  group.updateDraft(draft.id, { transferred: true, status: "succeeded", error: undefined });
  return preparedUpload(upload.uploadId);
}

export async function transferImageDrafts(input: TransferInput): Promise<PreparedImage[]> {
  const items = input.groups.flatMap((group) => group.drafts.map((draft) => ({ draft, group })));
  for (const { draft } of items) {
    const error = draft.file ? validateImageFile(draft.file) : null;
    if (error) throw new Error(error);
  }
  const totalBytes = items.reduce((sum, { draft }) => sum + (draft.file?.size ?? 0), 0);
  const loaded = items.map(({ draft }) => (draft.transferred ? (draft.file?.size ?? 0) : 0));
  const report = () =>
    input.onProgress({
      phase: "uploading",
      loadedBytes: loaded.reduce((sum, bytes) => sum + bytes, 0),
      totalBytes,
    });
  if (totalBytes > 0) input.onProgress({ phase: "preparing" });
  const results: PreparedImage[] = [];
  let next = 0;
  let failure: Error | undefined;
  const worker = async () => {
    while (next < items.length && !failure && !input.signal.aborted) {
      const index = next++;
      const item = items[index];
      if (!item) return;
      try {
        results[index] = await transferOne({
          item,
          branchId: input.branchId,
          signal: input.signal,
          onProgress: (bytes) => {
            loaded[index] = bytes;
            report();
          },
        });
      } catch (error) {
        failure =
          error instanceof Error ? error : new Error("No se pudo subir la imagen. Pulsa Guardar para reintentar.");
        item.group.updateDraft(item.draft.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "No se pudo subir la imagen. Pulsa Guardar para reintentar.",
        });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, worker));
  input.signal.throwIfAborted();
  if (failure) throw failure;
  if (totalBytes > 0) input.onProgress({ phase: "saving" });
  return results;
}
