import type { QmFontId } from "@qmenut/ui/theme/font-catalog";

import type { RuntimeEnv } from "../../config/env/schema";

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

/**
 * Cliente del worker tenant-config (única fuente de escritura del KV TENANT_THEME).
 * Se accede vía service binding, así el ADMIN_TOKEN nunca llega al navegador y la
 * normalización del tema vive en un único sitio. Singleton por el patrón de
 * suministradores de infraestructura del proyecto.
 */
export class ThemeWorkerClient {
  private static instance: ThemeWorkerClient | null = null;

  static getInstance(): ThemeWorkerClient {
    if (!ThemeWorkerClient.instance) {
      ThemeWorkerClient.instance = new ThemeWorkerClient();
    }

    return ThemeWorkerClient.instance;
  }

  async getTheme(env: RuntimeEnv, host: string): Promise<unknown | null> {
    const response = await env.THEME_WORKER.fetch(themeUrl(host), { method: "GET" });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Theme worker GET failed (${response.status})`);
    }

    return response.json();
  }

  async putTheme(env: RuntimeEnv, host: string, config: TenantThemeInput): Promise<void> {
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
      throw new Error(`Theme worker PUT failed (${response.status}): ${detail}`);
    }
  }
}
