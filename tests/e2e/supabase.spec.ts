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
  // Fake Supabase REST; no real project is contacted.
  await page.route(`${host}/**`, (route) => {
    requests.push(route.request().url());
    void route.fulfill({
      status: 200,
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
  expect(requests[0]).toBe(`${host}/rest/v1/`);
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
