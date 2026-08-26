import type { RuntimeEnv } from "@/config/env/schema";

/**
 * Cliente mínimo de la Query API de PostHog (HogQL) pensado para informes nocturnos:
 * POST /api/projects/{project_id}/query/ con personal API key de solo lectura.
 * Reintenta 429/5xx/timeouts hasta tres veces respetando Retry-After y valida que la
 * respuesta traiga las columnas esperadas antes de entregar resultados.
 */

const REQUEST_TIMEOUT_MS = 30 * 1000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const TOTAL_ATTEMPTS = 3;
const DEFAULT_RETRY_AFTER_MS = 2000;
const MAX_RETRY_AFTER_MS = 60_000;

export class PostHogQueryError extends Error {
  readonly code: "NOT_CONFIGURED" | "UNAUTHORIZED" | "RATE_LIMITED" | "INVALID_RESPONSE" | "TIMEOUT" | "UPSTREAM_ERROR";

  constructor(code: typeof PostHogQueryError.prototype.code, message: string) {
    super(message);
    this.code = code;
    this.name = "PostHogQueryError";
  }
}

function retryAfterMs(response: Response): number {
  const header = response.headers.get("retry-after");

  if (!header) {
    return DEFAULT_RETRY_AFTER_MS;
  }

  const seconds = Number(header);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const dateDelay = Date.parse(header) - Date.now();

  return Number.isFinite(dateDelay) && dateDelay >= 0
    ? Math.min(dateDelay, MAX_RETRY_AFTER_MS)
    : DEFAULT_RETRY_AFTER_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface HogQLQueryResult {
  /** Filas indexadas por el alias declarado en el SELECT. */
  rows: Record<string, unknown>[];
}

export function assertIsPostHogConfigured(env: RuntimeEnv): boolean {
  return Boolean(env.POSTHOG_PROJECT_ID && env.POSTHOG_PERSONAL_API_KEY);
}

interface ExecuteInput {
  env: RuntimeEnv;
  expectedColumns: string[];
  query: string;
}

function isFatalErrorCode(code: PostHogQueryError["code"]): boolean {
  return (["NOT_CONFIGURED", "UNAUTHORIZED", "INVALID_RESPONSE"] as PostHogQueryError["code"][]).includes(code);
}

async function executeOnce({ env, expectedColumns, query }: ExecuteInput): Promise<HogQLQueryResult> {
  const url = `${env.POSTHOG_API_HOST.replace(/\/$/, "")}/api/projects/${env.POSTHOG_PROJECT_ID}/query/`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: { type: "hogql", query } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new PostHogQueryError(
      error instanceof Error && error.name === "TimeoutError" ? "TIMEOUT" : "UPSTREAM_ERROR",
      "La consulta a PostHog falló a nivel de red",
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new PostHogQueryError("UNAUTHORIZED", "PostHog rechazó la personal API key");
  }

  if (RETRYABLE_STATUS_CODES.has(response.status)) {
    const error = new PostHogQueryError(
      response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR",
      `PostHog respondió ${response.status}`,
    );
    // La pausa se calcula aquí para que el bucle de reintentos la respete.
    error.cause = { retryAfterMs: retryAfterMs(response) };

    throw error;
  }

  if (!response.ok) {
    throw new PostHogQueryError("INVALID_RESPONSE", `PostHog respondió ${response.status}`);
  }

  return parseQueryResponse(await readJsonBody(response), expectedColumns);
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new PostHogQueryError("INVALID_RESPONSE", "La respuesta de PostHog no es JSON válido");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseQueryResponse(payload: unknown, expectedColumns: string[]): HogQLQueryResult {
  const record = isRecord(payload) ? payload : null;
  const columns = record !== null && Array.isArray(record.columns) ? record.columns : null;
  const results = record !== null && Array.isArray(record.results) ? record.results : null;

  if (columns === null || results === null) {
    throw new PostHogQueryError("INVALID_RESPONSE", "La respuesta de PostHog no trae columnas ni filas");
  }

  if (expectedColumns.some((alias, index) => String(columns[index]) !== alias)) {
    throw new PostHogQueryError("INVALID_RESPONSE", "Las columnas de PostHog no coinciden con la consulta");
  }

  const rows = results.filter((row): row is unknown[] => Array.isArray(row) && row.length === expectedColumns.length);

  if (rows.length !== results.length) {
    throw new PostHogQueryError("INVALID_RESPONSE", "Filas con forma inesperada en la respuesta de PostHog");
  }

  return {
    rows: rows.map((row) => Object.fromEntries(expectedColumns.map((alias, index) => [alias, row[index]]))),
  };
}

/** Pausa entre reintentos: Retry-After para cualquier respuesta transitoria, o backoff corto. */
function retryDelayMs(error: PostHogQueryError, attempt: number): number {
  const cause = error.cause as { retryAfterMs?: number } | undefined;

  return cause?.retryAfterMs ?? attempt * 1000;
}

interface RunQueryInput {
  expectedColumns: string[];
  query: string;
}

/** Ejecuta una consulta HogQL con reintentos (respeta Retry-After) y validación de columnas. */
export async function runHogQLQuery(env: RuntimeEnv, input: RunQueryInput): Promise<HogQLQueryResult> {
  if (!assertIsPostHogConfigured(env)) {
    throw new PostHogQueryError("NOT_CONFIGURED", "PostHog no está configurado en este entorno");
  }

  let lastError = new PostHogQueryError("UPSTREAM_ERROR", "Sin intentos");

  for (let attempt = 1; attempt <= TOTAL_ATTEMPTS; attempt += 1) {
    const outcome = await attemptOnce(env, input);

    if (!(outcome instanceof PostHogQueryError)) {
      return outcome;
    }

    if (isFatalErrorCode(outcome.code)) {
      throw outcome;
    }

    lastError = outcome;

    if (attempt < TOTAL_ATTEMPTS) {
      await sleep(retryDelayMs(outcome, attempt));
    }
  }

  throw lastError;
}

async function attemptOnce(env: RuntimeEnv, input: RunQueryInput): Promise<HogQLQueryResult | PostHogQueryError> {
  try {
    return await executeOnce({ env, expectedColumns: input.expectedColumns, query: input.query });
  } catch (error) {
    // Los errores ajenos a PostHog se propagan tal cual para que el llamador los reporte.
    if (!(error instanceof PostHogQueryError)) {
      throw error;
    }

    return error;
  }
}
