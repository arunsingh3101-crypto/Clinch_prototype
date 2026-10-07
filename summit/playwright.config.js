import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.CHROMIUM_PATH || (process.env.PLAYWRIGHT_BROWSERS_PATH ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 1280, height: 704 },
    launchOptions: { executablePath, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    { name: 'desktop', use: {} },
    { name: 'phone', use: { ...devices['Pixel 7'], launchOptions: { executablePath, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
  },
});
