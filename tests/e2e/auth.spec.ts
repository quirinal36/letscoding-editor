import { test, expect } from "@playwright/test";

const email = "student@example.test";
const password = "test-password-only";
const userId = "00000000-0000-4000-8000-000000000001";
const session = () => ({
  access_token: `test.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`,
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "test-refresh-token",
  user: { id: userId, email, aud: "authenticated", role: "authenticated" },
});

test.beforeEach(async ({ page }) => {
  // Every Auth request is intercepted: these tests never use live accounts.
  await page.route("https://editor-auth.test/**", (route) =>
    route.fulfill({ status: 400, json: { msg: "Unexpected auth request" } }),
  );
  await page.route("**/api/models", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/editor", (route) => {
    const body = route.request().postDataJSON();
    expect(body).not.toHaveProperty("password");
    expect(route.request().headers().authorization).toMatch(/^Bearer test\./);
    return route.fulfill({
      json:
        body.action === "session" ? { id: userId, email, role: "student" } : [],
    });
  });
});

test("password login stores the session and opens the authorized workspace", async ({
  page,
}) => {
  let calls = 0;
  await page.route(
    "https://editor-auth.test/auth/v1/token?grant_type=password",
    (route) => {
      calls++;
      expect(route.request().postDataJSON()).toMatchObject({ email, password });
      return route.fulfill({ json: session() });
    },
  );
  await page.goto("/");
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호", { exact: true }).press("Enter");
  await expect(
    page.getByRole("button", { name: "프로젝트 만들기", exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "프로젝트 만들기", exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
});

test("failed credentials show a safe error and allow retry without duplicate submits", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route(
    "https://editor-auth.test/auth/v1/token?grant_type=password",
    async (route) => {
      calls++;
      await gate;
      await route.fulfill({
        status: 400,
        json: { code: "invalid_credentials", msg: "Invalid login credentials" },
      });
    },
  );
  await page.goto("/");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "로그인 중…", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "이메일과 비밀번호를 확인해주세요",
  );
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "이메일로 로그인", exact: true }),
  ).toBeEnabled();
  expect(calls).toBe(1);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("another-test-password");
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await expect.poll(() => calls).toBe(2);
});

test("valid Auth credentials do not bypass the server account gate", async ({
  page,
}) => {
  await page.route(
    "https://editor-auth.test/auth/v1/token?grant_type=password",
    (route) => route.fulfill({ json: session() }),
  );
  await page.route("**/api/editor", (route) =>
    route.fulfill({
      status: 403,
      json: { error: "활동 중인 계정만 사용할 수 있습니다." },
    }),
  );
  await page.goto("/");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "활동 중인 계정만",
  );
  await expect(
    page.getByRole("button", { name: "프로젝트 만들기", exact: true }),
  ).not.toBeVisible();
});

test("email links remain available without a password or account creation", async ({
  page,
}) => {
  let calls = 0;
  await page.route("https://editor-auth.test/auth/v1/otp*", (route) => {
    calls++;
    const body = route.request().postDataJSON();
    expect(body.email).toBe(email);
    expect(body.create_user).toBe(false);
    expect(body).not.toHaveProperty("password");
    return route.fulfill({ json: {} });
  });
  await page.goto("/");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "이메일 로그인 링크 이용하기" })
    .click();
  await expect(page.getByLabel("비밀번호", { exact: true })).not.toBeVisible();
  await page
    .getByRole("button", { name: "로그인 링크 받기", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "이메일로 로그인 링크를 보냈습니다",
  );
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "비밀번호로 로그인하기" }).click();
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeVisible();
});
