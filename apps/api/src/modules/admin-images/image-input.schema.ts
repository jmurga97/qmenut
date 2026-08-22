import { z } from "zod";

export const imagePurposeSchema = z.enum(["branchLogo", "branchPhoto", "categoryImage", "dishImage"]);

export const createImageUploadSchema = z.object({
  branchId: z.string().trim().min(1),
  purpose: imagePurposeSchema,
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  idempotencyKey: z.string().trim().min(8).max(160),
});

export const getImageUploadSchema = z.object({
  branchId: z.string().trim().min(1),
  purpose: imagePurposeSchema,
  uploadId: z.uuid(),
});

export type ImagePurpose = z.infer<typeof imagePurposeSchema>;
