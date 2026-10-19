import { defineConfig, devices } from '@playwright/test';

// Pruebas de punta a punta contra los emuladores locales de Firebase:
//   npm run test:e2e
// (enciende los emuladores, levanta la app en modo emulador y abre Chromium)
const PORT = 5174;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } } },
  ],
  webServer: {
    command: `AI_FAKE=1 npx vite --mode emulador --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
