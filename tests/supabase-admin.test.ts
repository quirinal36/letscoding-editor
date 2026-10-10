import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sealDbKey,
  unsealDbKey,
  validateAdminKey,
  adminDbRead,
  tableNames,
  adminDbAction,
} from "../src/lib/server/supabase-admin";
const secret = "sb_secret_test_only_abcdefghijklmnop";
const key = "12".repeat(32);
const url = "https://student-test.supabase.co";
test("admin key encryption binds owner, project and public connection and rejects tampering", () => {
  const encrypted = sealDbKey(secret, "owner:project:connection", key);
  assert.ok(!encrypted.includes(secret));
  assert.equal(unsealDbKey(encrypted, "owner:project:connection", key), secret);
  assert.equal(unsealDbKey(encrypted, "other:project:connection", key), null);
  assert.equal(unsealDbKey(encrypted, "owner:other:connection", key), null);
  assert.equal(unsealDbKey(encrypted, "owner:project:new", key), null);
  assert.equal(
    unsealDbKey(encrypted, "owner:project:connection", "34".repeat(32)),
    null,
  );
  assert.equal(
    unsealDbKey(
      "AAAA" + encrypted.substring(4),
      "owner:project:connection",
      key,
    ),
    null,
  );
  assert.throws(() => validateAdminKey("sb_publishable_test_abcdefghijklmnop"));
  assert.equal(validateAdminKey(secret), secret);
});
test("admin reads fixed GET endpoints without redirects, filters RPCs, bounds responses and hides upstream errors", async () => {
  const calls: Request[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    calls.push(request);
    return Response.json({
      paths: {
        "/guestbook": { get: {} },
        "/rpc/danger": { get: {} },
        "/": { get: {} },
        "/write_only": { post: {} },
      },
    });
  };
  assert.deepEqual(
    tableNames(await adminDbRead(url, secret, undefined, fetcher)),
    ["guestbook"],
  );
  await adminDbRead(url, secret, "guestbook", fetcher);
  assert.equal(calls[0].headers.get("apikey"), secret);
  assert.equal(calls[0].headers.get("authorization"), null);
  assert.equal(calls[0].redirect, "error");
  assert.ok(calls.every((r) => r.method === "GET"));
  assert.equal(calls[1].url, url + "/rest/v1/guestbook?select=*&limit=100");
  await assert.rejects(adminDbRead(url, secret, "rpc/delete", fetcher));
  await assert.rejects(
    adminDbRead("http://localhost", secret, undefined, fetcher),
  );
  await assert.rejects(
    adminDbRead(
      url,
      secret,
      undefined,
      async () => new Response(secret, { status: 401 }),
    ),
    (error) => error instanceof Error && !error.message.includes(secret),
  );
  await assert.rejects(
    adminDbRead(
      url,
      secret,
      undefined,
      async () => new Response("x".repeat(4 * 1024 * 1024 + 1)),
    ),
  );
});
test("admin connection stores only ciphertext and rejects another owner before secret access", async () => {
  const previousEnv = { ...process.env };
  const previousFetch = globalThis.fetch;
  const user = { id: crypto.randomUUID(), role: "student" };
  const projectId = crypto.randomUUID();
  let encrypted = "";
  let owner = user.id;
  let connection = "2026-10-10";
  let storageCalls = 0;
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: "https://editor-test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "test-server",
    EDITOR_DEMO_MODE: "false",
    EDITOR_SUPABASE_LINK_ENABLED: "true",
    EDITOR_SUPABASE_ADMIN_KEY: key,
  });
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const target = new URL(request.url);
    if (target.host === "student-test.supabase.co") {
      assert.equal(request.headers.get("apikey"), secret);
      assert.equal(request.method, "GET");
      return Response.json(
        target.pathname === "/rest/v1/"
          ? { paths: { "/guestbook": { get: {} } } }
          : [{ id: 1 }],
      );
    }
    if (target.pathname.endsWith("/editor_projects")) {
      assert.equal(target.searchParams.get("owner_id"), `eq.${user.id}`);
      assert.equal(target.searchParams.get("deleted_at"), "is.null");
      return owner !== user.id
        ? Response.json({}, { status: 406 })
        : Response.json({
            id: projectId,
            snapshot: {
              supabase: { url, anonKey: "public-key", connectedAt: connection },
            },
          });
    }
    if (target.pathname.endsWith("/editor_files")) return Response.json([]);
    storageCalls++;
    if (target.pathname === "/storage/v1/bucket/editor-db-secrets")
      return Response.json({ id: "editor-db-secrets", public: false });
    if (request.method === "POST") {
      encrypted = await request.text();
      return Response.json({ Key: "saved" });
    }
    if (request.method === "DELETE") {
      encrypted = "";
      return Response.json([]);
    }
    return new Response(encrypted, {
      headers: { "content-type": "text/plain" },
    });
  };
  try {
    const result = await adminDbAction(user, {
      action: "supabase-admin-connect",
      projectId,
      key: secret,
    });
    assert.deepEqual(result, {
      enabled: true,
      connected: true,
      tables: ["guestbook"],
    });
    assert.ok(encrypted && !encrypted.includes(secret));
    assert.deepEqual(
      await adminDbAction(user, {
        action: "supabase-admin-read",
        projectId,
        table: "guestbook",
      }),
      { rows: [{ id: 1 }] },
    );
    await assert.rejects(
      adminDbAction(user, {
        action: "supabase-admin-read",
        projectId,
        table: "rpc/delete",
      }),
    );
    connection = "new-connection";
    assert.deepEqual(
      await adminDbAction(user, { action: "supabase-admin-status", projectId }),
      { enabled: true, connected: false },
    );
    const before = storageCalls;
    owner = crypto.randomUUID();
    await assert.rejects(
      adminDbAction(user, { action: "supabase-admin-status", projectId }),
      /권한/,
    );
    assert.equal(storageCalls, before);
  } finally {
    globalThis.fetch = previousFetch;
    for (const name of Object.keys(process.env))
      if (!(name in previousEnv)) delete process.env[name];
    Object.assign(process.env, previousEnv);
  }
});
