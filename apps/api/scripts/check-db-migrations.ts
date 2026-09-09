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

// D1 keys d1_migrations on the filename, so renaming an applied migration makes D1 replay it
// against a schema that already has the change. Every filename below has been applied to a remote
// database and is frozen. Append a name here once it has been applied remotely; never edit or
// remove one.
const REMOTELY_APPLIED_MIGRATIONS = [
  "0000_squashed_baseline.sql",
  "0001_drop_future_product_tables.sql",
  "0002_add_image_variants_catalog.sql",
  "0003_durable_image_assignments.sql",
  "0004_image_upload_ownership.sql",
  // Recorded on the read-only pre-squash rollback database qmenut-db-v2; regenerated with the
  // final translations schema before any active database applied it.
  "0005_integral_translations.sql",
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

/**
 * Dropping a parent table while a live child still references it makes D1's foreign-key
 * cascades delete dependent rows. A drop is therefore only safe once every table that
 * references it has already been dropped earlier in the same migration.
 */
async function checkForUnsafeParentTableRebuilds(): Promise<void> {
  const migrationsDirectory = join(apiDirectory, "migrations");
  const migrationFiles = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql"));
  const migrations = await Promise.all(
    migrationFiles.map(async (file) => ({
      file,
      statements: (await readFile(join(migrationsDirectory, file), "utf8")).split("--> statement-breakpoint"),
    })),
  );
  const referencingTables = new Map<string, Set<string>>();

  for (const { statements } of migrations) {
    for (const statement of statements) {
      const subjectMatch = statement.match(/(?:CREATE\s+TABLE|ALTER\s+TABLE)\s+[`"]?([A-Za-z0-9_]+)[`"]?/i);

      if (subjectMatch === null) continue;

      const subject = subjectMatch[1];

      for (const match of statement.matchAll(/REFERENCES\s+[`"]?([A-Za-z0-9_]+)[`"]?/gi)) {
        const referenced = match[1];

        if (referenced === subject) continue;

        const tables = referencingTables.get(referenced) ?? new Set<string>();
        tables.add(subject);
        referencingTables.set(referenced, tables);
      }
    }
  }

  for (const { file, statements } of migrations) {
    const dropped = new Set<string>();

    for (const statement of statements) {
      const dropMatch = statement.match(/DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+[`"]?([A-Za-z0-9_]+)[`"]?/i);

      if (dropMatch === null) continue;

      const table = dropMatch[1];
      const unsafeTables = [...(referencingTables.get(table) ?? [])].filter((child) => !dropped.has(child));

      if (unsafeTables.length > 0) {
        throw new Error(
          `${file} drops ${table} while ${unsafeTables.join(", ")} still reference(s) it. ` +
            "D1 can keep foreign-key cascades active during migrations and delete dependent rows. " +
            "Drop the referencing tables first or use additive ALTER TABLE statements.",
        );
      }

      dropped.add(table);
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
