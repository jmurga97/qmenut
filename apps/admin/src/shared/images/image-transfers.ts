import { create } from "zustand";

import { trpcClient } from "~/lib/trpc";

import type { AcceptedImageType, ImagePurpose } from "./image-draft";

interface UploadInput {
  branchId: string;
  purpose: ImagePurpose;
  filename: string;
  contentType: AcceptedImageType;
  sizeBytes: number;
  idempotencyKey: string;
}
export interface ImageTransfer {
  uploadId: string;
  input: UploadInput;
  file: File;
  previewUrl: string;
  status: "ready" | "uploading" | "optimizing" | "failed";
  error?: string;
  started?: boolean;
}

export const useImageTransfers = create<{ transfers: Record<string, ImageTransfer> }>(() => ({ transfers: {} }));

function updateTransfer(uploadId: string, patch: Partial<ImageTransfer>) {
  useImageTransfers.setState(({ transfers }) => {
    const current = transfers[uploadId];
    return current ? { transfers: { ...transfers, [uploadId]: { ...current, ...patch } } } : { transfers };
  });
}

export function reserveImageTransfer({ input, file, uploadId }: { input: UploadInput; file: File; uploadId: string }) {
  if (Object.hasOwn(useImageTransfers.getState().transfers, uploadId)) return;
  useImageTransfers.setState(({ transfers }) => ({
    transfers: {
      ...transfers,
      [uploadId]: { uploadId, input, file, previewUrl: URL.createObjectURL(file), status: "ready" },
    },
  }));
}

export function releaseImageTransfer(uploadId: string) {
  const transfer = useImageTransfers.getState().transfers[uploadId];
  if (!transfer) return;
  URL.revokeObjectURL(transfer.previewUrl);
  useImageTransfers.setState(({ transfers }) => {
    const next = { ...transfers };
    delete next[uploadId];
    return { transfers: next };
  });
}

function assertUploaded(response: Response) {
  if (!response.ok) throw new Error("No se pudo transferir la imagen. Inténtalo de nuevo.");
}

const waiting = new Set<string>();
const running = new Set<string>();

async function transferImage(uploadId: string) {
  const task = useImageTransfers.getState().transfers[uploadId];
  if (!task) return;
  updateTransfer(uploadId, { status: "uploading", error: undefined });
  try {
    // Renew an expired signature with the same idempotency key. Completed jobs never PUT again.
    const created = await trpcClient.admin.images.createUpload.mutate(task.input);
    if (created.status === "failed")
      throw new Error("La imagen no se pudo preparar. Selecciona otra imagen en el editor.");
    if (created.upload) {
      const response = await fetch(created.upload.url, {
        method: "PUT",
        headers: created.upload.headers,
        body: task.file,
        signal: AbortSignal.timeout(5 * 60_000),
      });
      assertUploaded(response);
    }
    updateTransfer(uploadId, { status: "optimizing" });
  } catch {
    updateTransfer(uploadId, {
      status: "failed",
      error: "No se pudo subir la imagen. Tus datos están guardados; puedes reintentar.",
    });
  }
}

function drainTransfers() {
  while (running.size < 3 && waiting.size > 0) {
    const id = waiting.values().next().value;
    if (!id) return;
    waiting.delete(id);
    running.add(id);
    void transferImage(id).finally(() => {
      running.delete(id);
      drainTransfers();
    });
  }
}

export function startImageTransfers(ids: string[]) {
  for (const id of ids) {
    const task = useImageTransfers.getState().transfers[id];
    if (!task || running.has(id) || task.status === "optimizing") continue;
    updateTransfer(id, { started: true });
    waiting.add(id);
  }
  drainTransfers();
}
