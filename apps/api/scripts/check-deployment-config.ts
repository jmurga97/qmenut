import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolveTenantEnvironment, TENANT_ENVIRONMENTS } from "./tenant-environment";

const API_DIR = path.resolve(import.meta.dir, "..");
const WEB_DIR = path.resolve(API_DIR, "../web");
const TENANT_CONFIG_DIR = path.resolve(API_DIR, "../tenant-config");

const selectedEnvironment = process.argv[2];
const environment = resolveTenantEnvironment({ remote: true, selected: selectedEnvironment });

function readEnvironmentBlock(config: string): string {
  const marker = `"${environment}":`;
  const markerIndex = config.indexOf(marker);
  const start = config.indexOf("{", markerIndex + marker.length);

  if (markerIndex === -1 || start === -1) {
    throw new Error(`No existe env.${environment} en una configuración de Wrangler`);
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < config.length; index += 1) {
    const character = config[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;

    if (depth === 0) return config.slice(start, index + 1);
  }

  throw new Error(`El bloque env.${environment} no está cerrado`);
}

const [apiConfig, webConfig, tenantConfig] = await Promise.all([
  readFile(path.join(API_DIR, "wrangler.jsonc"), "utf8"),
  readFile(path.join(WEB_DIR, "wrangler.jsonc"), "utf8"),
  readFile(path.join(TENANT_CONFIG_DIR, "wrangler.jsonc"), "utf8"),
]);

const errors: string[] = [];
const apiEnvironmentConfig = readEnvironmentBlock(apiConfig);
const webEnvironmentConfig = readEnvironmentBlock(webConfig);
const tenantEnvironmentConfig = readEnvironmentBlock(tenantConfig);

if (
  environment === "development" &&
  apiEnvironmentConfig.includes('"STRIPE_PRICE_BASIC": "price_dev_basic_replace_me"')
) {
  errors.push("apps/api/wrangler.jsonc todavía usa el placeholder STRIPE_PRICE_BASIC de development");
}

if (environment === "production" && apiEnvironmentConfig.match(/price_[a-z_]*replace_me/i)) {
  errors.push("apps/api/wrangler.jsonc todavía contiene un placeholder de Stripe para production");
}

if (environment === "production" && apiEnvironmentConfig.match(/"DEV_FIXED_OTP"\s*:\s*"true"/i)) {
  errors.push("apps/api/wrangler.jsonc no puede habilitar DEV_FIXED_OTP en production");
}

if (webEnvironmentConfig.match(/"id"\s*:\s*"0{20,}"/)) {
  errors.push("apps/web/wrangler.jsonc todavía contiene un KV id placeholder");
}

if (tenantEnvironmentConfig.match(/"id"\s*:\s*"0{20,}"/)) {
  errors.push("apps/tenant-config/wrangler.jsonc todavía contiene un KV id placeholder");
}

if (errors.length > 0) {
  console.error(`✗ Preflight ${environment} falló:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

const target = TENANT_ENVIRONMENTS[environment];
console.log(
  `✓ Preflight ${environment}: ${target.apiWorker}, ${target.tenantConfigWorker}, ${target.webWorker}, ${target.databaseName}`,
);
