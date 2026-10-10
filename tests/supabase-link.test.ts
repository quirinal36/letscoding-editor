import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyKey,
  containsSecretKey,
  normalizeLink,
  parseSupabaseUrl,
  supabaseClientFile,
  testSupabaseLink,
  GUESTBOOK_SQL,
} from "../src/lib/supabase-link";
import { previewCsp } from "../src/lib/preview";
import { validateArtifact } from "../src/lib/artifact";
import { createProject } from "../src/lib/templates";
import { textFile } from "../src/lib/vfs";
import { systemPrompt } from "../src/lib/server/ai";
import { PGlite } from "@electric-sql/pglite";

const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
    JSON.stringify({ iss: "supabase", ref: "abcdefghijklmnopqrst", role }),
  ).toString("base64url")}.c2lnbmF0dXJlLXNpZ25hdHVyZS1zaWduYXR1cmU`;
const url = "https://abcdefghijklmnopqrst.supabase.co";

test("guestbook keeps project memory and linked AI context after merging main", () => {
  const project = createProject("guestbook");
  assert.match(project.files["PROJECT.md"].content, /Supabase/);
  assert.match(project.files["PROJECT.md"].content, /supabase\.js/);
  project.supabase = normalizeLink({ url, anonKey: jwt("anon") });
  const prompt = systemPrompt(project);
  assert.match(prompt, /LECO/);
  assert.match(prompt, /PROJECT\.md/);
  assert.match(prompt, /abcdefghijklmnopqrst\.supabase\.co/);
  assert.ok(!prompt.includes(project.supabase.anonKey));
});

test("only https *.supabase.co origins are accepted as project URLs", () => {
  assert.equal(parseSupabaseUrl(` ${url}/ `), url);
  for (const bad of [
    "http://abcdefghijklmnopqrst.supabase.co",
    "https://abcdefghijklmnopqrst.supabase.co/rest/v1",
    "https://abcdefghijklmnopqrst.supabase.co:8443",
    "https://user:pw@abcdefghijklmnopqrst.supabase.co",
    "https://evil.example/abcdefghijklmnopqrst.supabase.co",
    "https://abcdefghijklmnopqrst.supabase.co.evil.example",
    "https://supabase.co",
    "not a url",
  ])
    assert.throws(() => parseSupabaseUrl(bad), /URL/);
});

test("anon keys connect; service_role, secret and unknown keys are rejected", () => {
  assert.equal(classifyKey(jwt("anon")), "anon");
  assert.equal(classifyKey("sb_publishable_abcdefghijklmnop"), "anon");
  assert.equal(classifyKey(jwt("service_role")), "service_role");
  assert.equal(classifyKey("sb_secret_abcdefghijklmnop"), "secret");
  assert.equal(classifyKey("random-token-value-here"), "unknown");
  const link = normalizeLink(
    { url: `${url}/`, anonKey: ` ${jwt("anon")} ` },
    new Date("2026-10-06T00:00:00Z"),
  );
  assert.deepEqual(link, {
    url,
    anonKey: jwt("anon"),
    connectedAt: "2026-10-06T00:00:00.000Z",
  });
  assert.throws(
    () => normalizeLink({ url, anonKey: jwt("service_role") }),
    /service_role/,
  );
  assert.throws(
    () => normalizeLink({ url, anonKey: "sb_secret_abcdefghijklmnop" }),
    /service_role·secret/,
  );
  assert.throws(
    () => normalizeLink({ url, anonKey: "random-token-value-here" }),
    /anon\(publishable\) key가 아닙니다/,
  );
});

test("preview CSP opens only the linked host and the supabase-js CDN", () => {
  const closed = previewCsp(null);
  assert.match(closed, /connect-src data: blob:;/);
  assert.match(closed, /script-src 'unsafe-inline' data: blob:;/);
  const open = previewCsp({ url, anonKey: jwt("anon"), connectedAt: "" });
  assert.match(
    open,
    /connect-src data: blob: https:\/\/abcdefghijklmnopqrst\.supabase\.co wss:\/\/abcdefghijklmnopqrst\.supabase\.co;/,
  );
  assert.match(
    open,
    /script-src 'unsafe-inline' data: blob: https:\/\/cdn\.jsdelivr\.net;/,
  );
  assert.doesNotMatch(open, /\*/);
  assert.match(open, /frame-src 'none'; object-src 'none'/);
});

test("reachability test reports unreachable, rejected and failing projects", async () => {
  const link = { url, anonKey: jwt("anon") };
  const calls: Request[] = [];
  const respond =
    (status: number): typeof fetch =>
    async (input, init) => {
      calls.push(new Request(input, init));
      return new Response("{}", { status });
    };
  await testSupabaseLink(link, respond(200));
  assert.equal(calls[0].url, `${url}/auth/v1/settings`);
  assert.equal(calls[0].headers.get("apikey"), jwt("anon"));
  assert.equal(calls[0].headers.get("Authorization"), null);
  await assert.rejects(testSupabaseLink(link, respond(401)), /거부/);
  await assert.rejects(testSupabaseLink(link, respond(403)), /거부/);
  await assert.rejects(testSupabaseLink(link, respond(500)), /500/);
  await assert.rejects(
    testSupabaseLink(link, async () => {
      throw new TypeError("fetch failed");
    }),
    /연결할 수 없습니다/,
  );
});

test("public keys validate even when Supabase restricts the OpenAPI root", async () => {
  for (const anonKey of [jwt("anon"), "sb_publishable_abcdefghijklmnop"]) {
    await testSupabaseLink({ url, anonKey }, async (input, init) => {
      const request = new Request(input, init);
      if (request.url === `${url}/rest/v1/`)
        return Response.json({ message: "Invalid API key" }, { status: 401 });
      assert.equal(request.url, `${url}/auth/v1/settings`);
      assert.equal(request.headers.get("apikey"), anonKey);
      assert.equal(request.headers.get("authorization"), null);
      return Response.json({ external: { email: true } });
    });
  }
});

test("guestbook SQL grants public read/write without automatic grants and can be rerun", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; grant usage on schema public to anon;");
    await db.exec(GUESTBOOK_SQL);
    await db.exec(GUESTBOOK_SQL);
    await db.exec("set role anon;");
    const inserted = await db.query<{ id: number }>(
      "insert into public.guestbook(name,message) values ('test','hello') returning id",
    );
    assert.equal(inserted.rows.length, 1);
    assert.equal(
      (await db.query("select * from public.guestbook")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("update public.guestbook set message='changed'"),
    );
    await assert.rejects(db.query("delete from public.guestbook"));
  } finally {
    await db.close();
  }
});

test("deploy rejects files that embed a service_role or secret key", () => {
  const project = createProject("guestbook", "방명록");
  validateArtifact(project.files);
  const linked = {
    ...project.files,
    "supabase.js": textFile(
      supabaseClientFile({ url, anonKey: jwt("anon"), connectedAt: "" }),
      "text/javascript",
    ),
  };
  validateArtifact(linked);
  assert.match(linked["supabase.js"].content, /cdn\.jsdelivr\.net/);
  for (const secret of [jwt("service_role"), "sb_secret_abcdefghijklmnop"]) {
    assert.ok(containsSecretKey(`const key = "${secret}";`));
    assert.throws(
      () =>
        validateArtifact({
          ...linked,
          "config.js": textFile(`export const key = "${secret}";`),
        }),
      /service_role·secret 키/,
    );
  }
  assert.ok(!containsSecretKey(`const key = "${jwt("anon")}";`));
});
