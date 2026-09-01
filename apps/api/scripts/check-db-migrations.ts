import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

interface DrizzleJournal {
  entries: unknown[];
}

const apiDirectory = resolve(import.meta.dir, "..");
const migrationMetaDirectory = join(apiDirectory, "migrations", "meta");
const temporaryDirectory = await mkdtemp(join(apiDirectory, ".drizzle-check-"));
const temporaryMetaDirectory = join(temporaryDirectory, "meta");
const temporaryOutputDirectory = relative(apiDirectory, temporaryDirectory);

// This migration was applied remotely before the parent-table rebuild guard existed.
// It is immutable migration history, so keep the exception explicit instead of editing it.
const LEGACY_PARENT_TABLE_REBUILDS = new Set(["0002_branch_coordinates.sql"]);

// The source-currency contract rebuilds these tables to remove defaults and columns that SQLite
// cannot alter in place. WARNING: this exemption is not safe as written. Wrangler sends a whole
// migration file as one query, so D1 runs it in an implicit transaction, where PRAGMA
// foreign_keys is a no-op. The `PRAGMA foreign_keys=OFF` at the top of 0012 therefore does
// nothing and `DROP TABLE restaurants` cascades into branches, categories, dishes, orders,
// payments, restaurant_users and customer_restaurants. A local replay of production's schema
// with seed data lost every child row and all four triggers while the migration reported
// success. 0012 is unapplied everywhere and must be rewritten before it runs.
const REVIEWED_PARENT_TABLE_REBUILDS = new Set(["0012_source_currency_contract.sql"]);

// D1 keys d1_migrations on the filename, so renaming an applied migration makes D1 replay it
// against a schema that already has the change. Renaming 0005/0006 to 0010/0011 caused exactly
// that. Every filename below has been applied to production or development and is frozen. Append
// a name here once it has been applied remotely; never edit or remove one.
const REMOTELY_APPLIED_MIGRATIONS = [
  "0000_baseline.sql",
  "0001_restaurant_legal_details.sql",
  "0002_branch_coordinates.sql",
  "0003_branch_logo_url.sql",
  "0004_valencia_branch_coordinates.sql",
  "0005_add_restaurant_country_code.sql",
  "0005_analytics_aggregate_tables.sql",
  "0006_enforce_restaurant_country_code.sql",
  "0006_materialize_posthog_analytics.sql",
  "0007_session_active_restaurant.sql",
  "0008_google_reviews.sql",
  "0009_enforce_google_reviews_connection.sql",
];

async function checkAppliedMigrationsStillExist(): Promise<void> {
  const migrationFiles = new Set(await readdir(join(apiDirectory, "migrations")));
  const missing = REMOTELY_APPLIED_MIGRATIONS.filter((file) => !migrationFiles.has(file));

  if (missing.length > 0) {
    throw new Error(
      `Migration file(s) ${missing.join(", ")} are recorded as applied remotely but are missing. ` +
        "D1 tracks applied migrations by filename, so a rename or delete makes D1 replay the " +
        "migration against a schema that already has the change. Restore the original filenames.",
    );
  }
}

async function checkForUnsafeParentTableRebuilds(): Promise<void> {
  const migrationsDirectory = join(apiDirectory, "migrations");
  const migrationFiles = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql"));
  const migrations = await Promise.all(
    migrationFiles.map(async (file) => ({
      file,
      sql: await readFile(join(migrationsDirectory, file), "utf8"),
    })),
  );
  const allSql = migrations.map(({ sql }) => sql).join("\n");
  const referencedTables = new Set(
    [...allSql.matchAll(/REFERENCES\s+[`"]?([A-Za-z0-9_]+)[`"]?/gi)].map((match) => match[1]),
  );

  for (const { file, sql } of migrations) {
    if (LEGACY_PARENT_TABLE_REBUILDS.has(file) || REVIEWED_PARENT_TABLE_REBUILDS.has(file)) continue;

    const droppedTables = [...sql.matchAll(/DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+[`"]?([A-Za-z0-9_]+)[`"]?/gi)].map(
      (match) => match[1],
    );
    const unsafeTables = droppedTables.filter((table) => referencedTables.has(table));

    if (unsafeTables.length > 0) {
      throw new Error(
        `${file} rebuilds referenced table(s) ${unsafeTables.join(", ")} with DROP TABLE. ` +
          "D1 can keep foreign-key cascades active during migrations and delete dependent rows. " +
          "Use additive ALTER TABLE statements or a migration strategy that preserves child rows.",
      );
    }
  }
}

try {
  await checkAppliedMigrationsStillExist();
  await checkForUnsafeParentTableRebuilds();
  await cp(migrationMetaDirectory, temporaryMetaDirectory, { recursive: true });

  const journalPath = join(temporaryMetaDirectory, "_journal.json");
  const before = JSON.parse(await readFile(journalPath, "utf8")) as DrizzleJournal;
  const process = Bun.spawn(
    [
      "bunx",
      "drizzle-kit",
      "generate",
      "--dialect",
      "sqlite",
      "--schema",
      "../../packages/db/src/schema/index.ts",
      "--out",
      temporaryOutputDirectory,
      "--name",
      "schema_check",
      "--prefix",
      "index",
      "--breakpoints",
    ],
    {
      cwd: apiDirectory,
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr || stdout || "Drizzle schema check failed");
  }

  const after = JSON.parse(await readFile(journalPath, "utf8")) as DrizzleJournal;
  if (after.entries.length !== before.entries.length) {
    throw new Error(
      "Drizzle schema differs from the committed migration snapshot. Run `bun run db:generate -- --name <change_name>` from apps/api and commit the SQL and metadata together.",
    );
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
