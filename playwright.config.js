import { defineConfig } from '@playwright/test';

// `npm test` builds the game, serves it, and replays the recorded gameplay runs.
// First time on a new machine: `npx playwright install chromium`.
export default defineConfig({
  testDir: 'tests',
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 390, height: 844 },
    launchOptions: {
      args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    },
  },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60000 },
});
