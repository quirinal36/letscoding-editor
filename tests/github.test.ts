import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  seal,
  unseal,
  readSession,
  newAuthorization,
  type GitHubSession,
} from "../src/lib/server/github/session";
import {
  blobSha,
  changes,
  managedPath,
  pushFiles,
  type Snapshot,
} from "../src/lib/server/github/git";
import {
  branchPath,
  limitedJson,
  repository,
} from "../src/lib/server/github/api";
import { textFile } from "../src/lib/vfs";
import type { GitHubLink, GitHubRepository } from "../src/lib/github";
const key = "ab".repeat(32);
const session: GitHubSession = {
  kind: "session",
  userId: crypto.randomUUID(),
  githubUserId: 123,
  login: "student",
  token: "ghu_test",
  expires: Date.now() + 60000,
};
const repo: GitHubRepository = {
  id: 1,
  installationId: 2,
  owner: "student",
  name: "game",
  defaultBranch: "main",
  private: true,
  canPush: true,
};
test("GitHub cookies reject tampering, expired sessions and another student's identity; OAuth uses PKCE", () => {
  const sealed = seal(session, key);
  assert.equal(readSession(sealed, session.userId, key)?.token, session.token);
  assert.equal(readSession(sealed, crypto.randomUUID(), key), null);
  assert.equal(
    readSession(seal({ ...session, expires: 0 }, key), session.userId, key),
    null,
  );
  const tampered = Buffer.from(sealed, "base64url");
  tampered[30] ^= 1;
  assert.equal(unseal(tampered.toString("base64url"), key), null);
  assert.equal(unseal(sealed, "cd".repeat(32)), null);
  const names = [
    "GITHUB_COOKIE_KEY",
    "EDITOR_GITHUB_ENABLED",
    "GITHUB_APP_CLIENT_ID",
    "GITHUB_APP_CLIENT_SECRET",
    "GITHUB_APP_SLUG",
    "NEXT_PUBLIC_APP_URL",
  ];
  const previous = names.map((n) => process.env[n]);
  try {
    Object.assign(process.env, {
      GITHUB_COOKIE_KEY: key,
      EDITOR_GITHUB_ENABLED: "true",
      GITHUB_APP_CLIENT_ID: "test",
      GITHUB_APP_CLIENT_SECRET: "test",
      GITHUB_APP_SLUG: "test-app",
      NEXT_PUBLIC_APP_URL: "https://editor.example.test",
    });
    const auth = newAuthorization(session.userId),
      url = new URL(auth.url),
      state = unseal(auth.cookie, key) as {
        userId: string;
        state: string;
        verifier: string;
      };
    assert.equal(state.userId, session.userId);
    assert.equal(url.searchParams.get("state"), state.state);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(
      url.searchParams.get("code_challenge"),
      createHash("sha256").update(state.verifier).digest("base64url"),
    );
  } finally {
    names.forEach((n, i) => {
      if (previous[i] === undefined) delete process.env[n];
      else process.env[n] = previous[i];
    });
  }
});
test("GitHub paths, blob hashes, diff and bounded responses enforce the static import contract", async () => {
  assert.equal(
    blobSha(Buffer.from("hello\n")),
    "ce013625030ba8dba906f756967f9e9ca394464a",
  );
  for (const path of [
    "../index.html",
    ".env.local",
    ".github/workflows/build.yml",
    "src/app.ts",
    "folder/.secret.js",
  ])
    assert.equal(managedPath(path), false);
  assert.equal(managedPath("assets/game.js"), true);
  for (const ref of [
    "../main",
    "main.lock",
    "feature//test",
    "main?foo",
    "main@{x",
  ])
    assert.throws(() => branchPath(ref));
  assert.equal(branchPath("feature/game"), "feature/game");
  assert.deepEqual(
    changes(
      { "a.js": { sha: "a" }, "b.js": { sha: "b" } },
      { "a.js": "c", "c.js": "c" },
    ),
    [
      { path: "a.js", kind: "modified" },
      { path: "b.js", kind: "deleted" },
      { path: "c.js", kind: "added" },
    ],
  );
  await assert.rejects(
    () => limitedJson(new Response("x".repeat(100)), 10),
    /너무 큽니다/,
  );
});
test("GitHub push preserves ignored files and refuses remote races without a force push", async () => {
  const oldFetch = globalThis.fetch,
    calls: { url: string; body: Record<string, unknown> }[] = [];
  const files = { "index.html": textFile("<h1>new</h1>", "text/html") };
  const base = {
    "index.html": { sha: blobSha(Buffer.from("old")), mode: "100644" },
    "old.js": { sha: "a".repeat(40), mode: "100644" },
  };
  const link: GitHubLink = {
    ...repo,
    githubUserId: 123,
    branch: "main",
    baseSha: "b".repeat(40),
    files: base,
  };
  const tree: Snapshot = {
    head: link.baseSha,
    treeSha: "c".repeat(40),
    entries: [],
    files: base,
    ignoredCount: 1,
  };
  globalThis.fetch = async (input, init) => {
    const url = String(input),
      body = JSON.parse(String(init?.body));
    calls.push({ url, body });
    if (url.endsWith("/blobs"))
      return Response.json({
        sha: blobSha(Buffer.from(files["index.html"].content)),
      });
    if (url.endsWith("/trees")) return Response.json({ sha: "d".repeat(40) });
    if (url.endsWith("/commits")) return Response.json({ sha: "e".repeat(40) });
    return Response.json({ message: "race" }, { status: 422 });
  };
  try {
    await assert.rejects(
      () =>
        pushFiles(
          session,
          repo,
          link,
          { ...tree, head: "f".repeat(40) },
          files,
          "update",
        ),
      /새 변경/,
    );
    assert.equal(calls.length, 0);
    await assert.rejects(
      () => pushFiles(session, repo, link, tree, files, "update"),
      /브랜치 보호/,
    );
    assert.deepEqual(calls.at(-1)?.body, { sha: "e".repeat(40), force: false });
    assert.deepEqual(
      calls.find((c) => c.url.endsWith("/commits"))?.body.parents,
      [link.baseSha],
    );
    const created = calls.find((c) => c.url.endsWith("/trees"))!.body;
    assert.equal(created.base_tree, tree.treeSha);
    assert.deepEqual(
      (created.tree as { path: string; sha: string | null }[]).map(
        (x) => x.path,
      ),
      ["index.html", "old.js"],
    );
    assert.equal(
      (created.tree as { path: string; sha: string | null }[])[1].sha,
      null,
    );
    assert.equal(link.baseSha, "b".repeat(40));
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test("GitHub repository membership is rechecked and excludes other users and organizations", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      repositories: [
        {
          id: 1,
          owner: { id: 123, login: "student" },
          name: "game",
          default_branch: "main",
          private: true,
          permissions: { push: true },
        },
        {
          id: 5,
          owner: { id: 456, login: "other" },
          name: "other",
          default_branch: "main",
          private: true,
          permissions: { push: true },
        },
      ],
    });
  try {
    assert.equal((await repository(session, 2, 1)).owner, "student");
    await assert.rejects(() => repository(session, 2, 5), /본인 계정/);
  } finally {
    globalThis.fetch = oldFetch;
  }
});
