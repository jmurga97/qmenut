const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const acceptedImageTypes: ReadonlySet<string> = new Set(ACCEPTED_IMAGE_TYPES);

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];
export type ImageDraftStatus = "idle" | "ready" | "uploading" | "optimizing" | "succeeded" | "failed";
export type ImagePurpose = "branchLogo" | "branchPhoto" | "categoryImage" | "dishImage";

export interface ImageDraft {
  id: string;
  file: File | null;
  previewUrl: string | null;
  imageUrl: string | null;
  uploadId?: string;
  idempotencyKey: string;
  status: ImageDraftStatus;
  error?: string;
}

export interface PreparedImage {
  imageUrl: string | null;
  uploadId?: string;
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
    return "Selecciona una imagen JPEG, PNG o WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen no puede superar 25 MiB.";
  }
  return null;
}

export function replaceImageDraftFile({ draft, file }: { draft: ImageDraft; file: File }): ImageDraft {
  const validationError = validateImageFile(file);
  if (validationError) return { ...draft, error: validationError };

  revokeImageDraftPreview(draft);
  return createImageDraft({ file, id: draft.id, imageUrl: null });
}

export function retryImageDraft(draft: ImageDraft): ImageDraft {
  return {
    ...draft,
    uploadId: undefined,
    imageUrl: null,
    idempotencyKey: crypto.randomUUID(),
    status: draft.file ? "ready" : "idle",
    error: undefined,
  };
}

export function revokeImageDraftPreview(draft: ImageDraft): void {
  if (draft.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(draft.previewUrl);
}

export function isDraftBusy(draft: ImageDraft): boolean {
  return draft.status === "uploading" || draft.status === "optimizing";
}
