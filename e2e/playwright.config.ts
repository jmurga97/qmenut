import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const runVisual = isCi || process.env.E2E_VISUAL === "1";

export default defineConfig({
  testDir: ".",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  retries: isCi ? 1 : 0,
  failOnFlakyTests: isCi,
  forbidOnly: isCi,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    actionTimeout: 10_000,
    locale: "es-ES",
    navigationTimeout: 20_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "bun run --cwd ../apps/api dev:e2e",
      url: "http://localhost:8787/health",
      // Never reuse `bun run dev`: it loads .dev.vars (real DeepL key, different loyalty secret).
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "bun run --cwd ../apps/tenant-config dev",
      url: "http://localhost:8788/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "VITE_PUBLIC_MENU_PORT=4011 bun run --cwd ../apps/admin dev",
      url: "http://localhost:5174",
      // The dev admin previews the public menu on 5173, not on the E2E worker at 4011.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "VITE_ADMIN_ORIGIN=http://localhost:5174 bun run --cwd ../apps/web build && bun run --cwd ../apps/web wrangler dev --config dist/server/wrangler.json --port 4011 --persist-to ../../.wrangler-shared/state --var DISABLE_EDGE_CACHE:false",
      url: "http://tapas.localhost:4011/robots.txt",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
  projects: [
    {
      name: "setup",
      testMatch: /setup\/auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5174" },
    },
    {
      name: "admin",
      testMatch: /tests\/admin\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
        storageState: ".auth/admin.json",
      },
    },
    {
      name: "web",
      testMatch: /tests\/web\/.*\.spec\.ts/,
      testIgnore: [/tests\/web\/desktop-.*\.spec\.ts/, /tests\/web\/templates\.spec\.ts/],
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], baseURL: "http://tapas.localhost:4011", locale: "es-ES" },
    },
    {
      name: "web-desktop",
      testMatch: /tests\/web\/desktop-.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], baseURL: "http://tapas.localhost:4011", locale: "es-ES" },
    },
    ...(runVisual
      ? [
          {
            name: "visual",
            testMatch: /tests\/web\/templates\.spec\.ts/,
            snapshotPathTemplate: "{testDir}/snapshots/{testFilePath}/{platform}/{arg}{ext}",
            dependencies: ["setup"],
            use: { ...devices["Pixel 7"], baseURL: "http://tapas.localhost:4011", locale: "es-ES" },
          },
        ]
      : []),
    {
      name: "cross",
      testMatch: /tests\/cross\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
        storageState: ".auth/admin.json",
      },
    },
    ...[
      { name: "critical-webkit", device: "iPhone 13" },
      { name: "critical-firefox", device: "Desktop Firefox" },
    ].map(({ name, device }) => ({
      name,
      testMatch: /tests\/.*\.spec\.ts/,
      grep: /@critical/,
      dependencies: ["setup"],
      use: {
        ...devices[device],
        baseURL: "http://localhost:5174",
        storageState: ".auth/admin.json",
        locale: "es-ES",
      },
    })),
  ],
});
