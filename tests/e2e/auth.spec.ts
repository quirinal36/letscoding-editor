import { test, expect } from "@playwright/test";

const email = "student@example.test";
const password = "test-password-only";
const userId = "00000000-0000-4000-8000-000000000001";
const usage = {
  costUsd: 0,
  reservedUsd: 0,
  dailyLimitUsd: 1,
  monthlyLimitUsd: 1,
  promptTokens: 0,
  completionTokens: 0,
  days: [],
};
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
        body.action === "session"
          ? { id: userId, email, role: "student" }
          : body.action === "usage"
            ? usage
            : body.action === "storage"
              ? { usedBytes: 50 * 1024 * 1024, limitBytes: 100 * 1024 * 1024 }
              : [],
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
    page.getByRole("button", { name: "새 프로젝트 만들기", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "로그아웃", exact: true }),
  ).toHaveText("");
  await expect(
    page.getByRole("button", { name: "로그아웃", exact: true }),
  ).toHaveAttribute("title", "로그아웃");
  await expect(page.locator(".account-storage")).toContainText("50MB / 100MB");
  expect(calls).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "새 프로젝트 만들기", exact: true }),
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
    page.getByRole("button", { name: "새 프로젝트 만들기", exact: true }),
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
          : b.action === "usage"
            ? usage
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
  await expect(
    page.getByRole("heading", { name: "나의 프로젝트", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "GitHub에서 가져오기", exact: true })
    .click();
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

test("cloud usage, cancelled uploads and failed saves recover without losing edits", async ({
  page,
}) => {
  const { createProject } = await import("../../src/lib/templates");
  const { textFile } = await import("../../src/lib/vfs");
  let project = createProject("blank", "복구 검증");
  project.files["notes.md"] = textFile("# 처음");
  let usageFails = true,
    saveFails = true,
    uploadFails = true;
  let saves = 0,
    savedRevisions = 0,
    uploads = 0;
  let releaseSave: (() => void) | undefined;
  let releaseUpload: (() => void) | undefined;
  const uploadBodies: Buffer[] = [];
  await page.route(
    "https://editor-auth.test/auth/v1/token?grant_type=password",
    (route) => route.fulfill({ json: session() }),
  );
  await page.route(
    "https://editor-auth.test/storage/v1/object/upload/sign/**",
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "PUT",
            "Access-Control-Allow-Headers": "content-type,x-upsert",
          },
        });
        return;
      }
      uploads++;
      uploadBodies.push(route.request().postDataBuffer()!);
      if (uploads === 1)
        await new Promise<void>((resolve) => {
          releaseUpload = resolve;
        });
      await route
        .fulfill({
          status: uploadFails ? 403 : 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          json: uploadFails ? { error: "expired" } : { Key: "test" },
        })
        .catch(() => {});
    },
  );
  await page.route("**/api/editor", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "usage")
      return route.fulfill({
        status: usageFails ? 503 : 200,
        json: usageFails ? { error: "usage unavailable" } : usage,
      });
    if (body.action === "chat")
      return route.fulfill({
        status: 503,
        json: { error: "AI 공급자 연결 실패" },
      });
    if (body.action === "upload")
      return route.fulfill({
        json: {
          storagePath: `${userId}/${project.id}/upload-${uploads}`,
          signedUrl: `https://editor-auth.test/storage/v1/object/upload/sign/editor-files/test-${uploads}?token=fake`,
        },
      });
    if (body.action === "save") {
      saves++;
      if (saves === 1)
        await new Promise<void>((resolve) => {
          releaseSave = resolve;
        });
      if (saveFails)
        return route.fulfill({
          status: 503,
          json: { error: "시험용 저장 실패" },
        });
      expect(body.expectedRevision).toBe(project.revision);
      project = { ...project, ...body.project, revision: ++savedRevisions };
      return route.fulfill({ json: project });
    }
    return route.fulfill({
      json:
        body.action === "session"
          ? { id: userId, role: "student" }
          : body.action === "list"
            ? [project]
            : project,
    });
  });
  await page.goto("/");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "AI 사용량 확인 실패" }),
  ).toBeVisible();
  await expect(
    page.getByText("AI 예산 미설정", { exact: true }),
  ).not.toBeVisible();
  usageFails = false;
  await page.getByRole("button", { name: "AI 사용량 확인 실패" }).click();
  await expect(page.getByText(/오늘 사용 \$0.0000/)).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "AI $0.000 / $1.00", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("treeitem", { name: "notes.md", exact: true })
    .getByRole("button", { name: "notes.md", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: /notes.md 코드 편집기/ });
  await editor.focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("# 저장 중 편집");
  await expect.poll(() => saves).toBe(1);
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("\n보존할 내용");
  releaseSave!();
  await expect(
    page.getByRole("button", { name: "저장 다시 시도", exact: true }),
  ).toBeVisible();
  saveFails = false;
  await page
    .getByRole("button", { name: "저장 다시 시도", exact: true })
    .click();
  await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
  expect(project.files["notes.md"].content).toContain("보존할 내용");
  await page.getByLabel("AI에게 보낼 메시지").fill("시험 요청");
  await page.getByRole("button", { name: "메시지 보내기" }).click();
  await expect(
    page.getByText("AI 공급자 연결 실패", { exact: true }),
  ).toBeVisible();
  await editor.focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("\nAI 장애 후 편집");
  await page.keyboard.press("ControlOrMeta+s");
  await expect
    .poll(() => project.files["notes.md"].content)
    .toContain("AI 장애 후 편집");

  const beforeUpload = savedRevisions;
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  await page
    .getByLabel("업로드할 파일")
    .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: bytes });
  await expect.poll(() => uploads).toBe(1);
  await page.getByRole("button", { name: "업로드 취소", exact: true }).click();
  await expect(page.getByText(/업로드를 취소했습니다/)).toBeVisible();
  expect(savedRevisions).toBe(beforeUpload);
  await expect(
    page.getByRole("treeitem", { name: "pixel.png", exact: true }),
  ).toBeVisible();
  releaseUpload!();
  await page
    .getByRole("button", { name: "저장 다시 시도", exact: true })
    .click();
  await expect.poll(() => uploads).toBe(2);
  await expect(
    page.getByText("파일 업로드에 실패했습니다. 저장을 다시 시도해주세요.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(savedRevisions).toBe(beforeUpload);
  uploadFails = false;
  await page
    .getByRole("button", { name: "저장 다시 시도", exact: true })
    .click();
  await expect.poll(() => savedRevisions).toBe(beforeUpload + 1);
  expect(uploadBodies.at(-1)).toEqual(bytes);
  expect(project.files["pixel.png"].storagePath).toBeTruthy();

  // Large text uses private Storage too; saving must retain its local contents.
  const largeText = "보존".repeat(50000);
  await page.getByLabel("업로드할 파일").setInputFiles({
    name: "large.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(largeText),
  });
  await expect.poll(() => project.files["large.txt"]?.storagePath).toBeTruthy();
  await expect(
    page.getByRole("treeitem", { name: "large.txt", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
  expect(uploadBodies.at(-1)?.toString()).toBe(largeText);
});

test("a delayed AI approval keeps edits typed while waiting for the server", async ({
  page,
}) => {
  const { createProject } = await import("../../src/lib/templates");
  const { textFile } = await import("../../src/lib/vfs");
  let project = createProject("blank", "승인 경합");
  project.files["notes.md"] = textFile("# 원본");
  project.threads[0].messages.push({
    id: "approval-message",
    role: "assistant",
    text: "색상 변경",
    status: "complete",
    proposals: [
      {
        id: "approval",
        operation: "write",
        path: "index.html",
        content: "<h1>AI 승인 결과</h1>",
        baseRevision: 0,
        status: "pending",
      },
    ],
  });
  let release!: () => void;
  let approving = false;
  await page.route(
    "https://editor-auth.test/auth/v1/token?grant_type=password",
    (route) => route.fulfill({ json: session() }),
  );
  await page.route("**/api/editor", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "approve") {
      approving = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      project = {
        ...project,
        revision: project.revision + 1,
        files: {
          ...project.files,
          "index.html": textFile("<h1>AI 승인 결과</h1>"),
        },
      };
      project.threads[0].messages[0].proposals[0].status = "applied";
      return route.fulfill({ json: project });
    }
    if (body.action === "save") {
      if (body.expectedRevision !== project.revision)
        return route.fulfill({
          status: 400,
          json: { error: "revision conflict" },
        });
      project = { ...project, ...body.project, revision: project.revision + 1 };
      return route.fulfill({ json: project });
    }
    return route.fulfill({
      json:
        body.action === "session"
          ? { id: userId, role: "student" }
          : body.action === "usage"
            ? usage
            : body.action === "list"
              ? [project]
              : project,
    });
  });
  await page.goto("/");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await page.getByRole("button", { name: "notes.md", exact: true }).click();
  await page.getByRole("button", { name: "적용", exact: true }).click();
  await expect.poll(() => approving).toBe(true);
  await page.getByRole("textbox", { name: /notes.md 코드 편집기/ }).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("\n승인 대기 중 수동 편집");
  const title = page.getByRole("textbox", { name: "프로젝트 이름 편집" });
  await title.fill("승인 중 바꾼 이름");
  await expect(page.locator(".tree-root")).toHaveText("승인 중 바꾼 이름");
  release();
  await expect(page.getByText("수정됨", { exact: true })).toBeVisible();
  await expect
    .poll(() => project.files["notes.md"].content)
    .toContain("승인 대기 중 수동 편집");
  expect(project.files["index.html"].content).toBe("<h1>AI 승인 결과</h1>");
  await expect.poll(() => project.title).toBe("승인 중 바꾼 이름");
  await page.reload();
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await page.getByRole("button", { name: "notes.md", exact: true }).click();
  await expect(title).toHaveValue("승인 중 바꾼 이름");
  await expect(page.locator(".markdown-preview")).toContainText(
    "승인 대기 중 수동 편집",
  );
});

test("chat renders Markdown safely and hides generated code and tool details", async ({
  page,
}) => {
  const { createProject } = await import("../../src/lib/templates");
  const project = createProject("blank", "Markdown 검증");
  project.threads[0].messages.push({
    id: "markdown-reply",
    role: "assistant",
    status: "complete",
    proposals: [],
    tools: [
      {
        name: "write_files",
        input: { files: [{ content: "secret generated code" }] },
        output: { status: "ready" },
      },
    ],
    text: '### 옵션 1\n\n* **게임 방식:** 클릭으로 점수를 올립니다.\n* `score`를 저장합니다.\n\n**"CSS 사과 아이콘"**을 만들어요.\n\n[문서](https://example.com)\n\n<script>window.markdownEscaped = true</script><img src=x onerror="window.markdownEscaped = true">\n\n```js\nconst score = 0;\n```',
  });
  await page.route(
    "https://editor-auth.test/auth/v1/token?grant_type=password",
    (route) => route.fulfill({ json: session() }),
  );
  await page.route("**/api/editor", (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({
      json:
        body.action === "session"
          ? { id: userId, role: "student" }
          : body.action === "usage"
            ? {
                ...usage,
                dailyLimitUsd: 5,
                monthlyLimitUsd: 2,
                costUsd: 0.2,
                monthCostUsd: 1.4,
                reservedUsd: 0.1,
                monthReservedUsd: 0.3,
              }
            : body.action === "list"
              ? [project]
              : project,
    });
  });
  await page.goto("/");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  const message = page.locator(".message.assistant");
  await expect(message.getByRole("heading", { name: "옵션 1" })).toBeVisible();
  await expect(message.getByRole("listitem")).toHaveCount(2);
  await expect(message.locator("strong")).toHaveText([
    "게임 방식:",
    '"CSS 사과 아이콘"',
  ]);
  await expect(
    page.getByRole("button", { name: "이번 달 남은 AI 사용량", exact: true }),
  ).toHaveText(/15% 남음 \(\d+일 후 초기화\)/);
  await expect(message.getByRole("link", { name: "문서" })).toHaveAttribute(
    "href",
    "https://example.com",
  );
  await expect(message.locator("script, img")).toHaveCount(0);
  expect(await page.evaluate(() => "markdownEscaped" in window)).toBe(false);
  await expect(message.locator("pre, .tool-call")).toHaveCount(0);
  await expect(message).not.toContainText("const score = 0");
  await expect(message).not.toContainText("secret generated code");
});

test("a game request automatically commits all files and opens the preview; failed replies stay unapplied", async ({
  page,
}) => {
  const { createProject } = await import("../../src/lib/templates");
  const { applyProposals } = await import("../../src/lib/vfs");
  let project = createProject("blank", "게임 생성 검증");
  // Existing conversations previously defaulted to false: they also build directly now.
  project.threads[0].autoApply = false;
  let failed = false,
    manual = false,
    approvals = 0;
  const files = [
    {
      path: "PROJECT.md",
      content:
        "# 스네이크 게임\n\n## 기능\n시작 버튼과 점수 표시\n\n## 변경 기록\n- 게임 구현",
    },
    {
      path: "index.html",
      content:
        '<!doctype html><html lang="ko"><head><title>게임</title><link rel="stylesheet" href="style.css"></head><body><h1>스네이크 게임</h1><p id="score">0</p><button id="start">시작</button><script src="script.js"></script></body></html>',
    },
    {
      path: "style.css",
      content: "body { background: rgb(10, 20, 30); color: white; }",
    },
    {
      path: "script.js",
      content:
        'document.querySelector("#start").onclick = () => document.querySelector("#score").textContent = "10";',
    },
  ];
  await page.route(
    "https://editor-auth.test/auth/v1/token?grant_type=password",
    (route) => route.fulfill({ json: session() }),
  );
  await page.route("**/api/editor", (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "chat") {
      const message = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        text: failed
          ? ""
          : "게임을 만들었어요. 미리보기에서 시작을 눌러보세요.",
        status: failed ? ("error" as const) : ("complete" as const),
        proposals: files.map((file) => ({
          ...file,
          id: crypto.randomUUID(),
          operation: "write" as const,
          requiresReview: manual,
          baseRevision: project.revision,
          status: "pending" as const,
        })),
      };
      project.threads[0].messages.push(
        {
          id: crypto.randomUUID(),
          role: "user",
          text: body.text,
          proposals: [],
          status: "complete",
        },
        message,
      );
      return route.fulfill({
        contentType: "application/x-ndjson",
        body: JSON.stringify({ type: "done", message }) + "\n",
      });
    }
    if (body.action === "approve") {
      approvals++;
      const message = project.threads[0].messages.at(-1)!;
      expect(body.proposalIds).toEqual(message.proposals.map((p) => p.id));
      project = applyProposals(project, message.proposals);
      message.proposals.forEach((p) => (p.status = "applied"));
      return route.fulfill({ json: project });
    }
    return route.fulfill({
      json:
        body.action === "session"
          ? { id: userId, role: "student" }
          : body.action === "usage"
            ? usage
            : body.action === "list"
              ? [project]
              : project,
    });
  });
  await page.addInitScript(() => {
    const original = window.fetch;
    let intercepted = false;
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      if (
        !intercepted &&
        String(input) === "/api/editor" &&
        JSON.parse(String(init?.body ?? "{}")).action === "chat"
      ) {
        intercepted = true;
        const body = await response.text();
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({ type: "progress", characters: 1234 }) + "\n",
                ),
              );
              window.addEventListener(
                "finish-test-chat",
                () => {
                  controller.enqueue(new TextEncoder().encode(body));
                  // Keep the connection open: the terminal event must end the busy state.
                },
                { once: true },
              );
            },
          }),
          { headers: response.headers },
        );
      }
      return response;
    };
  });
  await page.goto("/");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await page.getByLabel("AI에게 보낼 메시지").fill("스네이크 게임 만들어줘");
  await page.getByRole("button", { name: "메시지 보내기" }).click();
  await expect(page.locator(".message.user").last()).toContainText(
    "스네이크 게임 만들어줘",
  );
  await expect(
    page.locator(".chat-messages").getByRole("status"),
  ).toContainText("(약 1,234자)");
  await expect(page.getByLabel("AI 응답 중단")).toBeVisible();
  await expect(page.getByLabel("AI 모델 선택")).toHaveCount(0);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("finish-test-chat")),
  );
  await expect(page.getByText("수정됨", { exact: true })).toHaveCount(4);
  expect(approvals).toBe(1);
  expect(project.revision).toBe(1);
  await expect(
    page.getByRole("tab", { name: "미리보기", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const preview = page.frameLocator('iframe[title="작품 미리보기"]');
  await expect(
    preview.getByRole("heading", { name: "스네이크 게임" }),
  ).toBeVisible();
  await expect(preview.locator("body")).toHaveCSS(
    "background-color",
    "rgb(10, 20, 30)",
  );
  await preview.getByRole("button", { name: "시작", exact: true }).click();
  await expect(preview.locator("#score")).toHaveText("10");
  await page
    .getByRole("link", { name: "Let's Coding Studio 메인페이지", exact: true })
    .click();
  project.files["index.html"].content = project.files[
    "index.html"
  ].content.replace("스네이크 게임</h1>", "최신 스네이크 게임</h1>");
  project.files["index.html"].size = new TextEncoder().encode(
    project.files["index.html"].content,
  ).length;
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await expect(
    preview.getByRole("heading", { name: "최신 스네이크 게임" }),
  ).toBeVisible();
  await expect(preview.locator("#score")).toHaveText("0");
  await expect(page.getByRole("tab")).toHaveCount(1);
  failed = true;
  await page.getByLabel("AI에게 보낼 메시지").fill("실패 응답 검증");
  await page.getByRole("button", { name: "메시지 보내기" }).click();
  await expect(
    page.getByText(
      "응답을 완성하지 못했습니다. 변경 내용은 반영되지 않았습니다. 다시 시도해주세요.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("AI에게 보낼 메시지")).toBeEnabled();
  expect(approvals).toBe(1);
  expect(project.revision).toBe(1);
  await page.reload();
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await expect(
    preview.getByRole("heading", { name: "최신 스네이크 게임" }),
  ).toBeVisible();
  await expect(page.getByText("수정됨", { exact: true })).toHaveCount(4);
  failed = false;
  manual = true;
  await page.locator(".chat-messages").evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.getByLabel("AI에게 보낼 메시지").fill("전체 교체 변경안 검증");
  await page.getByRole("button", { name: "메시지 보내기" }).click();
  await expect(page.getByLabel("AI 응답 중단")).toBeVisible();
  await expect(
    page.locator(".chat-messages").getByRole("status"),
  ).toContainText("(약 1,234자)");
  // Progress adds height after sending; the busy state must still show the bottom.
  await expect
    .poll(() =>
      page
        .locator(".chat-messages")
        .evaluate(
          (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
        ),
    )
    .toBeLessThan(2);
  await expect(
    page.getByRole("button", { name: "전체 작업 승인", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("finish-test-chat")),
  );

  await expect(
    page.getByRole("button", { name: "전체 작업 승인", exact: true }),
  ).toHaveCount(4);
  expect(approvals).toBe(1);
  await expect
    .poll(() =>
      page
        .locator(".chat-messages")
        .evaluate(
          (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
        ),
    )
    .toBeLessThan(2);
  await expect(
    preview.getByRole("heading", { name: "최신 스네이크 게임" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "전체 작업 승인", exact: true })
    .first()
    .click();
  await expect(page.getByText("수정됨", { exact: true })).toHaveCount(8);
  expect(approvals).toBe(2);
  expect(project.revision).toBe(2);
});
