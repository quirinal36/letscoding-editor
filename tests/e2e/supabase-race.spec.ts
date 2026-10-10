import { test, expect } from "@playwright/test";
import { createProject } from "../../src/lib/templates";
import type { Project } from "../../src/lib/types";

const cloud = process.env.EDITOR_AUTH_TEST === "true";
const link = {
  url: "https://abcdefghijklmnopqrst.supabase.co",
  anonKey: "sb_publishable_test-only",
  connectedAt: "2026-10-10T00:00:00.000Z",
};

for (const unlink of cloud ? [false, true] : [false]) {
  test(`${cloud ? "cloud" : "demo"} DB ${unlink ? "unlink" : "link"} response cannot change another project`, async ({
    page,
  }) => {
    const a = createProject("blank", "DB 작업 A");
    const b = createProject("blank", "보존할 B");
    if (unlink) a.supabase = link;
    b.supabase = { ...link, url: "https://bbbbbbbbbbbbbbbbbbbb.supabase.co" };
    const projects: Project[] = [a, b];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = false;
    const saves: Project[] = [];
    if (cloud) {
      const userId = "00000000-0000-4000-8000-000000000001";
      await page.route("https://editor-auth.test/**", (route) =>
        route.fulfill({
          json: {
            access_token: `test.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`,
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "test-refresh",
            user: {
              id: userId,
              email: "student@example.test",
              aud: "authenticated",
              role: "authenticated",
            },
          },
        }),
      );
      await page.route("**/api/models", (route) => route.fulfill({ json: [] }));
      await page.route("**/api/editor", async (route) => {
        const body = route.request().postDataJSON();
        if (
          body.action === "supabase-link" ||
          body.action === "supabase-unlink"
        ) {
          expect(body.projectId).toBe(a.id);
          started = true;
          await gate;
          if (unlink) delete a.supabase;
          else a.supabase = link;
          a.metadataRevision = (a.metadataRevision ?? 0) + 1;
          return route.fulfill({ json: a });
        }
        if (body.action === "save") {
          saves.push(body.project);
          return route.fulfill({
            json: {
              ...projects.find((p) => p.id === body.project.id),
              ...body.project,
            },
          });
        }
        return route.fulfill({
          json:
            body.action === "session"
              ? { id: userId, role: "student" }
              : body.action === "list"
                ? projects
                : body.action === "get"
                  ? projects.find((p) => p.id === body.projectId)
                  : body.action === "storage"
                    ? { usedBytes: 0, limitBytes: 100000000 }
                    : {
                        costUsd: 0,
                        reservedUsd: 0,
                        dailyLimitUsd: 1,
                        monthlyLimitUsd: 1,
                        days: [],
                      },
        });
      });
    } else {
      await page.route(`${link.url}/**`, async (route) => {
        started = true;
        await gate;
        await route.fulfill({ json: [] });
      });
    }
    await page.goto("/");
    if (cloud) {
      await page
        .getByLabel("이메일", { exact: true })
        .fill("student@example.test");
      await page.getByLabel("비밀번호", { exact: true }).fill("test-password");
      await page
        .getByRole("button", { name: "이메일로 로그인", exact: true })
        .click();
    } else {
      await expect(
        page.getByRole("button", { name: "새 프로젝트 만들기", exact: true }),
      ).toBeVisible();
      await page.evaluate(async (items) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open("letscoding-editor", 1);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("projects", "readwrite");
          for (const p of items) tx.objectStore("projects").put(p);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      }, projects);
      await page.reload();
    }
    await page
      .locator(".project-list > div > button:first-child")
      .filter({ hasText: a.title })
      .click();
    await page.getByRole("button", { name: "DB", exact: true }).click();
    const dialog = page.getByRole("dialog");
    if (!unlink) {
      await dialog.getByLabel("Project URL").fill(link.url);
      await dialog.getByLabel("anon (publishable) key").fill(link.anonKey);
    }
    await dialog
      .getByRole("button", { name: unlink ? "연결 해제" : "연결", exact: true })
      .click();
    await expect.poll(() => started).toBe(true);
    await page.keyboard.press("Escape");
    await page
      .getByRole("link", { name: "Let's Coding Studio 메인페이지" })
      .click();
    await page
      .locator(".project-list > div > button:first-child")
      .filter({ hasText: b.title })
      .click();
    await expect(
      page.getByLabel("프로젝트 이름 편집", { exact: true }),
    ).toHaveValue(b.title);
    const response = page.waitForResponse((r) =>
      cloud
        ? r.url().endsWith("/api/editor") &&
          ["supabase-link", "supabase-unlink"].includes(
            r.request().postDataJSON().action,
          )
        : r.url().startsWith(link.url),
    );
    release();
    await (await response).finished();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    // A stale result must finish before asserting B, including persistence on a manual save.
    await page.getByRole("button", { name: "DB", exact: true }).click();
    await expect(
      page.getByRole("dialog").getByText("bbbbbbbbbbbbbbbbbbbb.supabase.co"),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("ControlOrMeta+s");
    await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
    if (cloud) {
      const saved = saves.findLast((p) => p.id === b.id)!;
      expect(b.supabase?.url).toBe("https://bbbbbbbbbbbbbbbbbbbb.supabase.co");
      expect(saved.files).toEqual(b.files);
    } else {
      const saved = await page.evaluate(async (id) => {
        const req = indexedDB.open("letscoding-editor", 1);
        const db = await new Promise<IDBDatabase>((resolve) => {
          req.onsuccess = () => resolve(req.result);
        });
        const get = db.transaction("projects").objectStore("projects").get(id);
        const result = await new Promise<Project>((resolve) => {
          get.onsuccess = () => resolve(get.result);
        });
        db.close();
        return result;
      }, b.id);
      expect(saved.supabase).toEqual(b.supabase);
      expect(saved.files).toEqual(b.files);
    }
  });
}
