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

test("GitHub import and reviewed commit display conflicts without overwriting", async ({
  page,
}) => {
  const { createProject } = await import("../../src/lib/templates");
  const project = createProject("blank", "GitHub 테스트");
  const repo = {
    id: 7,
    installationId: 9,
    owner: "student",
    name: "game",
    private: true,
    canPush: true,
    defaultBranch: "main",
  };
  let imported = false,
    ahead = false,
    pushed = false;
  await page.route(
    "https://editor-auth.test/auth/v1/token?grant_type=password",
    (route) => route.fulfill({ json: session() }),
  );
  await page.route("**/api/editor", (route) => {
    const b = route.request().postDataJSON();
    return route.fulfill({
      json:
        b.action === "session"
          ? { id: userId, email, role: "student" }
          : b.action === "list"
            ? imported
              ? [project]
              : []
            : project,
    });
  });
  await page.route("**/api/github", (route) => {
    const b = route.request().postDataJSON();
    expect(route.request().headers().authorization).toMatch(/^Bearer test\./);
    if (b.action === "status")
      return route.fulfill({
        json: {
          enabled: true,
          connected: true,
          login: "student",
          installUrl: "https://github.com/apps/test/installations/new",
          ...(imported
            ? {
                link: { ...repo, branch: "main", baseSha: "a".repeat(40) },
                revision: 0,
                head: "a".repeat(40),
                version: "00000000-0000-4000-8000-000000000009",
                changes: pushed
                  ? []
                  : [{ path: "index.html", kind: "modified" }],
                remoteAhead: ahead,
                canPull: !ahead,
              }
            : {}),
        },
      });
    if (b.action === "repositories") return route.fulfill({ json: [repo] });
    if (b.action === "branches")
      return route.fulfill({ json: [{ name: "main" }] });
    if (b.action === "import") {
      imported = true;
      return route.fulfill({ json: { project } });
    }
    if (b.action === "push") {
      expect(b).toMatchObject({
        projectId: project.id,
        revision: 0,
        head: "a".repeat(40),
        message: "게임 수정",
      });
      pushed = true;
      return route.fulfill({ json: { project, commit: "b".repeat(40) } });
    }
    return route.fulfill({
      status: 400,
      json: { error: "Unexpected GitHub request" },
    });
  });
  await page.goto("/");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "나의 프로젝트" })
    .getByRole("button", { name: "닫기" })
    .click();
  await page.getByRole("button", { name: "GitHub", exact: true }).click();
  await page.getByRole("button", { name: "내 저장소 목록 불러오기" }).click();
  await page.getByLabel("저장소", { exact: true }).selectOption("7");
  await expect(page.getByLabel("브랜치", { exact: true })).toHaveValue("main");
  await page.getByRole("button", { name: "새 프로젝트로 가져오기" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "GitHub", exact: true }).click();
  await expect(page.getByLabel("커밋할 파일 변경사항")).toContainText(
    "index.html",
  );
  await page.getByLabel("커밋 메시지").fill("게임 수정");
  ahead = true;
  await page.getByRole("button", { name: "변경사항 새로 확인" }).click();
  await expect(
    page.getByRole("button", { name: "변경사항 커밋", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "최신 내용 가져오기", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText(
    "에디터에도 수정한 내용",
  );
  ahead = false;
  await page.getByRole("button", { name: "변경사항 새로 확인" }).click();
  await page
    .getByRole("button", { name: "변경사항 커밋", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "GitHub에 커밋했습니다",
  );
  expect(pushed).toBe(true);
});
