import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/local",
  timeout: 900000,
  expect: { timeout: 10000 },
  workers: 1,
  fullyParallel: false,
  reporter: [
    ["list"],
    ["json", { outputFile: "local-evidence/playwright.json" }],
  ],
  use: {
    actionTimeout: 15000,
    baseURL: "http://127.0.0.1:3210",
    trace: "retain-on-failure",
  },
  projects: [{ name: "local-chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.CI
    ? {
        command: "npm run start:local",
        url: "http://127.0.0.1:3210",
        timeout: 60000,
        env: { LOCAL_DATA_DIR: "local-evidence/ci-data" },
      }
    : undefined,
});
