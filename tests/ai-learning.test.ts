import catalogFixture from "./fixtures/ai-models-2026-10-12.json";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { modelMetadata } from "../src/lib/server/models";
import { redactPrompt } from "../src/lib/learning-logs";
import { appConfig, learningLogPolicy } from "../src/lib/server/config";
import { MODEL_CATALOG } from "../src/lib/model-catalog";
import { beginRequest } from "../src/lib/server/learning-logs";
import { createProject } from "../src/lib/templates";

test("model compatibility fails closed; price tiers reserve the maximum instead of the advertised minimum", () => {
  const raw = {
    id: "test",
    supported_parameters: ["tools"],
    architecture: { input_modalities: ["text"] },
    top_provider: { max_completion_tokens: 8192 },
    pricing: {
      prompt: "0.1",
      completion: "0.2",
      overrides: [{ prompt: "0.5", completion: "1" }],
    },
  };
  assert.equal(modelMetadata(raw).input, 0.5);
  assert.equal(modelMetadata(raw).output, 1);
  assert.equal(modelMetadata(raw).vision, false);
  for (const patch of [
    { supported_parameters: [] },
    { pricing: { prompt: null, completion: "0" } },
    { pricing: { prompt: "-1", completion: "0" } },
    { expiration_date: "2020-01-01" },
    { top_provider: { max_completion_tokens: null } },
  ])
    assert.throws(() => modelMetadata({ ...raw, ...patch }));
  assert.equal(new Set(MODEL_CATALOG.map((m) => m.provider)).size, 6);
  assert.ok(MODEL_CATALOG.length >= 6 && MODEL_CATALOG.length <= 12);
});
test("logging is opt-in with an explicit bounded retention policy; model candidates are not automatically enabled", () => {
  const names = [
    "EDITOR_AI_LOGGING_ENABLED",
    "EDITOR_AI_LOG_RETENTION_DAYS",
    "EDITOR_AI_LOG_POLICY_VERSION",
    "OPENROUTER_MODELS",
  ];
  const original = names.map((n) => process.env[n]);
  try {
    process.env.EDITOR_AI_LOGGING_ENABLED = "true";
    delete process.env.EDITOR_AI_LOG_RETENTION_DAYS;
    assert.equal(learningLogPolicy(), null);
    process.env.EDITOR_AI_LOG_RETENTION_DAYS = "180";
    process.env.EDITOR_AI_LOG_POLICY_VERSION = "test-approved";
    assert.deepEqual(learningLogPolicy(), {
      retentionDays: 180,
      version: "test-approved",
    });
    process.env.EDITOR_AI_LOG_RETENTION_DAYS = "3651";
    assert.equal(learningLogPolicy(), null);
    process.env.OPENROUTER_MODELS =
      "not-allowed," + MODEL_CATALOG[0].id + "," + MODEL_CATALOG[0].id;
    assert.deepEqual(
      appConfig()
        .models.filter((m) => !m.image)
        .map((m) => m.id),
      [MODEL_CATALOG[0].id],
    );
  } finally {
    names.forEach((n, i) => {
      if (original[i] === undefined) delete process.env[n];
      else process.env[n] = original[i];
    });
  }
});
test("known credentials are masked while ordinary code and Korean questions remain readable", () => {
  const secret = "sk-or-v1-abcdefghijklmnop123456";
  const text = `색을 바꿔줘 const color = 'red'; OPENROUTER_API_KEY='private123' password: secret123\n${secret}\nBearer aaa.bbb.ccc\neyJhbGciOiJIUzI1NiJ9.abcdefghi.signature123`;
  const clean = redactPrompt(text);
  for (const value of [
    secret,
    "private123",
    "secret123",
    "aaa.bbb.ccc",
    "eyJhbGci",
  ])
    assert.ok(!clean.includes(value));
  assert.ok(clean.includes("색을 바꿔줘 const color = 'red'"));
  assert.equal(
    redactPrompt(
      "-----BEGIN RSA PRIVATE KEY-----\nxxx\n-----END RSA PRIVATE KEY-----",
    ),
    "[비밀키 가림]",
  );
});
test("audit start writes only redacted prompt and server identity, fails closed, and refuses duplicate execution", async () => {
  const names = [
    "EDITOR_AI_LOGGING_ENABLED",
    "EDITOR_AI_LOG_RETENTION_DAYS",
    "EDITOR_AI_LOG_POLICY_VERSION",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const original = names.map((n) => process.env[n]);
  const fetchOriginal = globalThis.fetch;
  const project = createProject("blank", "test"),
    user = { id: crypto.randomUUID(), role: "student" };
  const input = {
    requestId: crypto.randomUUID(),
    text: "api_key=secret123",
    model: "test",
    kind: "chat" as const,
    context: "private source",
  };
  try {
    Object.assign(process.env, {
      EDITOR_AI_LOGGING_ENABLED: "true",
      EDITOR_AI_LOG_RETENTION_DAYS: "7",
      EDITOR_AI_LOG_POLICY_VERSION: "test",
      NEXT_PUBLIC_SUPABASE_URL: "https://audit.test",
      SUPABASE_SERVICE_ROLE_KEY: "test-only",
    });
    let duplicate = false;
    globalThis.fetch = async (_, options) => {
      const payload = JSON.parse(String(options?.body));
      assert.equal(payload.p_owner, user.id);
      assert.equal(payload.p_project, project.id);
      assert.ok(!String(options?.body).includes("secret123"));
      assert.ok(!String(options?.body).includes("private source"));
      return Response.json({ created: !duplicate, status: "running" });
    };
    await beginRequest(user, project, input);
    duplicate = true;
    await assert.rejects(beginRequest(user, project, input), /이미 접수/);
    globalThis.fetch = async () =>
      Response.json({ message: "db unavailable" }, { status: 503 });
    await assert.rejects(beginRequest(user, project, input), /저장하지 못해/);
    await assert.rejects(
      beginRequest(user, project, { ...input, requestId: undefined }),
      /요청 ID/,
    );
  } finally {
    globalThis.fetch = fetchOriginal;
    names.forEach((n, i) => {
      if (original[i] === undefined) delete process.env[n];
      else process.env[n] = original[i];
    });
  }
});
test("learning migration: immutable attribution, duplicate claim, client denial, deletion survival and bounded recovery", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.profiles(id uuid primary key,role text,org_id uuid,class_id uuid,display_name text,username text);
      create table public.classes(id uuid primary key,name text);
      create table public.organization_memberships(user_id uuid,org_id uuid,ended_at timestamptz);
      create schema editor; grant usage on schema editor to service_role,authenticated,anon;
      create table editor.editor_projects(id uuid primary key,owner_id uuid,deleted_at timestamptz,title text);
      create table editor.editor_ai_threads(id uuid primary key,project_id uuid,user_id uuid);
      grant select on public.profiles,public.classes,public.organization_memberships,editor.editor_projects to service_role;`);
    await db.exec(
      await readFile("integration/ai-learning-requests.sql", "utf8"),
    );
    const owner = crypto.randomUUID(),
      other = crypto.randomUUID(),
      project = crypto.randomUUID(),
      org = crypto.randomUUID(),
      classId = crypto.randomUUID(),
      id = crypto.randomUUID();
    await db.query("insert into auth.users values($1),($2)", [owner, other]);
    await db.query(
      "insert into profiles values($1,'student',$2,$3,'학생','student')",
      [owner, org, classId],
    );
    await db.query(
      "insert into editor.editor_projects values($1,$2,null,'test')",
      [project, owner],
    );
    const start = (who = owner, hash = "a".repeat(64), requestId = id) =>
      db.query<{ result: { created: boolean } }>(
        "select editor.editor_begin_ai_request($1,$2,$3,null,'chat','가린 프롬프트',$4,'test',null,7,'approved-test') as result",
        [who, requestId, project, hash],
      );
    await db.query("insert into organization_memberships values($1,$2,null)", [
      owner,
      org,
    ]);
    assert.equal((await start()).rows[0].result.created, true);
    await db.exec("set role service_role");
    assert.equal(
      (
        await db.query<{ active_membership: boolean }>(
          "select active_membership from editor.editor_ai_request_management",
        )
      ).rows[0].active_membership,
      true,
    );
    await db.exec("reset role");
    await db.query(
      "update organization_memberships set ended_at=now() where user_id=$1",
      [owner],
    );
    assert.equal(
      (
        await db.query<{ active_membership: boolean }>(
          "select active_membership from editor.editor_ai_request_management",
        )
      ).rows[0].active_membership,
      false,
    );

    assert.equal((await start()).rows[0].result.created, false);
    await assert.rejects(start(owner, "b".repeat(64)), /request conflict/);
    await assert.rejects(start(other), /invalid owner/);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from editor.editor_ai_requests"),
      /permission denied/,
    );
    await assert.rejects(start(), /permission denied/);
    await db.exec("reset role");
    await db.query("update profiles set org_id=$1 where id=$2", [
      crypto.randomUUID(),
      owner,
    ]);
    const row = (
      await db.query<{ org_id: string; same_org: boolean }>(
        "select * from editor.editor_ai_request_management",
      )
    ).rows[0];
    assert.equal(row.org_id, org);
    assert.equal(row.same_org, false);
    await db.query("delete from editor.editor_projects where id=$1", [project]);
    assert.equal(
      (await db.query("select * from editor.editor_ai_requests")).rows.length,
      1,
    );
    await db.exec(
      "update editor.editor_ai_requests set status='running',cost_usd=1,cost_kind='reserved',updated_at=now()-interval '11 minutes';select editor.editor_cleanup_ai_requests()",
    );
    assert.deepEqual(
      (
        await db.query(
          "select status,cost_usd::float8 from editor.editor_ai_requests",
        )
      ).rows,
      [{ status: "unknown", cost_usd: 1 }],
    );
    await db.exec(
      "update editor.editor_ai_requests set expires_at=now()-interval '1 second';select editor.editor_cleanup_ai_requests()",
    );
    assert.equal(
      (await db.query("select * from editor.editor_ai_requests")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});

test("all nine reviewed candidates satisfy metadata and modality contracts without a paid call", () => {
  for (const candidate of MODEL_CATALOG) {
    const metadata = modelMetadata(
      catalogFixture.data.find((m) => m.id === candidate.id),
    );
    assert.equal(metadata.vision, candidate.vision, candidate.id);
    assert.ok(metadata.maxOutputTokens > 0, candidate.id);
  }
});
