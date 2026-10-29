import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/api/health',
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
    env: {
      LOCAL_DB_PATH: '.local/e2e-postgres',
      GEMINI_API_KEY: '',
      APP_ORIGIN: 'http://localhost:5173',
    },
  },
});
