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
    [...allSql.matchAll(/REFERENCES\s+[`\"]?([A-Za-z0-9_]+)[`\"]?/gi)].map((match) => match[1]),
  );

  for (const { file, sql } of migrations) {
    const droppedTables = [...sql.matchAll(/DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+[`\"]?([A-Za-z0-9_]+)[`\"]?/gi)].map(
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
