import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const host = "https://abcdefghijklmnopqrst.supabase.co";
const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
    JSON.stringify({ iss: "supabase", role }),
  ).toString("base64url")}.c2lnbmF0dXJlLXNpZ25hdHVyZS1zaWduYXR1cmU`;

test("Supabase link: key guard → connect → preview opens only the linked host → code insert → unlink", async ({
  page,
}) => {
  const requests: string[] = [];
  // Supabase rejects public-key OpenAPI requests, but accepts key validation and table requests.
  await page.route(`${host}/**`, (route) => {
    requests.push(route.request().url());
    void route.fulfill({
      status: route.request().url() === `${host}/rest/v1/` ? 401 : 200,
      contentType: "application/json",
      body: "[]",
    });
  });
  await page.route("https://other.example/**", (route) =>
    route.fulfill({ status: 200, body: "leak" }),
  );
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await expect(page.getByRole("tree")).toBeVisible();
  await page.getByRole("button", { name: "DB", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("DB 연결", { exact: true })).toBeVisible();
  await dialog.getByLabel("anon (publishable) key").fill(jwt("service_role"));
  await expect(dialog.getByRole("alert")).toContainText("service_role");
  await expect(dialog.getByLabel("anon (publishable) key")).toHaveValue("");
  await dialog.getByLabel("Project URL").fill("http://abc.supabase.co");
  await dialog.getByLabel("anon (publishable) key").fill(jwt("anon"));
  await dialog.getByRole("button", { name: "연결", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("https://");
  await dialog.getByLabel("Project URL").fill(`${host}/`);
  await dialog.getByRole("button", { name: "연결 테스트" }).click();
  await expect(dialog.getByRole("status")).toContainText("성공");
  expect(requests[0]).toBe(`${host}/auth/v1/settings`);
  await dialog.getByRole("button", { name: "연결", exact: true }).click();
  await expect(
    dialog.getByText("abcdefghijklmnopqrst.supabase.co"),
  ).toBeVisible();
  await expect(dialog.getByText("연결됨")).toBeVisible();
  expect(
    await new AxeBuilder({ page }).include("dialog").analyze(),
  ).toMatchObject({
    violations: [],
  });
  await dialog.getByRole("button", { name: "코드에 넣기" }).click();
  await expect(
    page.getByRole("treeitem", { name: "supabase.js", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /supabase.js/ })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+s");
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
  // The link survives a reload (demo keeps it in IndexedDB) and gates the preview CSP.
  await page.reload();
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await expect(
    page.getByRole("treeitem", { name: "supabase.js", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tree")).toBeVisible();
  await page.getByRole("button", { name: "DB", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("연결됨")).toBeVisible();
  await page.keyboard.press("Escape");
  const probe = Buffer.from(
    `<!doctype html><html><body><h1>DB 확인</h1><script>fetch("${host}/rest/v1/guestbook").then(()=>console.log("db allowed")).catch(()=>console.log("db blocked"));fetch("https://other.example/leak").then(()=>console.log("other allowed")).catch(()=>console.log("other blocked"))</script></body></html>`,
  );
  page.on("dialog", (d) => d.accept());
  await page.getByLabel("업로드할 파일").setInputFiles({
    name: "index.html",
    mimeType: "text/html",
    buffer: probe,
  });
  await page.getByRole("tab", { name: "미리보기" }).click();
  await expect(
    page.frameLocator('iframe[title="작품 미리보기"]').getByText("DB 확인"),
  ).toBeVisible();
  await page.getByRole("button", { name: /콘솔/ }).click();
  await expect(page.getByRole("button", { name: /db allowed/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /other blocked/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "DB", exact: true }).click();
  await page.getByRole("button", { name: "연결 해제" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "해제",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "미리보기 새로고침" }).click();
  await expect(page.getByRole("button", { name: /db blocked/ })).toBeVisible();
});

test("DB table viewer uses the linked public key and handles rows, empty and denied reads", async ({
  page,
}) => {
  await page.route(`${host}/**`, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith("/rest/v1/")) {
      expect(request.method()).toBe("GET");
      expect(request.headers().apikey).toBe(jwt("anon"));
      expect(url.searchParams.get("limit")).toBe("100");
    }
    const denied = url.pathname.endsWith("/private_table");
    return route.fulfill({
      status: denied ? 403 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        denied
          ? { message: "denied" }
          : url.pathname.endsWith("/guestbook")
            ? [
                {
                  id: 1,
                  message: "<script>alert(1)</script>",
                  extra: { ok: true },
                },
              ]
            : [],
      ),
    });
  });
  await page.goto("/");
  await page
    .locator(".project-list > div > button:first-child")
    .first()
    .click();
  await page
    .getByRole("button", { name: "DB 테이블 조회", exact: true })
    .click();
  await page.getByRole("button", { name: "DB 연결하기" }).click();
  await page.getByLabel("Project URL").fill(host);
  await page.getByLabel("anon (publishable) key").fill(jwt("anon"));
  await page.getByRole("button", { name: "연결", exact: true }).click();
  await expect(page.getByText("연결됨")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "DB 테이블 조회", exact: true })
    .click();
  const dialog = page.getByRole("tabpanel", { name: "DB 테이블" });
  const sidebar = page.getByRole("region", { name: "DB 탐색기", exact: true });
  await expect(sidebar).toBeVisible();
  await expect(
    page.getByRole("region", { name: "파일 탐색기", exact: true }),
  ).toHaveCount(0);
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "DB 테이블", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await sidebar.getByLabel("테이블 이름", { exact: true }).fill("guestbook");
  await sidebar.getByRole("button", { name: "조회 / 새로고침" }).click();
  await expect(
    dialog.getByRole("cell", {
      name: "<script>alert(1)</script>",
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.getByRole("status")).toContainText("1행");
  expect(
    await new AxeBuilder({ page })
      .include("#database-panel")
      .include(".database-sidebar")
      .analyze(),
  ).toMatchObject({ violations: [] });
  await sidebar.getByLabel("테이블 이름", { exact: true }).fill("empty_table");
  await sidebar.getByRole("button", { name: "조회 / 새로고침" }).click();
  await expect(dialog.getByText(/표시할 행이 없습니다/)).toBeVisible();
  await sidebar
    .getByLabel("테이블 이름", { exact: true })
    .fill("private_table");
  await sidebar.getByRole("button", { name: "조회 / 새로고침" }).click();
  await expect(dialog.getByRole("alert")).toContainText("조회 권한이 없습니다");
  await expect(dialog.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "탐색기 접기/펼치기" }).click();
  await expect(sidebar).toHaveCount(0);
  await page.getByRole("button", { name: "index.html", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "index.html", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "DB 테이블", exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole("tab", { name: "미리보기", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('iframe[title="작품 미리보기"]')).toBeVisible();
});
