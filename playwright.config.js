// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright config for CMMS static HTML tests.
 *
 * The test server is a plain Python http.server that serves backoffice.html
 * and qr.html at http://localhost:8888. Tests mock the backend API entirely
 * so no real backend is needed.
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 15_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,          // tests share the same static server process
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:8888',
    // All network calls to the backend are intercepted in each test; no real
    // server is needed for the API.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Spin up Python's built-in HTTP server before the suite runs.
  webServer: {
    command: 'python3 -m http.server 8888',
    url: 'http://localhost:8888',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
