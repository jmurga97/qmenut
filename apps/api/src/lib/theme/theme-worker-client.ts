import type { RuntimeEnv } from "../../config/env/schema";
import type { QmFontId } from "@qmenut/ui/theme/font-catalog";

export interface TenantThemeInput {
  template: string;
  primary: string;
  secondary: string;
  tagline?: string;
  headingFont?: QmFontId;
  bodyFont?: QmFontId;
}

const THEME_ORIGIN = "https://theme-worker.internal";

function themeUrl(host: string): string {
  return `${THEME_ORIGIN}/tenants/${encodeURIComponent(host)}/theme`;
}

// Legacy route retained to keep deployed tenant-config workers backwards compatible.
function publicContentVersionUrl(host: string): string {
  return `${THEME_ORIGIN}/tenants/${encodeURIComponent(host)}/menu-version`;
}

export async function getTheme(env: RuntimeEnv, host: string): Promise<TenantThemeInput | null> {
  const response = await env.THEME_WORKER.fetch(themeUrl(host), { method: "GET" });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`La solicitud GET al worker de temas ha fallado (${response.status})`);
  }

  return response.json();
}

interface PutThemeInput {
  config: TenantThemeInput;
  env: RuntimeEnv;
  host: string;
}

export async function putTheme({ config, env, host }: PutThemeInput): Promise<void> {
  const response = await env.THEME_WORKER.fetch(themeUrl(host), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.THEME_WORKER_TOKEN}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`La solicitud PUT al worker de temas ha fallado (${response.status}): ${detail}`);
  }
}

export async function bumpPublicContentVersion(env: RuntimeEnv, host: string): Promise<void> {
  const response = await env.THEME_WORKER.fetch(publicContentVersionUrl(host), {
    method: "PUT",
    headers: { authorization: `Bearer ${env.THEME_WORKER_TOKEN}` },
  });

  if (!response.ok) {
    throw new Error(`La actualización de la versión del contenido público ha fallado (${response.status})`);
  }
}
