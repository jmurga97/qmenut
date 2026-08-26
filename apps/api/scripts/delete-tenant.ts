// QMenut · Baja de tenant por dominio (operación inversa de create-tenant.ts).
//
//   bun scripts/delete-tenant.ts --host <dominio> [--remote --env production|development]
//     [--force] [--dry-run]
//
// Elimina en D1 la fila de `restaurants` (todas las tablas del tenant cascan por FK:
// branches, menú, pedidos, promos, fidelización, analítica, traducciones…), después los
// miembros que hayan quedado huérfanos (sesiones y cuentas cascan desde `users`) y
// sus códigos OTP en `verifications`. Por último borra las dos claves KV del tema
// (`<host>` y `menuVersion:<host>`). Sin --force solo muestra el plan; nunca toca datos.
// Las suscripciones activas en Stripe deben cancelarse aparte en el dashboard de Stripe.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { normalizeTenantHost } from "@qmenut/db/domain/tenant";

import { describeTenantTarget, getD1TargetArgs, getKvTargetArgs, resolveTenantEnvironment } from "./tenant-environment";

import type { TenantEnvironmentName } from "./tenant-environment";

const API_DIR = path.resolve(import.meta.dir, "..");
const TENANT_CONFIG_DIR = path.resolve(API_DIR, "../tenant-config");

interface CliOptions {
  host: string;
  environment: TenantEnvironmentName;
  remote: boolean;
  force: boolean;
  dryRun: boolean;
}

interface BranchRow {
  id: string;
  name: string;
  customDomain: string | null;
  deletedAt: number | null;
}

interface MemberRow {
  id: string;
  email: string;
}

interface ResolvedTenant {
  restaurantId: string;
  restaurantName: string;
  branches: BranchRow[];
  members: MemberRow[];
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function esc(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function escList(values: string[]): string {
  return values.map((value) => esc(value)).join(", ");
}

function parseArgs(argv: string[]): CliOptions {
  let rawHost: string | undefined;
  let selectedEnvironment: string | undefined;
  let remote = false;
  let force = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--host") {
      rawHost = argv[++i];
    } else if (arg === "--env") {
      selectedEnvironment = argv[++i];
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

  if (!rawHost) {
    fail("Falta --host <dominio>. Ejemplo: bun scripts/delete-tenant.ts --host tapas.localhost");
  }

  const host = normalizeTenantHost(rawHost);
  if (!host) {
    fail(`El --host indicado no es válido: ${rawHost}`);
  }

  let environment: TenantEnvironmentName;
  try {
    environment = resolveTenantEnvironment({ remote, selected: selectedEnvironment });
  } catch (error) {
    fail(errorMessage(error));
  }

  return { host, environment, remote, force, dryRun };
}

function runWrangler(args: string[], cwd: string): string {
  const result = spawnSync("bunx", ["wrangler", ...args], { cwd, encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(`wrangler ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return result.stdout;
}

function runD1Query(query: string, options: CliOptions): Array<Record<string, unknown>> {
  const stdout = runWrangler(
    ["d1", "execute", "DB", ...getD1TargetArgs(options.environment, options.remote), "--json", "--command", query],
    API_DIR,
  );
  const batches = JSON.parse(stdout) as Array<{ results: Array<Record<string, unknown>> }>;

  return batches.flatMap((batch) => batch.results);
}

function resolveTenant(options: CliOptions): ResolvedTenant {
  const rows = runD1Query(
    `SELECT b.id AS branch_id, r.id AS restaurant_id, r.name AS restaurant_name ` +
      `FROM branches b JOIN restaurants r ON r.id = b.restaurant_id ` +
      `WHERE b.custom_domain = ${esc(options.host)}`,
    options,
  );

  const found = rows[0];
  if (!found) {
    fail(
      `No existe ninguna sucursal con custom_domain = ${options.host} en ${options.environment}. ` +
        "Revisa el dominio o el entorno indicado.",
    );
  }

  const restaurantId = String(found.restaurant_id);
  const branchRows = runD1Query(
    `SELECT id, name, custom_domain, deleted_at FROM branches WHERE restaurant_id = ${esc(restaurantId)} ` +
      "ORDER BY created_at",
    options,
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    customDomain: row.custom_domain === null || row.custom_domain === undefined ? null : String(row.custom_domain),
    deletedAt: row.deleted_at === null || row.deleted_at === undefined ? null : Number(row.deleted_at),
  }));
  const members = runD1Query(
    `SELECT DISTINCT u.id AS id, u.email AS email FROM restaurant_users ru ` +
      `JOIN users u ON u.id = ru.user_id WHERE ru.restaurant_id = ${esc(restaurantId)} ORDER BY u.email`,
    options,
  ).map((row) => ({ id: String(row.id), email: String(row.email) }));

  return {
    restaurantId,
    restaurantName: String(found.restaurant_name),
    branches: branchRows,
    members,
  };
}

function buildSql(tenant: ResolvedTenant): string {
  const lines: string[] = [
    "-- Generado por scripts/delete-tenant.ts — no editar a mano.",
    "",
    "-- El borrado del restaurante casca en todas las tablas hijas por FK",
    "-- (branches, menú, pedidos, promos, fidelización, analítica, traducciones…).",
    `DELETE FROM restaurants WHERE id = ${esc(tenant.restaurantId)};`,
    "",
  ];

  if (tenant.members.length > 0) {
    lines.push(
      "-- Miembros sin ningún restaurante restante (las sesiones y cuentas cascan desde users).",
      "DELETE FROM users",
      `WHERE id IN (${escList(tenant.members.map((member) => member.id))})`,
      "  AND id NOT IN (SELECT user_id FROM restaurant_users);",
      "",
      "-- Códigos OTP solo de los usuarios huérfanos que se eliminaron.",
      `DELETE FROM verifications WHERE identifier IN (${escList(tenant.members.map((member) => member.email))})`,
      "  AND identifier NOT IN (SELECT email FROM users);",
      "",
    );
  }

  return lines.join("\n");
}

function deleteThemeKv(host: string, options: CliOptions): void {
  const targetArgs = getKvTargetArgs(options.environment, options.remote);
  const keys = [host, `menuVersion:${host}`];

  for (const key of keys) {
    try {
      runWrangler(["kv", "key", "delete", key, "--binding", "TENANT_THEME", ...targetArgs], TENANT_CONFIG_DIR);
    } catch (error) {
      console.error(
        `⚠ No se pudo borrar la clave KV "${key}". Borra a mano desde apps/tenant-config:\n` +
          `  bunx wrangler kv key delete ${key} --binding TENANT_THEME ${targetArgs.join(" ")}\n` +
          errorMessage(error),
      );
    }
  }
}

function verifyDeletion(tenant: ResolvedTenant, options: CliOptions): void {
  const branchLeft = runD1Query(`SELECT id FROM branches WHERE restaurant_id = ${esc(tenant.restaurantId)}`, options);

  if (branchLeft.length > 0) {
    fail(`La verificación falló: quedan ${branchLeft.length} sucursales del restaurante ${tenant.restaurantId}`);
  }

  const stdout = runWrangler(
    ["kv", "key", "list", "--binding", "TENANT_THEME", ...getKvTargetArgs(options.environment, options.remote)],
    TENANT_CONFIG_DIR,
  );
  const keys = JSON.parse(stdout) as Array<{ name: string }>;
  const remaining = keys
    .map((key) => key.name)
    .filter((name) => name === options.host || name === `menuVersion:${options.host}`);

  if (remaining.length > 0) {
    fail(`La verificación falló: siguen presentes las claves KV ${remaining.join(", ")}`);
  }

  console.log("→ Verificación correcta: sin filas en D1 y sin tema en KV.");
}

function printPlan(tenant: ResolvedTenant, options: CliOptions, sql: string): void {
  console.log(`→ Destino: ${describeTenantTarget(options.environment, options.remote)}`);
  console.log(`→ Restaurante: ${tenant.restaurantName} (${tenant.restaurantId})`);

  for (const branch of tenant.branches) {
    const state = branch.deletedAt !== null ? " [ya dada de baja]" : "";
    console.log(`  · Sucursal: ${branch.name} (${branch.customDomain ?? branch.id})${state}`);
  }

  if (tenant.members.length > 0) {
    console.log(`  · Miembros: ${tenant.members.map((member) => member.email).join(", ")}`);
  }

  console.log(`→ Claves KV a borrar: ${options.host}, menuVersion:${options.host}`);
  console.log("");
  console.log(sql);
}

const initialOptions = parseArgs(process.argv.slice(2));
let tenant: ResolvedTenant;

try {
  tenant = resolveTenant(initialOptions);
} catch (error) {
  fail(`No se pudo consultar el tenant: ${errorMessage(error)}`);
}

if (initialOptions.dryRun || !initialOptions.force) {
  printPlan(tenant, initialOptions, buildSql(tenant));

  if (!initialOptions.dryRun) {
    console.log("\nSin cambios realizados. Revisa el plan y vuelve a lanzarlo con --force para ejecutarlo.");
  }

  process.exit(0);
}

const tmpDir = mkdtempSync(path.join(tmpdir(), "qmenut-delete-tenant-"));
try {
  const sqlFile = path.join(tmpDir, "delete-tenant.sql");
  writeFileSync(sqlFile, buildSql(tenant));

  console.log(`→ Destino: ${describeTenantTarget(initialOptions.environment, initialOptions.remote)}`);
  console.log(`→ Eliminando restaurante ${tenant.restaurantName} (${tenant.restaurantId}) en D1…`);
  runWrangler(
    ["d1", "execute", "DB", ...getD1TargetArgs(initialOptions.environment, initialOptions.remote), "--file", sqlFile],
    API_DIR,
  );

  console.log("→ Borrando claves KV del tema…");
  deleteThemeKv(initialOptions.host, initialOptions);

  verifyDeletion(tenant, initialOptions);
} catch (error) {
  fail(
    "El borrado falló. Si D1 se aplicó parcialmente, relanza con --force: el borrado es idempotente.\n" +
      errorMessage(error),
  );
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`
✓ Tenant eliminado (${initialOptions.host})
  Restaurante : ${tenant.restaurantName} (${tenant.restaurantId})

Siguientes pasos manuales:
  1. Retira el dominio ${initialOptions.host} de los custom domains del worker
     ${initialOptions.environment === "production" ? "qmenut-web" : "qmenut-web-dev"} en Cloudflare.
  2. Si el tenant tenía suscripción real, cancélala también en el dashboard de Stripe.
`);
