import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";

import { isAcceptedImageType, revokeImageDraftPreview } from "./image-draft";

import type { ImageDraft, ImagePurpose, PreparedImage } from "./image-draft";
import type { QueryClient } from "@tanstack/react-query";

const MAX_POLL_MILLISECONDS = 90_000;

interface PrepareDraftsInput {
  branchId: string;
  purpose: ImagePurpose;
  drafts: ImageDraft[];
  updateDraft: (id: string, patch: Partial<ImageDraft>) => void;
  concurrency?: number;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo preparar la imagen.";
}

async function concurrentMap<T, TResult>({
  items,
  concurrency,
  map,
}: {
  items: T[];
  concurrency: number;
  map: (item: T) => Promise<TResult>;
}): Promise<TResult[]> {
  const results: TResult[] = [];
  let nextIndex = 0;
  const run = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item !== undefined) results[index] = await map(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

export function usePrepareImageDrafts() {
  const queryClient = useQueryClient();
  const createUpload = useMutation(trpc.admin.images.createUpload.mutationOptions());

  const prepareOne = async ({
    branchId,
    purpose,
    draft,
    updateDraft,
  }: Omit<PrepareDraftsInput, "drafts" | "concurrency"> & { draft: ImageDraft }): Promise<PreparedImage> => {
    if (!draft.file) {
      if (draft.error) updateDraft(draft.id, { error: undefined });
      return { imageUrl: draft.imageUrl, uploadId: draft.uploadId };
    }
    if (draft.status === "succeeded" && draft.imageUrl && draft.uploadId) {
      if (draft.error) updateDraft(draft.id, { error: undefined });
      return { imageUrl: draft.imageUrl, uploadId: draft.uploadId };
    }

    try {
      if (!isAcceptedImageType(draft.file.type)) {
        throw new Error("Selecciona una imagen JPEG, PNG o WebP.");
      }

      updateDraft(draft.id, { status: "uploading", error: undefined });
      const created = await createUpload.mutateAsync({
        branchId,
        purpose,
        filename: draft.file.name,
        contentType: draft.file.type,
        sizeBytes: draft.file.size,
        idempotencyKey: draft.idempotencyKey,
      });

      await putOriginal({ draft, upload: created.upload });

      updateDraft(draft.id, { status: "optimizing", uploadId: created.uploadId });
      const upload = await pollImageUpload({
        branchId,
        purpose,
        queryClient,
        uploadId: created.uploadId,
      });
      revokeImageDraftPreview(draft);
      updateDraft(draft.id, {
        status: "succeeded",
        imageUrl: upload.imageUrl,
        previewUrl: upload.imageUrl,
        uploadId: upload.uploadId,
      });
      return { imageUrl: upload.imageUrl, uploadId: upload.uploadId };
    } catch (error) {
      updateDraft(draft.id, { status: "failed", error: errorMessage(error) });
      throw error;
    }
  };

  const prepare = (input: PrepareDraftsInput): Promise<PreparedImage[]> =>
    concurrentMap({
      items: input.drafts,
      concurrency: input.concurrency ?? 3,
      map: (draft) => prepareOne({ ...input, draft }),
    });

  return { prepare };
}

async function putOriginal({
  draft,
  upload,
}: {
  draft: ImageDraft;
  upload: { url: string; headers: { "Content-Type": string } } | null;
}): Promise<void> {
  if (!upload || !draft.file) return;
  const response = await fetch(upload.url, {
    method: "PUT",
    headers: upload.headers,
    body: draft.file,
  });
  if (!response.ok) throw new Error("No se pudo transferir la imagen. Inténtalo de nuevo.");
}

async function pollImageUpload({
  branchId,
  purpose,
  queryClient,
  uploadId,
}: {
  branchId: string;
  purpose: ImagePurpose;
  queryClient: QueryClient;
  uploadId: string;
}) {
  const deadline = Date.now() + MAX_POLL_MILLISECONDS;
  while (Date.now() < deadline) {
    const upload = await queryClient.fetchQuery(
      trpc.admin.images.getUpload.queryOptions({ branchId, purpose, uploadId }),
    );
    if (upload.status === "succeeded" && upload.imageUrl) return upload;
    if (upload.status === "failed") {
      throw new Error(upload.error?.message ?? "No se pudo optimizar la imagen.");
    }
    await wait(1000);
  }
  throw new Error("La optimización está tardando demasiado. Guarda de nuevo para reintentar.");
}
