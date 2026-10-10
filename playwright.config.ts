import { defineConfig, devices } from "@playwright/test";
const authTest = process.env.EDITOR_AUTH_TEST === "true";
export default defineConfig({
  outputDir: authTest ? "test-results/auth" : "test-results/demo",
  testDir: "./tests/e2e",
  testMatch: authTest ? "auth.spec.ts" : undefined,
  testIgnore: authTest ? [] : ["**/auth.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run dev -- --port 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      EDITOR_E2E: "true",
      // Production waits 60 seconds; tests keep the old 1-second rhythm.
      EDITOR_AUTOSAVE_MS: "1000",
      EDITOR_DEMO_MODE: authTest ? "false" : "true",
      ...(authTest
        ? {
            NEXT_PUBLIC_SUPABASE_URL: "https://editor-auth.test",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
            SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
            OPENROUTER_API_KEY: "test-only-no-billing",
            OPENROUTER_MODEL_CODE: "test/model",
            EDITOR_AI_DAILY_LIMIT_USD: "1",
            EDITOR_AI_MONTHLY_LIMIT_USD: "1",
            EDITOR_AI_MAX_TURN_USD: "1",
          }
        : {}),
      EDITOR_AI_ENABLED: authTest ? "true" : "false",
      EDITOR_IMAGE_ENABLED: "false",
      EDITOR_DEPLOY_ENABLED: "false",
    },
  },
});
