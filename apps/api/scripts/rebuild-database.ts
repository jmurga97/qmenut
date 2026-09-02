/**
 * Rebuilds a D1 database against the squashed baseline without losing rows.
 *
 * `restaurants` and `branches` carry CHECK constraints that reference their own columns
 * (`"restaurants"."default_currency"`), which makes the legacy tables impossible to rename or to
 * alter in place: SQLite rejects both, and `DROP TABLE` cascades into every child row. The only
 * safe path is therefore to build a clean database from the baseline and copy the rows across.
 *
 * This script never writes to a remote database. It exports the source, reshapes the data locally,
 * verifies that nothing was lost, and writes the import file plus the commands to apply it.
 */
import { Database } from "bun:sqlite";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type Environment = "development" | "production";

const DATABASE_BY_ENVIRONMENT = {
  development: { source: "qmenut-db-v2-dev", target: "qmenut-db-dev" },
  production: { source: "qmenut-db-v2", target: "qmenut-db" },
} as const;

const apiDirectory = resolve(import.meta.dir, "..");
const workDirectory = join(apiDirectory, ".wrangler", "rebuild");
const baselinePath = join(apiDirectory, "migrations", "0000_squashed_baseline.sql");
const environment = process.argv[2];

if (environment !== "development" && environment !== "production") {
  throw new Error("Usage: bun scripts/rebuild-database.ts <development|production>");
}

async function runChecked(command: string[]): Promise<void> {
  const child = Bun.spawn(command, { cwd: apiDirectory, stdout: "inherit", stderr: "inherit" });
  if ((await child.exited) !== 0) throw new Error(`Command failed: ${command.join(" ")}`);
}

function userTables(database: Database): string[] {
  return database
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type = 'table' " +
        "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' ORDER BY name",
    )
    .all()
    .map((row) => row.name);
}

function columnsOf(database: Database, table: string): string[] {
  return database
    .query<{ name: string }, []>(`PRAGMA table_info("${table}")`)
    .all()
    .map((row) => row.name);
}

/** Parent tables first, so the import satisfies foreign keys as it streams. */
function parentsFirst(database: Database, tables: string[]): string[] {
  const known = new Set(tables);
  const parentsOf = new Map(
    tables.map((table) => [
      table,
      new Set(
        database
          .query<{ table: string }, []>(`PRAGMA foreign_key_list("${table}")`)
          .all()
          .map((row) => row.table)
          .filter((parent) => known.has(parent) && parent !== table),
      ),
    ]),
  );
  const ordered: string[] = [];
  const placed = new Set<string>();

  while (placed.size < tables.length) {
    const ready = tables.filter(
      (table) => !placed.has(table) && [...parentsOf.get(table)!].every((parent) => placed.has(parent)),
    );
    // A foreign-key cycle cannot be ordered; emit the rest and let the import defer the checks.
    const batch = ready.length > 0 ? ready : tables.filter((table) => !placed.has(table));
    for (const table of batch) {
      ordered.push(table);
      placed.add(table);
    }
  }

  return ordered;
}

function toSqlLiteral(value: unknown): string {
  if (value === null) return "NULL";
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString("hex")}'`;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

await rm(workDirectory, { recursive: true, force: true });
await mkdir(workDirectory, { recursive: true });

const exportPath = join(workDirectory, `${environment}-export.sql`);
const sourcePath = join(workDirectory, `${environment}-source.db`);
const targetPath = join(workDirectory, `${environment}-target.db`);
const importPath = join(workDirectory, `${environment}-import.sql`);

console.log(`Exporting ${DATABASE_BY_ENVIRONMENT[environment].source}...`);
await runChecked([
  "bunx",
  "wrangler",
  "d1",
  "export",
  DATABASE_BY_ENVIRONMENT[environment].source,
  "--remote",
  "--env",
  environment,
  "--output",
  exportPath,
  "--skip-confirmation",
]);

const source = new Database(sourcePath, { create: true });
source.run("PRAGMA foreign_keys=OFF");
source.run(await readFile(exportPath, "utf8"));

const target = new Database(targetPath, { create: true });
target.run("PRAGMA foreign_keys=OFF");
target.run((await readFile(baselinePath, "utf8")).replaceAll("--> statement-breakpoint", ""));

const sourceTables = new Set(userTables(source));
const missingTables = userTables(target).filter((table) => !sourceTables.has(table));
if (missingTables.length > 0) {
  throw new Error(`The export is missing table(s) ${missingTables.join(", ")}. Aborting.`);
}

const ordered = parentsFirst(target, userTables(target));
// The baseline seeds the immutable catalog, so the copy has to be authoritative rather than
// additive. Clearing children first keeps the deletes from cascading into rows still to come.
const statements: string[] = [...ordered].reverse().map((table) => `DELETE FROM "${table}";`);
const report: Array<{ table: string; rows: number; dropped: string[] }> = [];

for (const table of ordered) {
  target.run(`DELETE FROM "${table}"`);
}

for (const table of ordered) {
  const sourceColumns = new Set(columnsOf(source, table));
  const shared = columnsOf(target, table).filter((column) => sourceColumns.has(column));
  const dropped = columnsOf(source, table).filter((column) => !shared.includes(column));
  const quoted = shared.map((column) => `"${column}"`).join(", ");
  const rows = source.query(`SELECT ${quoted} FROM "${table}"`).values() as unknown[][];

  for (const row of rows) {
    const values = row.map(toSqlLiteral).join(", ");
    const insert = `INSERT INTO "${table}" (${quoted}) VALUES (${values});`;
    target.run(insert);
    statements.push(insert);
  }

  report.push({ table, rows: rows.length, dropped });
}

// The copy is only trustworthy if every row landed and the graph still resolves.
const violations = target.query("PRAGMA foreign_key_check").all();
if (violations.length > 0) {
  throw new Error(`Foreign-key violations after the copy: ${JSON.stringify(violations)}`);
}

let lost = false;
console.log(`\n${"table".padEnd(28)}${"rows".padStart(8)}  notes`);
for (const { table, rows, dropped } of report) {
  const sourceRows = source.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM "${table}"`).get()!.n;
  const mismatch = sourceRows !== rows;
  lost ||= mismatch;
  const notes = [
    dropped.length > 0 ? `dropped legacy column(s) ${dropped.join(", ")}` : "",
    mismatch ? `<<< LOSS source=${sourceRows} target=${rows}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (rows > 0 || notes) console.log(`${table.padEnd(28)}${String(rows).padStart(8)}  ${notes}`);
}

if (lost) throw new Error("Row counts do not match. Nothing was written remotely; investigate before retrying.");

await writeFile(importPath, `${statements.join("\n")}\n`, "utf8");
console.log(`\nAll rows copied and foreign keys verified. Import file: ${importPath}`);
const target_ = DATABASE_BY_ENVIRONMENT[environment].target;
console.log(
  `\nNothing has been written remotely. To finish, create the new database, apply the baseline,\n` +
    `then import the data:\n\n` +
    `  bunx wrangler d1 create ${target_}\n` +
    `  # put the returned database_id into wrangler.jsonc for the ${environment} environment, then\n` +
    `  # from the repository root (these need apps/api's wrangler.jsonc):\n` +
    `  bun run --cwd apps/api db:migrate${environment === "development" ? ":development" : " -- --confirm-production"}\n` +
    `  bunx wrangler --cwd apps/api d1 execute DB --remote --env ${environment} --file ${importPath}\n`,
);
