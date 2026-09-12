// Orquestador de deploy: preflight → tests → build → migraciones D1 → deploy a Cloudflare.
//
//   bun run deploy --development
//   bun run deploy --production [--allow-data-loss] [--auto-rollback]
//
// El flag de entorno es obligatorio (no hay default). El primer paso que falla detiene todo.
// En production las migraciones se auto-confirman: escribir --production ya es la confirmación
// que el wrapper de migraciones exige.

import { join, relative, resolve } from "node:path";

type Environment = "development" | "production";

interface EnvironmentConfig {
  adminOrigin: string;
  apiBaseUrl: string;
  devFixedOtp: string;
}

const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    adminOrigin: "https://admin.dev.qmenut.app",
    apiBaseUrl: "https://api.dev.qmenut.app",
    devFixedOtp: "000000",
  },
  production: {
    adminOrigin: "https://admin.qmenut.app",
    apiBaseUrl: "https://api.qmenut.app",
    devFixedOtp: "",
  },
};

const KNOWN_FLAGS = new Set(["--development", "--production", "--allow-data-loss", "--auto-rollback"]);
const MIGRATION_FLAGS = new Set(["--allow-data-loss", "--auto-rollback"]);

const rootDirectory = resolve(import.meta.dir, "..");
const opsDirectory = resolve(rootDirectory, "../qmenut-ops");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArguments(arguments_: string[]): {
  environment: Environment;
  migrationFlags: string[];
} {
  const unknown = arguments_.filter((argument) => !KNOWN_FLAGS.has(argument));
  if (unknown.length > 0) fail(`Argumentos desconocidos: ${unknown.join(", ")}`);

  const selected = arguments_.filter((argument) => argument === "--development" || argument === "--production");
  if (selected.length !== 1) {
    fail("Usage: bun run deploy --development | --production [--allow-data-loss] [--auto-rollback]");
  }

  return {
    environment: selected[0] === "--development" ? "development" : "production",
    migrationFlags: arguments_.filter((argument) => MIGRATION_FLAGS.has(argument)),
  };
}

async function run(command: string[], cwd: string, extraEnvironment: Record<string, string> = {}): Promise<void> {
  const child = Bun.spawn(command, {
    cwd,
    env: { ...process.env, ...extraEnvironment },
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    const directory = relative(rootDirectory, cwd) || ".";
    throw new Error(`exit ${exitCode}: ${command.join(" ")} (cwd: ${directory})`);
  }
}

async function step(title: string, action: () => Promise<void>): Promise<void> {
  console.log(`\n▶ ${title}`);
  await action();
}

const { environment, migrationFlags } = parseArguments(process.argv.slice(2));
const config = ENVIRONMENT_CONFIGS[environment];
const appDirectory = (name: string) => join(rootDirectory, "apps", name);

try {
  await step(`Preflight ${environment}`, () =>
    run(["bun", join(opsDirectory, "scripts/check-deployment-config.ts"), environment], rootDirectory),
  );

  await step("Unit tests", () => run(["bun", "test", "packages"], rootDirectory));

  await step("E2E tests", () => run(["bun", "run", "--cwd", "e2e", "test"], rootDirectory));

  await step("Build", () => run(["bun", "run", "build"], rootDirectory));

  await step("Type check", () => run(["bun", "run", "check"], rootDirectory));

  await step(`D1 migrations ${environment}`, async () => {
    const flags = environment === "production" ? ["--confirm-production", ...migrationFlags] : migrationFlags;
    await run(["bun", join(opsDirectory, "scripts/apply-db-migrations.ts"), environment, ...flags], rootDirectory);
  });

  await step("Deploy tenant-config", async () => {
    await run(["bunx", "wrangler", "deploy", "--env", environment], appDirectory("tenant-config"));
  });

  await step("Deploy api", async () => {
    await run(["bunx", "wrangler", "deploy", "--env", environment], appDirectory("api"));
  });

  // web: @cloudflare/vite-plugin resuelve el entorno en build time vía CLOUDFLARE_ENV y escribe
  // la config de deploy bajo dist/server. El deploy NO lleva --env.
  await step("Deploy web", async () => {
    await run(["bun", "run", "build"], appDirectory("web"), {
      CLOUDFLARE_ENV: environment,
      VITE_ADMIN_ORIGIN: config.adminOrigin,
    });
    await run(["bunx", "wrangler", "deploy"], appDirectory("web"), {
      CLOUDFLARE_ENV: environment,
    });
  });

  await step("Deploy admin", async () => {
    await run(["bun", "run", "build"], appDirectory("admin"), {
      VITE_API_BASE_URL: config.apiBaseUrl,
      VITE_DEV_FIXED_OTP: config.devFixedOtp,
    });
    await run(["bunx", "wrangler", "deploy", "--env", environment], appDirectory("admin"));
  });

  if (environment === "production") {
    await step("Deploy landing", async () => {
      await run(["bun", "run", "build"], appDirectory("landing"));
      await run(["bunx", "wrangler", "deploy", "--env", "production"], appDirectory("landing"));
    });
  }

  console.log(`\n✓ Deploy ${environment} completado`);
} catch (error) {
  fail(`\n✗ Deploy ${environment} falló: ${error instanceof Error ? error.message : String(error)}`);
}
