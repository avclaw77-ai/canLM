// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3199',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npx serve . -l 3199 --no-clipboard',
    port: 3199,
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
