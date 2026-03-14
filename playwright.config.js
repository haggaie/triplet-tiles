// @ts-check
const path = require('path');
const { defineConfig } = require('@playwright/test');

// Use project-local browsers so Cursor's test runner (which may use a different
// HOME/env) finds them. Run once: npx playwright install
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 800, height: 1200 }
  },
  webServer: {
    command: 'npx http-server . -p 4173 -c-1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});

