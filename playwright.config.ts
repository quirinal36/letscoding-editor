import { defineConfig, devices } from "@playwright/test";
const authTest = process.env.EDITOR_AUTH_TEST === "true";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: authTest ? "auth.spec.ts" : undefined,
  testIgnore: authTest ? [] : ["**/auth.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI && !authTest,
    timeout: 120000,
    env: {
      EDITOR_DEMO_MODE: authTest ? "false" : "true",
      ...(authTest
        ? {
            NEXT_PUBLIC_SUPABASE_URL: "https://editor-auth.test",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
            SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
          }
        : {}),
      EDITOR_AI_ENABLED: "false",
      EDITOR_IMAGE_ENABLED: "false",
      EDITOR_DEPLOY_ENABLED: "false",
    },
  },
});
