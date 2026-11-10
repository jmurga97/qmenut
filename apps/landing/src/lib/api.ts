// The sign-up island calls the API directly (credentials included) so the session cookie lands on the API host,
// where the admin reads it. Baked at build time by scripts/deploy.ts.
export const API_URL: string =
  import.meta.env.PUBLIC_API_URL || (import.meta.env.DEV ? "http://localhost:8787" : "https://api.qmenut.app");
export const TURNSTILE_SITE_KEY: string = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

export const FOUNDER_PRICE = 39;

/** Founder places left, or null when the API does not answer quickly (the promo then shows without a count). */
export async function getFounderSlotsLeft(): Promise<number | null> {
  try {
    const response = await fetch(`${API_URL}/trpc/signup.founders`, { signal: AbortSignal.timeout(1500) });
    const body = (await response.json()) as { result?: { data?: { left?: number } } };
    return body.result?.data?.left ?? null;
  } catch (error) {
    console.error("No se pudo leer el contador de founders", { error });
    return null;
  }
}

/** tRPC over plain fetch: one public router, no client library for one island. */
export async function callApi<T>({ path, input, query = false }: { path: string; input: unknown; query?: boolean }) {
  const encoded = encodeURIComponent(JSON.stringify(input));
  const response = query
    ? await fetch(`${API_URL}/trpc/${path}?input=${encoded}`, { credentials: "include" })
    : await fetch(`${API_URL}/trpc/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
  const body = (await response.json()) as { result?: { data: T }; error?: { message?: string } };
  if (!response.ok || !body.result) throw new Error(body.error?.message ?? "Algo falló. Inténtalo de nuevo.");
  return body.result.data;
}
