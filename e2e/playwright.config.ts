import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const reuseExistingServer = process.env.E2E_REUSE_SERVERS === "1";
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
    navigationTimeout: 20_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "bun run --cwd ../apps/api dev:e2e",
      url: "http://localhost:8787/health",
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: "bun run --cwd ../apps/tenant-config dev",
      url: "http://localhost:8788/health",
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: "bun run --cwd ../apps/admin dev",
      url: "http://localhost:5174",
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: "bun run --cwd ../apps/web build && bun run --cwd ../apps/web serve",
      url: "http://tapas.localhost:4011/robots.txt",
      reuseExistingServer,
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
  ],
});
