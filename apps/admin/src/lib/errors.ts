import { TRPCClientError } from "@trpc/client";

import { i18n } from "~/lib/i18n";

export function isForbiddenError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  const data: unknown = error.data;
  return typeof data === "object" && data !== null && "code" in data && data.code === "FORBIDDEN";
}

export function getErrorMessage(error: unknown): string {
  if (isForbiddenError(error)) {
    return i18n.t("common___No tienes permisos para realizar esta acción.");
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error) {
    return error;
  }
  return i18n.t("common___Se ha producido un error inesperado.");
}
