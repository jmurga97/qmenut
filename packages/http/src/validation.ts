import type { ZodError } from "zod";

export function formatValidationMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}
