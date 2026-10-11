import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 120000, workers: 1, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure', launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {} },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 } } }],
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3001', url: 'http://127.0.0.1:3001', reuseExistingServer: false, timeout: 120000, env: {
    NEXT_DIST_DIR: '.next-e2e',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'test-key', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-motivationsboost', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-motivationsboost.firebaseapp.com', NEXT_PUBLIC_FIREBASE_APP_ID: 'test-app', NEXT_PUBLIC_USE_EMULATORS: 'true',
    FIREBASE_PROJECT_ID: 'demo-motivationsboost', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  } },
});
