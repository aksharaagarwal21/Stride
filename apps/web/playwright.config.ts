import { defineConfig, devices } from '@playwright/test';

// Browser smoke test against the real API and database. By default it starts `pnpm dev`
// (API + Vite) from the repo root, or reuses servers that are already running.
// Set E2E_BASE_URL to test another running instance (e.g. the Docker build on :8080).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm --dir ../.. dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
