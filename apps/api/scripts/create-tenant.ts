// QMenut · Alta de tenant desde un JSON de intake (ver tenants/example.tenant.json).
//
//   bun scripts/create-tenant.ts --file tenants/la-tasca.json [--remote] [--force] [--dry-run]
//
// Inserta restaurante, sucursal, propietario (Better Auth: basta la fila en `users`,
// el OTP funciona con disableSignUp), idiomas y horarios vía `wrangler d1 execute`,
// y publica el tema + menuVersion en el KV TENANT_THEME (cwd apps/tenant-config,
// mismo patrón que su seed:local). El menú se carga después desde el panel de admin.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { z } from "zod";

const API_DIR = path.resolve(import.meta.dir, "..");
const TENANT_CONFIG_DIR = path.resolve(API_DIR, "../tenant-config");
const LOCAL_KV_PERSIST = "../../.wrangler-shared/state";

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
      emailFromName: z.string().min(1).optional(),
      emailFromAddress: z.email().optional(),
      emailReplyTo: z.email().optional(),
      languages: z.array(z.string().min(2).max(5)).min(1),
    }),
    branch: z.object({
      name: z.string().min(1),
      customDomain: z.string().regex(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/, "host en minúsculas, sin esquema ni puerto"),
      address: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      whatsapp: z.string().min(1).optional(),
      socialLinks: z.record(z.string(), z.url()).optional(),
      currency: z.string().length(3).default("EUR"),
      planCode: z.enum(["basic", "business"]).default("basic"),
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
  );

type TenantFile = z.infer<typeof tenantFileSchema>;

function esc(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function escOrNull(value: string | undefined): string {
  return value === undefined ? "NULL" : esc(value);
}

interface CliOptions {
  file: string;
  remote: boolean;
  force: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  let file: string | undefined;
  let remote = false;
  let force = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--file") {
      file = argv[++i];
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

  return { file: path.resolve(process.cwd(), file), remote, force, dryRun };
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function runWrangler(args: string[], cwd: string): string {
  const result = spawnSync("bunx", ["wrangler", ...args], { cwd, encoding: "utf8" });

  if (result.status !== 0) {
    fail(`wrangler ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return result.stdout;
}

function assertDomainFree(t: TenantFile, opts: CliOptions): void {
  const target = opts.remote ? "--remote" : "--local";
  const query = `SELECT id FROM branches WHERE custom_domain = ${esc(t.branch.customDomain)} AND deleted_at IS NULL`;
  const stdout = runWrangler(["d1", "execute", "DB", target, "--json", "--command", query], API_DIR);

  const batches = JSON.parse(stdout) as Array<{ results: unknown[] }>;
  const rows = batches.flatMap((batch) => batch.results);

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
    `INSERT INTO restaurants (id, name, default_language_code, default_currency, email_from_name, email_from_address, email_reply_to, created_at, updated_at)`,
    `VALUES (${esc(ids.restaurant)}, ${esc(t.restaurant.name)}, ${esc(t.restaurant.defaultLanguageCode)}, ${esc(t.restaurant.defaultCurrency)}, ${escOrNull(t.restaurant.emailFromName)}, ${escOrNull(t.restaurant.emailFromAddress)}, ${escOrNull(t.restaurant.emailReplyTo)}, ${now}, ${now});`,
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
    `INSERT INTO branches (id, restaurant_id, name, address, phone, whatsapp, social_links_json, custom_domain, currency, plan_code, is_active, created_at, updated_at)`,
    `VALUES (${esc(ids.branch)}, ${esc(ids.restaurant)}, ${esc(t.branch.name)}, ${escOrNull(t.branch.address)}, ${escOrNull(t.branch.phone)}, ${escOrNull(t.branch.whatsapp)}, ${escOrNull(t.branch.socialLinks && JSON.stringify(t.branch.socialLinks))}, ${esc(t.branch.customDomain)}, ${esc(t.branch.currency)}, ${esc(t.branch.planCode)}, 1, ${now}, ${now});`,
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

  const targetArgs = options.remote ? ["--remote"] : ["--local", "--persist-to", LOCAL_KV_PERSIST];
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
const tenant = parsed.data;

const ids = {
  user: crypto.randomUUID(),
  restaurant: crypto.randomUUID(),
  restaurantUser: crypto.randomUUID(),
  branch: crypto.randomUUID(),
};

const sql = buildSql(tenant, ids, options.force);

if (options.dryRun) {
  console.log(sql);
  console.log("-- Tema KV (normalizado):");
  console.log(JSON.stringify(resolveTenantThemeConfig(tenant.theme), null, 2));
  process.exit(0);
}

if (!options.force) {
  assertDomainFree(tenant, options);
}

const tmpDir = mkdtempSync(path.join(tmpdir(), "qmenut-tenant-"));
try {
  const sqlFile = path.join(tmpDir, "create-tenant.sql");
  writeFileSync(sqlFile, sql);

  const target = options.remote ? "--remote" : "--local";
  console.log(`→ Insertando tenant en D1 (${target})…`);
  runWrangler(["d1", "execute", "DB", target, "--file", sqlFile], API_DIR);

  console.log("→ Publicando tema en KV TENANT_THEME…");
  putThemeKv(tenant, options, tmpDir);
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
  1. Cargar el menú desde el panel de admin (categorías, platos, promos).
  2. Revisar las páginas legales del dominio y sustituir los marcadores [Razón social], [NIF], [Dirección fiscal].
  3. Descargar el código QR desde el panel de admin (sección "Código QR").
`);
