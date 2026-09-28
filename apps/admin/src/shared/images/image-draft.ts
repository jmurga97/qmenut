import { i18n } from "~/lib/i18n";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const acceptedImageTypes: ReadonlySet<string> = new Set(ACCEPTED_IMAGE_TYPES);

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];
export type ImageDraftStatus = "idle" | "ready" | "uploading" | "optimizing" | "succeeded" | "failed";
export type ImagePurpose = "branchLogo" | "branchPhoto" | "categoryImage" | "dishImage";

export const imageStatusLabel: Record<ImageDraftStatus, string> = {
  idle: "",
  ready: i18n.t("images___Pendiente de guardar"),
  uploading: i18n.t("images___Subiendo"),
  optimizing: i18n.t("images___Procesando imagen"),
  succeeded: i18n.t("images___Archivo recibido"),
  failed: i18n.t("images___Error en la imagen"),
};
export const imageStatusTone = {
  idle: "neutral",
  ready: "warning",
  uploading: "info",
  optimizing: "info",
  succeeded: "success",
  failed: "error",
} as const;

export interface ImageDraft {
  id: string;
  file: File | null;
  previewUrl: string | null;
  imageUrl: string | null;
  uploadId?: string;
  transferred?: boolean;
  idempotencyKey: string;
  status: ImageDraftStatus;
  error?: string;
  changed?: boolean;
}

export interface PreparedImage {
  imageUrl: string | null;
  uploadId?: string;
  imageChange: { kind: "keep" } | { kind: "remove" } | { kind: "upload"; uploadId: string };
}

export function createImageDraft({
  file = null,
  id = crypto.randomUUID(),
  imageUrl,
}: {
  file?: File | null;
  id?: string;
  imageUrl: string | null;
}): ImageDraft {
  return {
    id,
    file,
    previewUrl: file ? URL.createObjectURL(file) : imageUrl,
    imageUrl,
    idempotencyKey: crypto.randomUUID(),
    status: file ? "ready" : "idle",
  };
}

export function isAcceptedImageType(value: string): value is AcceptedImageType {
  return acceptedImageTypes.has(value);
}

export function validateImageFile(file: File): string | null {
  if (!isAcceptedImageType(file.type)) {
    return i18n.t("images___Selecciona una imagen JPEG, PNG o WebP.");
  }
  if (file.size === 0) return i18n.t("images___El archivo está vacío. Selecciona otra imagen.");
  if (file.size > MAX_IMAGE_BYTES) {
    return i18n.t("images___La imagen no puede superar 25 MiB.");
  }
  return null;
}

export function replaceImageDraftFile({ draft, file }: { draft: ImageDraft; file: File }): ImageDraft {
  const validationError = validateImageFile(file);
  if (validationError) return { ...draft, error: validationError };

  revokeImageDraftPreview(draft);
  return { ...createImageDraft({ file, id: draft.id, imageUrl: null }), changed: true };
}

export function revokeImageDraftPreview(draft: ImageDraft): void {
  if (draft.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(draft.previewUrl);
}
