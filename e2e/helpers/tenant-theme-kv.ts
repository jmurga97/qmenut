import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const API_DIR = fileURLToPath(new URL("../../apps/api", import.meta.url));

// Reads the API Worker's persisted local KV, the same namespace the public worker reads.
async function getKvValue(key: string): Promise<string | null> {
  const { stdout } = await promisify(execFile)(
    "bunx",
    ["wrangler", "kv", "key", "get", key, "--binding", "TENANT_THEME", "--preview", "--local", "--text"],
    { cwd: API_DIR },
  );
  const value = stdout.trim();
  return value === "" || value === "Value not found" ? null : value;
}

export async function getTenantTheme(host: string): Promise<Record<string, unknown>> {
  const value = await getKvValue(host);
  if (value === null) throw new Error(`No theme in local KV for ${host}`);
  return JSON.parse(value) as Record<string, unknown>;
}

export async function getContentVersion(host: string): Promise<string | null> {
  return getKvValue(`menuVersion:${host}`);
}
