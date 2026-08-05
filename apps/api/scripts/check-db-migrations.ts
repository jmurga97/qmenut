import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

interface DrizzleJournal {
  entries: unknown[];
}

const apiDirectory = resolve(import.meta.dir, "..");
const migrationMetaDirectory = join(apiDirectory, "migrations", "meta");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "qmenut-drizzle-check-"));
const temporaryMetaDirectory = join(temporaryDirectory, "meta");

try {
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
      temporaryDirectory,
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
