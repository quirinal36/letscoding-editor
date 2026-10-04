import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { admin, save } from "../src/lib/server/repository";
import { createLoungeServices } from "../integration/lounge-services";

test("editor REST/RPC use editor schema while lounge profiles and storage keep their namespaces", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
    previousFetch = globalThis.fetch;
  const requests: { path: string; method: string; headers: Headers }[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push({
      path: new URL(request.url).pathname,
      method: request.method,
      headers: request.headers,
    });
    return new Response("[]", {
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
    globalThis.fetch = fakeFetch;
    const db = admin();
    await db.from("editor_projects").select("id");
    await db.rpc("editor_cleanup_candidates", { p_cutoff: "2026-01-01" });
    await db.schema("public").from("profiles").select("role");
    await db.storage.from("editor-files").list();
    const lounge = createLoungeServices(
      createClient("https://example.supabase.co", "test-only-key", {
        global: { fetch: fakeFetch },
        auth: { persistSession: false },
      }),
      async () => ({ resultUrl: "https://example.com", policyVersion: "test" }),
    );
    await lounge.claimNonce(crypto.randomUUID(), new Date().toISOString());
    await lounge.authorize(crypto.randomUUID(), crypto.randomUUID());
    for (const request of requests) {
      if (
        request.path.startsWith("/rest/v1/editor_") &&
        request.method === "GET"
      )
        assert.equal(request.headers.get("accept-profile"), "editor");
      if (
        request.path.startsWith("/rest/v1/rpc/") ||
        request.path.endsWith("editor_lounge_nonces")
      )
        assert.equal(request.headers.get("content-profile"), "editor");
      if (request.path.endsWith("/profiles"))
        assert.equal(request.headers.get("accept-profile"), "public");
    }
    assert.ok(
      requests.some((request) => request.path.startsWith("/storage/v1/")),
    );
    assert.equal(
      requests.filter((request) => request.path.endsWith("/profiles")).length,
      2,
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test("signed uploads validate Storage info size and reject forged sizes or foreign paths", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
    previousFetch = globalThis.fetch;
  const user = { id: crypto.randomUUID(), role: "student" as const };
  const projectId = crypto.randomUUID();
  let size: number | undefined = 68;
  let saves = 0;
  const project = {
    id: projectId,
    title: "Upload regression",
    template: "blank",
    revision: 0,
    updatedAt: new Date().toISOString(),
    threads: [],
    deployments: [],
    files: {
      "pixel.png": {
        kind: "binary" as const,
        content: "",
        mime: "image/png",
        size: 68,
        storagePath: `${user.id}/${projectId}/pixel`,
      },
    },
  };
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      const pathname = new URL(request.url).pathname;
      if (pathname.startsWith("/storage/v1/object/info/")) {
        return Response.json({ size, metadata: {} });
      }
      assert.equal(pathname, "/rest/v1/rpc/editor_save_project");
      saves++;
      return Response.json({ revision: 1, metadataRevision: 1 });
    };
    await save(user, project, 0);
    assert.equal(saves, 1);
    size = 69;
    await assert.rejects(save(user, project, 0), /업로드 파일 크기/);
    size = undefined;
    await assert.rejects(save(user, project, 0), /업로드 파일 크기/);
    project.files["pixel.png"].storagePath =
      `${crypto.randomUUID()}/${projectId}/pixel`;
    await assert.rejects(save(user, project, 0), /올바른 업로드 경로/);
    assert.equal(saves, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
