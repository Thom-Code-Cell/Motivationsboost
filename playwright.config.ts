import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';

const baseURL = 'http://127.0.0.1:55321';
export default defineConfig({
  testDir: './tests/e2e', timeout: 120000, workers: 1, fullyParallel: false,
  globalSetup: './tests/e2e/setup.ts',
  use: { baseURL, trace: 'retain-on-failure', launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {} },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 } } }],
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 55321', url: baseURL, reuseExistingServer: false, timeout: 120000, env: {
    NEXT_DIST_DIR: '.next-e2e',
    DATABASE_URL: process.env.MOTIVATIONS_E2E_DATABASE_URL || '',
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    BETTER_AUTH_URL: baseURL,
    BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION: 'false',
    NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED: 'false',
    NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED: 'false',
    INTERNAL_TEST_MODE: 'false',
    NEXT_PUBLIC_INTERNAL_TEST_MODE: 'false',
    OPENAI_API_KEY: '',
    PAYREXX_PAYMENTS_ENABLED: 'false',
    PAYREXX_BILLING_VALIDATED: 'false',
    PAYREXX_WEBHOOK_ENABLED: 'false',
  } },
});
