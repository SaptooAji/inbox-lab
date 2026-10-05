import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const IS_CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  // `.e2e.ts` keeps Vitest from picking these files up.
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  reporter: IS_CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // The dev server runs with NODE_ENV=development, so the production guard
    // that refuses console, noop and memory drivers does not apply.
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
    // These win over .env.local, so a test run can never send a real email.
    env: {
      EMAIL_DRIVER: "console",
      RESEND_API_KEY: "",
      BOT_DRIVER: "noop",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      RATE_LIMIT_DRIVER: "memory",
      WEBHOOK_URL: "",
      IDENTITY_HASH_SALT: "e2e-only-salt-0123456789",
      SENDING_ENABLED: "true",
      GLOBAL_DAILY_CAP: "1000",
      PER_RECIPIENT_DAILY_LIMIT: "1000",
      PER_IP_DAILY_LIMIT: "1000",
      SITE_URL: BASE_URL,
      LOG_LEVEL: "warn",
    },
  },
});
