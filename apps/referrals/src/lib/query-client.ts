import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** tRPC returns Zod failures as a JSON list of issues; show the first message instead. */
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  try {
    const issues = JSON.parse(message) as unknown;
    const first: unknown = Array.isArray(issues) ? issues[0] : null;
    if (typeof first === "object" && first !== null && "message" in first && typeof first.message === "string") {
      return first.message;
    }
  } catch {
    // Not a list of issues: a plain message.
  }

  return message || "Se produjo un error inesperado. Inténtalo de nuevo.";
}

// Mutations that explain their own failure in place pass their own `onError`, which replaces this default.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { onError: (error) => toast.error(errorMessage(error)) },
  },
});
