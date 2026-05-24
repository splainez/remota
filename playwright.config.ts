import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5174",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite dev --config vite.renderer.test.config.ts",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
