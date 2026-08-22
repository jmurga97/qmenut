// QMenut · Alta de tenant desde un JSON de intake (ver tenants/example.tenant.json).
//
//   bun scripts/create-tenant.ts --file tenants/la-tasca.json [--remote --env production|development]
//     [--host host] [--force] [--dry-run]
//
// Publica primero el tema + menuVersion en TENANT_THEME, inserta restaurante, sucursal,
// suscripción trial, propietario (Better Auth: basta la fila en `users`), idiomas y horarios
// vía `wrangler d1 execute`, y verifica ambas lecturas. Si D1 falla, revierte las claves KV.
// El menú se carga después desde el panel de admin.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { z } from "zod";

import {
  describeTenantTarget,
  getD1TargetArgs,
  getKvTargetArgs,
  resolveTenantEnvironment,
  TENANT_ENVIRONMENTS,
} from "./tenant-environment";

import type { TenantEnvironmentName } from "./tenant-environment";

const API_DIR = path.resolve(import.meta.dir, "..");
const TENANT_CONFIG_DIR = path.resolve(API_DIR, "../tenant-config");

const scheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    openMinute: z.number().int().min(0).max(1439),
    closeMinute: z.number().int().min(0).max(1439),
  })
  .refine((s) => s.openMinute < s.closeMinute, "openMinute debe ser menor que closeMinute");

const tenantFileSchema = z
  .object({
    restaurant: z.object({
      name: z.string().min(1),
      defaultLanguageCode: z.string().min(2).max(5).default("es"),
      defaultCurrency: z.string().length(3).default("EUR"),
      timezone: z.string().min(1).default("Europe/Madrid"),
      legal: z.object({
        legalName: z.string().min(1),
        taxId: z.string().min(1),
        legalAddress: z.string().min(1),
        dataProtectionEmail: z.email(),
      }),
      emailFromName: z.string().min(1).optional(),
      emailFromAddress: z.email().optional(),
      emailReplyTo: z.email().optional(),
      languages: z.array(z.string().min(2).max(5)).min(1),
    }),
    branch: z.object({
      name: z.string().min(1),
      customDomain: z.string().regex(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/, "host en minúsculas, sin esquema ni puerto"),
      address: z.string().min(1).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      logoUrl: z.url().optional(),
      phone: z.string().min(1).optional(),
      whatsapp: z.string().min(1).optional(),
      socialLinks: z.record(z.string(), z.url()).optional(),
      currency: z.string().length(3).default("EUR"),
      planCode: z.enum(["basic"]).default("basic"),
      schedules: z.array(scheduleSchema).default([]),
    }),
    owner: z.object({
      name: z.string().min(1),
      email: z.email(),
    }),
    theme: z.object({
      template: z.enum(["fine", "her", "fast", "cafe", "tapas"]),
      primary: z.string().min(1),
      secondary: z.string().min(1),
      tagline: z.string().optional(),
      headingFont: z.string().optional(),
      bodyFont: z.string().optional(),
    }),
  })
  .refine(
    (t) => t.restaurant.languages.includes(t.restaurant.defaultLanguageCode),
    "restaurant.languages debe incluir defaultLanguageCode",
  )
  .refine(
    (t) => (t.branch.latitude === undefined) === (t.branch.longitude === undefined),
    "branch.latitude y branch.longitude deben indicarse juntos",
  );

type TenantFile = z.infer<typeof tenantFileSchema>;

function esc(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function escOrNull(value: string | undefined): string {
  return value === undefined ? "NULL" : esc(value);
}

interface CliOptions {
  environment: TenantEnvironmentName;
  file: string;
  host?: string;
  remote: boolean;
  force: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  let file: string | undefined;
  let selectedEnvironment: string | undefined;
  let host: string | undefined;
  let remote = false;
  let force = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--file") {
      file = argv[++i];
    } else if (arg === "--env") {
      selectedEnvironment = argv[++i];
    } else if (arg === "--host") {
      host = argv[++i];
    } else if (arg === "--remote") {
      remote = true;
    } else if (arg === "--force") {
      force = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else {
      fail(`Argumento desconocido: ${arg}`);
    }
  }

  if (!file) {
    fail("Falta --file <tenant.json>. Ejemplo: bun scripts/create-tenant.ts --file tenants/example.tenant.json");
  }

  let environment: TenantEnvironmentName;
  try {
    environment = resolveTenantEnvironment({ remote, selected: selectedEnvironment });
  } catch (error) {
    fail(errorMessage(error));
  }

  return { environment, file: path.resolve(process.cwd(), file), host, remote, force, dryRun };
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function runWrangler(args: string[], cwd: string): string {
  const result = spawnSync("bunx", ["wrangler", ...args], { cwd, encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(`wrangler ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return result.stdout;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assertDomainFree(t: TenantFile, opts: CliOptions): void {
  const query = `SELECT id, deleted_at FROM branches WHERE custom_domain = ${esc(t.branch.customDomain)}`;
  const stdout = runWrangler(
    ["d1", "execute", "DB", ...getD1TargetArgs(opts.environment, opts.remote), "--json", "--command", query],
    API_DIR,
  );

  const batches = JSON.parse(stdout) as Array<{ results: Array<{ deleted_at: number | null; id: string }> }>;
  const rows = batches.flatMap((batch) => batch.results);

  if (rows[0]?.deleted_at !== null && rows[0]?.deleted_at !== undefined) {
    fail(
      `El dominio ${t.branch.customDomain} pertenece a una sucursal eliminada (${rows[0].id}), ` +
        "pero el índice único todavía lo reserva. Usa --force para borrar su restaurante y recrearlo.",
    );
  }

  if (rows.length > 0) {
    fail(
      `Ya existe una sucursal con custom_domain = ${t.branch.customDomain}. ` +
        "Usa --force para borrar el restaurante existente (cascada) y recrearlo.",
    );
  }
}

function buildSql(t: TenantFile, ids: Record<string, string>, force: boolean): string {
  const now = Date.now();
  const lines: string[] = ["-- Generado por scripts/create-tenant.ts — no editar a mano.", ""];

  if (force) {
    lines.push(
      "-- --force: elimina el tenant previo de este dominio (cascada limpia hijos).",
      `DELETE FROM restaurants WHERE id IN (SELECT restaurant_id FROM branches WHERE custom_domain = ${esc(t.branch.customDomain)});`,
      "",
    );
  }

  lines.push(
    "-- Propietario (Better Auth con disableSignUp: la fila habilita el login OTP).",
    `INSERT INTO users (id, name, email, email_verified, created_at, updated_at)`,
    `VALUES (${esc(ids.user)}, ${esc(t.owner.name)}, ${esc(t.owner.email)}, 1, ${now}, ${now})`,
    "ON CONFLICT (email) DO NOTHING;",
    "",
    `INSERT INTO restaurants (id, name, default_language_code, default_currency, timezone, legal_name, tax_id, legal_address, data_protection_email, email_from_name, email_from_address, email_reply_to, created_at, updated_at)`,
    `VALUES (${esc(ids.restaurant)}, ${esc(t.restaurant.name)}, ${esc(t.restaurant.defaultLanguageCode)}, ${esc(t.restaurant.defaultCurrency)}, ${esc(t.restaurant.timezone)}, ${esc(t.restaurant.legal.legalName)}, ${esc(t.restaurant.legal.taxId)}, ${esc(t.restaurant.legal.legalAddress)}, ${esc(t.restaurant.legal.dataProtectionEmail)}, ${escOrNull(t.restaurant.emailFromName)}, ${escOrNull(t.restaurant.emailFromAddress)}, ${escOrNull(t.restaurant.emailReplyTo)}, ${now}, ${now});`,
    "",
    "-- SELECT en vez de VALUES: el propietario puede existir ya con otro id.",
    `INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code, is_driver, is_active, created_at, updated_at)`,
    `SELECT ${esc(ids.restaurantUser)}, ${esc(ids.restaurant)}, id, 'owner', 0, 1, ${now}, ${now} FROM users WHERE email = ${esc(t.owner.email)};`,
    "",
  );

  const languageValues = t.restaurant.languages
    .map(
      (code) =>
        `    (${esc(ids.restaurant)}, ${esc(code)}, ${code === t.restaurant.defaultLanguageCode ? 1 : 0}, 1, ${now})`,
    )
    .join(",\n");

  lines.push(
    "INSERT INTO restaurant_languages (restaurant_id, language_code, is_default, is_active, created_at) VALUES",
    `${languageValues};`,
    "",
    `INSERT INTO branches (id, restaurant_id, name, address, latitude, longitude, phone, whatsapp, social_links_json, logo_url, custom_domain, currency, plan_code, is_active, created_at, updated_at)`,
    `VALUES (${esc(ids.branch)}, ${esc(ids.restaurant)}, ${esc(t.branch.name)}, ${escOrNull(t.branch.address)}, ${t.branch.latitude ?? "NULL"}, ${t.branch.longitude ?? "NULL"}, ${escOrNull(t.branch.phone)}, ${escOrNull(t.branch.whatsapp)}, ${escOrNull(t.branch.socialLinks && JSON.stringify(t.branch.socialLinks))}, ${escOrNull(t.branch.logoUrl)}, ${esc(t.branch.customDomain)}, ${esc(t.branch.currency)}, ${esc(t.branch.planCode)}, 1, ${now}, ${now});`,
    "",
    "-- Mantener esta fila alineada con plan_code; requirePlan todavía debe cablearse en los procedimientos premium.",
    `INSERT INTO branch_subscriptions (id, restaurant_id, branch_id, plan_code, status, stripe_subscription_id, stripe_price_id, current_period_end, cancel_at_period_end, created_at, updated_at)`,
    `VALUES (${esc(ids.subscription)}, ${esc(ids.restaurant)}, ${esc(ids.branch)}, ${esc(t.branch.planCode)}, 'trialing', NULL, NULL, NULL, 0, ${now}, ${now});`,
    "",
  );

  if (t.branch.schedules.length > 0) {
    const scheduleValues = t.branch.schedules
      .map(
        (s) =>
          `    (${esc(crypto.randomUUID())}, ${esc(ids.branch)}, ${s.dayOfWeek}, ${s.openMinute}, ${s.closeMinute})`,
      )
      .join(",\n");

    lines.push(
      "INSERT INTO branch_schedules (id, branch_id, day_of_week, open_minute, close_minute) VALUES",
      `${scheduleValues};`,
      "",
    );
  }

  return lines.join("\n");
}

function putThemeKv(t: TenantFile, options: CliOptions, tmpDir: string): void {
  const theme = resolveTenantThemeConfig(t.theme);
  const themeFile = path.join(tmpDir, "theme.json");
  writeFileSync(themeFile, JSON.stringify(theme, null, 2));

  const targetArgs = getKvTargetArgs(options.environment, options.remote);
  const host = t.branch.customDomain;

  runWrangler(
    ["kv", "key", "put", host, "--path", themeFile, "--binding", "TENANT_THEME", ...targetArgs],
    TENANT_CONFIG_DIR,
  );
  runWrangler(
    ["kv", "key", "put", `menuVersion:${host}`, String(Date.now()), "--binding", "TENANT_THEME", ...targetArgs],
    TENANT_CONFIG_DIR,
  );
}

function deleteThemeKv(t: TenantFile, options: CliOptions): void {
  const targetArgs = getKvTargetArgs(options.environment, options.remote);
  const keys = [t.branch.customDomain, `menuVersion:${t.branch.customDomain}`];
  const errors: string[] = [];

  for (const key of keys) {
    try {
      runWrangler(["kv", "key", "delete", key, "--binding", "TENANT_THEME", ...targetArgs], TENANT_CONFIG_DIR);
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function verifyThemeKv(t: TenantFile, options: CliOptions): void {
  const stdout = runWrangler(
    [
      "kv",
      "key",
      "get",
      t.branch.customDomain,
      "--binding",
      "TENANT_THEME",
      ...getKvTargetArgs(options.environment, options.remote),
    ],
    TENANT_CONFIG_DIR,
  );
  const theme = JSON.parse(stdout) as { template?: unknown };

  if (theme.template !== t.theme.template) {
    throw new Error(`KV devolvió template=${String(theme.template)}; se esperaba ${t.theme.template}`);
  }
}

function verifyBranch(t: TenantFile, options: CliOptions, branchId: string): void {
  const query =
    `SELECT id FROM branches WHERE id = ${esc(branchId)} ` + `AND custom_domain = ${esc(t.branch.customDomain)}`;
  const stdout = runWrangler(
    ["d1", "execute", "DB", ...getD1TargetArgs(options.environment, options.remote), "--json", "--command", query],
    API_DIR,
  );
  const batches = JSON.parse(stdout) as Array<{ results: Array<{ id: string }> }>;

  if (!batches.some((batch) => batch.results.some((row) => row.id === branchId))) {
    throw new Error(`D1 no devolvió la sucursal ${branchId} para ${t.branch.customDomain}`);
  }
}

const options = parseArgs(process.argv.slice(2));

let rawJson: unknown;
try {
  rawJson = JSON.parse(readFileSync(options.file, "utf8"));
} catch (error) {
  fail(`No se pudo leer ${options.file}: ${error instanceof Error ? error.message : String(error)}`);
}

const parsed = tenantFileSchema.safeParse(rawJson);
if (!parsed.success) {
  fail(`JSON de tenant inválido:\n${z.prettifyError(parsed.error)}`);
}
const tenant: TenantFile = options.host
  ? { ...parsed.data, branch: { ...parsed.data.branch, customDomain: options.host } }
  : parsed.data;

const tenantWithHost = tenantFileSchema.safeParse(tenant);
if (!tenantWithHost.success) {
  fail(`El --host indicado no es válido:\n${z.prettifyError(tenantWithHost.error)}`);
}

const ids = {
  user: crypto.randomUUID(),
  restaurant: crypto.randomUUID(),
  restaurantUser: crypto.randomUUID(),
  branch: crypto.randomUUID(),
  subscription: crypto.randomUUID(),
};

const sql = buildSql(tenant, ids, options.force);

console.log(`→ Destino: ${describeTenantTarget(options.environment, options.remote)}`);
console.log(`→ Host: ${tenant.branch.customDomain}`);

if (options.dryRun) {
  console.log(sql);
  console.log("-- Tema KV (normalizado):");
  console.log(JSON.stringify(resolveTenantThemeConfig(tenant.theme), null, 2));
  process.exit(0);
}

if (!options.force) {
  try {
    assertDomainFree(tenant, options);
  } catch (error) {
    fail(`No se pudo comprobar el dominio: ${errorMessage(error)}`);
  }
}

const tmpDir = mkdtempSync(path.join(tmpdir(), "qmenut-tenant-"));
try {
  const sqlFile = path.join(tmpDir, "create-tenant.sql");
  writeFileSync(sqlFile, sql);

  console.log("→ Publicando tema en KV TENANT_THEME…");
  try {
    putThemeKv(tenant, options, tmpDir);
  } catch (error) {
    try {
      deleteThemeKv(tenant, options);
    } catch (cleanupError) {
      console.error(`✗ También falló la limpieza de KV: ${errorMessage(cleanupError)}`);
    }
    fail(`No se pudo publicar el tema en KV: ${errorMessage(error)}`);
  }

  const target = options.remote ? "--remote" : "--local";
  console.log(`→ Insertando tenant en D1 (${target})…`);
  try {
    runWrangler(
      ["d1", "execute", "DB", ...getD1TargetArgs(options.environment, options.remote), "--file", sqlFile],
      API_DIR,
    );
  } catch (error) {
    let cleanupNote = "Se eliminaron las dos claves KV publicadas.";

    try {
      deleteThemeKv(tenant, options);
    } catch (cleanupError) {
      cleanupNote = `La limpieza de KV también falló: ${errorMessage(cleanupError)}`;
    }

    fail(
      `No se pudo insertar el tenant en D1. ${cleanupNote}\n` +
        `Revisa si quedó una inserción parcial y reintenta con --force.\n${errorMessage(error)}`,
    );
  }

  console.log("→ Verificando tema y sucursal…");
  try {
    verifyThemeKv(tenant, options);
    verifyBranch(tenant, options, ids.branch);
  } catch (error) {
    fail(`La verificación posterior al alta falló: ${errorMessage(error)}`);
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`
✓ Tenant creado
  Restaurante : ${tenant.restaurant.name} (${ids.restaurant})
  Sucursal    : ${tenant.branch.name} (${ids.branch})
  Dominio     : https://${tenant.branch.customDomain}
  Propietario : ${tenant.owner.email} (login por OTP en el panel de admin)

Siguientes pasos:
  1. Verificar https://${tenant.branch.customDomain} como custom domain del worker ${TENANT_ENVIRONMENTS[options.environment].webWorker} en Cloudflare.
  2. Cargar el menú desde el panel de admin (categorías, platos, promos).
  3. Descargar el código QR desde el panel de admin (sección "Código QR").
  4. Verificar el login OTP de ${tenant.owner.email}.
`);
