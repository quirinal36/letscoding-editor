import { GET as cleanup } from "../src/app/api/maintenance/ai-learning/route";
import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/editor/route";
import { createProject } from "../src/lib/templates";

test("request admission logs policy, model and image refusals; invalid owners and malformed bodies never enter the audit", async () => {
  const settings = {
    NEXT_PUBLIC_SUPABASE_URL: "https://request-test.invalid",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test",
    SUPABASE_SERVICE_ROLE_KEY: "test",
    EDITOR_AI_LOGGING_ENABLED: "true",
    EDITOR_AI_LOG_RETENTION_DAYS: "7",
    EDITOR_AI_LOG_POLICY_VERSION: "test",
    EDITOR_AI_ENABLED: "true",
    OPENROUTER_MODELS: "",
    OPENROUTER_MODEL_CODE: "test-code",
    OPENROUTER_API_KEY: "not-a-real-key",
    EDITOR_AI_DAILY_LIMIT_USD: "1",
    EDITOR_AI_MONTHLY_LIMIT_USD: "1",
    EDITOR_AI_MAX_TURN_USD: "1",
    EDITOR_IMAGE_ENABLED: "false",
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const user = crypto.randomUUID(),
    project = createProject("blank", "test");
  const writes: Array<Record<string, unknown>> = [],
    updates: Array<Record<string, unknown>> = [];
  let failLog = false,
    duplicate = false,
    forbidOwner = false;
  const payload = {
    action: "chat",
    requestId: crypto.randomUUID(),
    projectId: project.id,
    threadId: project.threads[0].id,
    text: "카지노 만들어줘 api_key=secret123",
    model: "test-code",
    images: [],
  };
  const send = (body: unknown, authenticated = true) =>
    POST(
      new Request("https://editor.test/api/editor", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authenticated ? { authorization: "Bearer test" } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  try {
    Object.assign(process.env, settings);
    globalThis.fetch = async (input, init) => {
      const req = new Request(input, init),
        url = new URL(req.url);
      assert.equal(
        url.hostname,
        "request-test.invalid",
        "no paid provider call is allowed in rejection scenarios",
      );
      if (url.pathname === "/auth/v1/user") return Response.json({ id: user });
      if (url.pathname === "/rest/v1/profiles")
        return Response.json({ role: "student" });
      if (url.pathname === "/rest/v1/editor_projects") {
        assert.equal(url.searchParams.get("owner_id"), `eq.${user}`);
        return forbidOwner
          ? Response.json({ message: "missing" }, { status: 406 })
          : Response.json({
              ...project,
              snapshot: { threads: project.threads },
            });
      }
      if (url.pathname === "/rest/v1/editor_files") return Response.json([]);
      if (url.pathname === "/rest/v1/rpc/editor_begin_ai_request") {
        const body = await req.json();
        writes.push(body);
        assert.equal(body.p_owner, user);
        assert.ok(!body.p_prompt.includes("secret123"));
        return failLog
          ? Response.json(
              { message: "private database failure" },
              { status: 400 },
            )
          : Response.json({ created: !duplicate, status: "running" });
      }
      if (url.pathname === "/rest/v1/editor_ai_requests") {
        updates.push(await req.json());
        return new Response(null, { status: 204 });
      }
      if (url.pathname === "/rest/v1/rpc/editor_save_project")
        return Response.json({ revision: 0, metadataRevision: 1 });
      throw new Error(`Unexpected endpoint: ${url.pathname}`);
    };
    const refusal = await send(payload);
    assert.equal(refusal.status, 200);
    assert.equal(updates.at(-1)?.status, "rejected");
    const event = await refusal.json();
    assert.equal(event.message.requestId, payload.requestId);
    assert.equal(writes[0].p_kind, "chat");
    assert.equal(updates.at(-1)?.cost_kind, "free");
    const count = writes.length;
    assert.equal((await send(payload, false)).status, 401);
    assert.equal(
      (await send({ ...payload, text: "x".repeat(12001) })).status,
      400,
    );
    forbidOwner = true;
    assert.equal((await send(payload)).status, 403);
    forbidOwner = false;
    assert.equal(writes.length, count);
    await send({ ...payload, text: "설명해줘", model: "forged-model" });
    assert.equal(updates.at(-1)?.status, "rejected");
    await send({
      action: "image",
      projectId: project.id,
      requestId: crypto.randomUUID(),
      prompt: "사과 그려줘",
    });
    assert.equal(writes.at(-1)?.p_kind, "image");
    assert.equal(updates.at(-1)?.status, "rejected");
    failLog = true;
    const failed = await send(payload);
    assert.ok(failed.status >= 400);
    assert.ok(!(await failed.text()).includes("private database failure"));
    failLog = false;
    duplicate = true;
    const priorUpdates = updates.length;
    const replay = await send(payload);
    assert.match(await replay.text(), /이미 접수/);
    assert.equal(updates.length, priorUpdates);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(settings)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("learning cleanup requires its own flag and approved policy even when collection is rolled back", async () => {
  const keys = [
    "CRON_SECRET",
    "EDITOR_AI_LOG_CLEANUP_ENABLED",
    "EDITOR_AI_LOG_RETENTION_DAYS",
    "EDITOR_AI_LOG_POLICY_VERSION",
    "EDITOR_AI_LOGGING_ENABLED",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const original = keys.map((key) => process.env[key]),
    originalFetch = globalThis.fetch;
  try {
    Object.assign(process.env, {
      CRON_SECRET: "test-secret",
      EDITOR_AI_LOG_CLEANUP_ENABLED: "false",
      EDITOR_AI_LOG_RETENTION_DAYS: "7",
      EDITOR_AI_LOG_POLICY_VERSION: "test",
      EDITOR_AI_LOGGING_ENABLED: "false",
      NEXT_PUBLIC_SUPABASE_URL: "https://cleanup.test",
      SUPABASE_SERVICE_ROLE_KEY: "test",
    });
    let calls = 0;
    globalThis.fetch = async (input) => {
      assert.match(String(input), /editor_cleanup_ai_requests$/);
      calls++;
      return Response.json({ purged: 1, stale: 1 });
    };
    assert.equal(
      (
        await cleanup(
          new Request("https://editor.test/api/maintenance/ai-learning"),
        )
      ).status,
      401,
    );
    const req = () =>
      new Request("https://editor.test/api/maintenance/ai-learning", {
        headers: { authorization: "Bearer test-secret" },
      });
    assert.equal((await cleanup(req())).status, 503);
    assert.equal(calls, 0);
    process.env.EDITOR_AI_LOG_CLEANUP_ENABLED = "true";
    assert.deepEqual(await (await cleanup(req())).json(), {
      purged: 1,
      stale: 1,
    });
    assert.equal(calls, 1);
    delete process.env.EDITOR_AI_LOG_POLICY_VERSION;
    assert.equal((await cleanup(req())).status, 503);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, i) => {
      if (original[i] === undefined) delete process.env[key];
      else process.env[key] = original[i];
    });
  }
});
