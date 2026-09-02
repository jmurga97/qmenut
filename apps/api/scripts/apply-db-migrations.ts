import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type Environment = "development" | "production";

interface CommandResult {
  exitCode: number;
  stdout: string;
}

interface TimeTravelInfo {
  bookmark: string;
}

const CRITICAL_TABLES = [
  "users",
  "restaurants",
  "branches",
  "restaurant_users",
  "restaurant_languages",
  "branch_subscriptions",
  "branch_photos",
  "branch_schedules",
  "categories",
  "dishes",
  "ingredients",
  "dish_extras",
  "dish_variant_groups",
  "dish_variant_options",
  "translations",
  "promotions",
  "promotion_targets",
  "customers",
  "customer_restaurants",
  "customer_visits",
  "loyalty_programs",
  "loyalty_rewards",
  "loyalty_transactions",
  "loyalty_redemptions",
  "campaigns",
  "campaign_sends",
  "orders",
  "order_items",
  "payments",
] as const;
type CriticalRowCounts = Map<string, number>;

const apiDirectory = resolve(import.meta.dir, "..");
const safetyDirectory = join(apiDirectory, ".wrangler", "migration-safety");
const cliArguments = process.argv.slice(2);
const environment = cliArguments[0];
const allowDataLoss = cliArguments.includes("--allow-data-loss");
const productionConfirmed = cliArguments.includes("--confirm-production");
const autoRollback = cliArguments.includes("--auto-rollback");

if (environment !== "development" && environment !== "production") {
  throw new Error(
    "Usage: bun scripts/apply-db-migrations.ts <development|production> " +
      "[--confirm-production] [--allow-data-loss] [--auto-rollback]",
  );
}

if (environment === "production" && !productionConfirmed) {
  throw new Error(
    "Production migration blocked. Re-run with --confirm-production after reviewing the pending " +
      "SQL and production row assumptions.",
  );
}

async function run(command: string[], output: "capture" | "inherit" = "inherit"): Promise<CommandResult> {
  const process = Bun.spawn(command, {
    cwd: apiDirectory,
    stdout: output === "capture" ? "pipe" : "inherit",
    stderr: "inherit",
  });
  const [exitCode, stdout] = await Promise.all([
    process.exited,
    output === "capture" ? new Response(process.stdout).text() : Promise.resolve(""),
  ]);

  return { exitCode, stdout };
}

async function runChecked(command: string[], output: "capture" | "inherit" = "inherit"): Promise<string> {
  const result = await run(command, output);
  if (result.exitCode !== 0) {
    throw new Error(`Command failed with exit code ${result.exitCode}: ${command.join(" ")}`);
  }

  return result.stdout;
}

async function runWranglerJson<T>(arguments_: string[]): Promise<T> {
  const stdout = await runChecked(["bunx", "wrangler", ...arguments_, "--json"], "capture");
  return JSON.parse(stdout) as T;
}

async function queryOne<T>(target: Environment, sql: string, failure: string): Promise<T[]> {
  const response = await runWranglerJson<Array<{ results: T[]; success: boolean }>>([
    "d1",
    "execute",
    "DB",
    "--remote",
    "--env",
    target,
    "--command",
    sql,
  ]);

  if (!response[0]?.success) throw new Error(failure);

  return response[0].results;
}

/**
 * A database that has never been migrated has none of these tables yet, and a later migration may
 * introduce one, so count only the tables that are actually there. A table that exists before the
 * migration and is gone after it counts as total loss.
 */
async function readCriticalRowCounts(target: Environment): Promise<CriticalRowCounts> {
  const tables = await queryOne<{ name: string }>(
    target,
    "SELECT name FROM sqlite_master WHERE type = 'table'",
    "Could not list the tables in the database.",
  );
  const present = CRITICAL_TABLES.filter((table) => tables.some((row) => row.name === table));

  if (present.length === 0) return new Map();

  const expressions = present.map((table) => `(SELECT COUNT(*) FROM ${table}) AS ${table}`).join(", ");
  const [counts] = await queryOne<Record<string, number>>(
    target,
    `SELECT ${expressions}`,
    "Could not read critical row counts.",
  );

  if (counts === undefined) throw new Error("Could not read critical row counts.");

  return new Map(
    present.map((table) => {
      const count = counts[table];
      if (typeof count !== "number") throw new Error(`Missing row count for ${table}.`);
      return [table, count];
    }),
  );
}

/**
 * A Time Travel restore rewinds the whole database, not just this migration: every write made
 * since the bookmark is discarded. That is too destructive to do automatically on a signal as
 * coarse as a row-count drop, which ordinary traffic can trigger on its own. So the default is
 * to stop, hand over the exact recovery command, and let a human decide.
 */
async function failMigration(
  target: Environment,
  bookmark: string,
  reason: string,
  recordPath: string,
  record: Record<string, unknown>,
): Promise<never> {
  const restoreCommand = [
    "bunx",
    "wrangler",
    "d1",
    "time-travel",
    "restore",
    "DB",
    "--env",
    target,
    "--bookmark",
    bookmark,
  ];

  console.error(`\nMigration safety check failed: ${reason}`);

  if (!autoRollback) {
    await writeFile(
      recordPath,
      `${JSON.stringify({ ...record, failedAt: new Date().toISOString(), reason, rolledBack: false }, null, 2)}\n`,
      "utf8",
    );
    console.error(
      `\nThe database was NOT rolled back. Restoring rewinds ${target} entirely and discards every\n` +
        `write made since the bookmark, so review the damage first. To roll back, run:\n\n` +
        `  ${restoreCommand.join(" ")}\n\n` +
        `Recovery record: ${recordPath}`,
    );
    throw new Error(`Migration failed and was left in place for review: ${reason}`);
  }

  console.error(`--auto-rollback given; restoring ${target} to bookmark ${bookmark}...`);
  const restored = JSON.parse(await runChecked([...restoreCommand, "--json"], "capture")) as {
    bookmark?: string;
    previous_bookmark?: string;
  };
  // Keep the undo bookmark: the rollback itself may turn out to be the wrong call.
  await writeFile(
    recordPath,
    `${JSON.stringify(
      { ...record, failedAt: new Date().toISOString(), reason, rolledBack: true, restored },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.error(
    `Rolled back. To undo this rollback, restore to bookmark ${restored.previous_bookmark ?? "(see above)"}.\n` +
      `Recovery record: ${recordPath}`,
  );
  throw new Error(`Migration rolled back with D1 Time Travel: ${reason}`);
}

async function applyMigrations(target: Environment): Promise<void> {
  await runChecked(["bun", "run", "db:check"]);

  const beforeCounts = await readCriticalRowCounts(target);
  const timeTravel = await runWranglerJson<TimeTravelInfo>(["d1", "time-travel", "info", "DB", "--env", target]);
  const recordedAt = new Date().toISOString();
  const recordPath = join(safetyDirectory, `${recordedAt.replaceAll(":", "-")}-${target}.json`);
  const record = { environment: target, recordedAt, ...timeTravel, beforeCounts: Object.fromEntries(beforeCounts) };

  await mkdir(safetyDirectory, { recursive: true });
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.log(`Pre-migration recovery bookmark: ${timeTravel.bookmark}`);
  console.log(`Recovery record: ${recordPath}`);

  const migration = await run(["bunx", "wrangler", "d1", "migrations", "apply", "DB", "--remote", "--env", target]);

  if (migration.exitCode !== 0) {
    await failMigration(
      target,
      timeTravel.bookmark,
      "Wrangler did not apply every migration successfully.",
      recordPath,
      record,
    );
  }

  const afterCounts = await readCriticalRowCounts(target).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return failMigration(
      target,
      timeTravel.bookmark,
      `post-migration integrity check failed (${message})`,
      recordPath,
      record,
    );
  });
  const losses = [...beforeCounts].flatMap(([table, before]) => {
    const after = afterCounts.get(table);
    if (after !== undefined && after >= before) return [];
    return [`${table}: ${before} -> ${after ?? "table missing"}`];
  });

  if (losses.length > 0 && !allowDataLoss) {
    await failMigration(
      target,
      timeTravel.bookmark,
      `critical row loss detected (${losses.join(", ")})`,
      recordPath,
      record,
    );
  }

  if (losses.length > 0) {
    console.warn(`Explicitly allowed row loss: ${losses.join(", ")}`);
  }

  await writeFile(
    recordPath,
    `${JSON.stringify({ ...record, afterCounts: Object.fromEntries(afterCounts), completed: true }, null, 2)}\n`,
    "utf8",
  );
  console.log("Migrations applied without critical row loss.");
}

await applyMigrations(environment);
