import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ImagePurpose } from "./image-input.schema";
import type { ServiceWorkerBinding } from "../../config/env/schema";

const IMAGE_WORKER_BASE_URL = "https://image-worker.internal";
const QMENUT_PRODUCT_ID = "qmenut";
const QMENUT_MEDIA_ORIGIN = "https://media.qmenut.app";

const uploadStatusSchema = z.enum(["awaiting_upload", "queued", "processing", "succeeded", "failed"]);

const workerErrorDataSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
});
const workerErrorSchema = z.object({
  success: z.literal(false),
  error: workerErrorDataSchema,
});

const signedPutSchema = z.object({
  url: z.url(),
  expiresAt: z.string(),
  headers: z.object({ "Content-Type": z.string() }),
});
const signedUploadDataSchema = z.object({
  uploadId: z.uuid(),
  status: uploadStatusSchema,
  upload: signedPutSchema.nullable(),
});

const signedUploadSchema = z.object({
  success: z.literal(true),
  data: signedUploadDataSchema,
});

const imageVariantSchema = z.object({
  name: z.string(),
  publicUrl: z.string().nullable(),
  contentType: z.string(),
});
const uploadManifestSchema = z.object({
  variants: z.record(z.string(), imageVariantSchema),
});
const uploadResultDataSchema = z.object({
  uploadId: z.uuid(),
  productId: z.string(),
  presetId: z.string(),
  externalId: z.string().nullable(),
  status: uploadStatusSchema,
  manifest: uploadManifestSchema.nullable(),
  error: workerErrorDataSchema.nullable(),
});

const uploadResultSchema = z.object({
  success: z.literal(true),
  data: uploadResultDataSchema,
});

const presetByPurpose = {
  branchLogo: "qmenut-logo",
  branchPhoto: "qmenut-branch-photo",
  categoryImage: "qmenut-menu-image",
  dishImage: "qmenut-menu-image",
} as const satisfies Record<ImagePurpose, string>;

interface OwnershipInput {
  restaurantId: string;
  branchId: string;
  purpose: ImagePurpose;
}

interface CreateUploadInput extends OwnershipInput {
  worker: ServiceWorkerBinding;
  filename: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  idempotencyKey: string;
}

interface GetUploadInput extends OwnershipInput {
  worker: ServiceWorkerBinding;
  uploadId: string;
}

interface VerifyUploadInput extends GetUploadInput {
  imageUrl: string;
}

function mapWorkerError(error: z.infer<typeof workerErrorSchema>["error"]): TRPCError {
  const code = (() => {
    switch (error.code) {
      case "UPLOAD_TOO_LARGE":
        return "PAYLOAD_TOO_LARGE" as const;
      case "UNSUPPORTED_MEDIA_TYPE":
        return "UNSUPPORTED_MEDIA_TYPE" as const;
      case "IDEMPOTENCY_CONFLICT":
      case "UPLOAD_NOT_RETRYABLE":
        return "CONFLICT" as const;
      case "INVALID_BODY":
      case "INVALID_JSON":
        return "BAD_REQUEST" as const;
      case "UPLOAD_NOT_FOUND":
        return "NOT_FOUND" as const;
      case "PRODUCT_NOT_ALLOWED":
      case "PRESET_NOT_ALLOWED":
        return "FORBIDDEN" as const;
      default:
        return error.retryable ? ("BAD_GATEWAY" as const) : ("INTERNAL_SERVER_ERROR" as const);
    }
  })();

  return new TRPCError({ code, message: error.message });
}

async function readWorkerResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "El servicio de imágenes devolvió una respuesta no válida",
    });
  }
}

async function createOwnershipExternalId(input: OwnershipInput): Promise<string> {
  const value = `${input.restaurantId}\u{0}${input.branchId}\u{0}${input.purpose}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `qmenut:${input.purpose}:${fingerprint}`;
}

function readMainImageUrl(data: z.infer<typeof uploadResultSchema>["data"]): string {
  const main = data.manifest?.variants.main;

  if (!main?.publicUrl || main.name !== "main" || main.contentType !== "image/webp") {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "La imagen optimizada no contiene la variante principal esperada",
    });
  }

  if (!isQmenutMediaUrl(main.publicUrl)) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "La imagen optimizada no pertenece al almacenamiento de qmenut",
    });
  }

  return main.publicUrl;
}

export async function createImageUpload(input: CreateUploadInput) {
  const externalId = await createOwnershipExternalId(input);
  const response = await input.worker.fetch(`${IMAGE_WORKER_BASE_URL}/v1/uploads?productId=${QMENUT_PRODUCT_ID}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      presetId: presetByPurpose[input.purpose],
      externalId,
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      metadata: { source: "qmenut-admin" },
    }),
  });
  const body = await readWorkerResponse(response);
  const error = workerErrorSchema.safeParse(body);
  if (error.success) throw mapWorkerError(error.data.error);

  const parsed = signedUploadSchema.safeParse(body);
  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "El servicio de imágenes devolvió una respuesta no válida",
    });
  }

  return parsed.data.data;
}

export async function getImageUpload(input: GetUploadInput) {
  const response = await input.worker.fetch(
    `${IMAGE_WORKER_BASE_URL}/v1/uploads/${input.uploadId}?productId=${QMENUT_PRODUCT_ID}`,
  );
  const body = await readWorkerResponse(response);
  const error = workerErrorSchema.safeParse(body);
  if (error.success) throw mapWorkerError(error.data.error);

  const parsed = uploadResultSchema.safeParse(body);
  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "El servicio de imágenes devolvió una respuesta no válida",
    });
  }

  const data = parsed.data.data;
  const externalId = await createOwnershipExternalId(input);
  if (
    data.productId !== QMENUT_PRODUCT_ID ||
    data.presetId !== presetByPurpose[input.purpose] ||
    data.externalId !== externalId
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "La subida no pertenece a esta sucursal" });
  }

  return {
    uploadId: data.uploadId,
    status: data.status,
    imageUrl: data.status === "succeeded" ? readMainImageUrl(data) : null,
    error: data.error,
  };
}

export async function assertCompletedImageUpload(input: VerifyUploadInput): Promise<void> {
  const upload = await getImageUpload(input);

  if (upload.status !== "succeeded" || upload.imageUrl !== input.imageUrl) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "La imagen no ha terminado de procesarse o no coincide con la subida",
    });
  }
}

export function isQmenutMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === QMENUT_MEDIA_ORIGIN && url.pathname.endsWith("/main.webp");
  } catch {
    return false;
  }
}
