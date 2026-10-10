import loungePolicyFixture from "./fixtures/lounge-policy.json";
import { loungePrompts } from "../src/lib/lounge-prompts";
import {
  requestRefusal,
  replaceExact,
  rewriteNeedsReview,
} from "../src/lib/ai-policy";
import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createProject } from "../src/lib/templates";
import {
  assertPath,
  assertStorageLimit,
  textFile,
  moveFile,
  applyProposal,
  applyProposals,
  validateFiles,
  formatBytes,
  assertUnreferencedMove,
  LIMITS,
  mergeRemoteFiles,
} from "../src/lib/vfs";
import {
  createArtifact,
  importArtifact,
  validateArtifact,
} from "../src/lib/artifact";
import {
  systemPrompt,
  projectContext,
  assertFilesRead,
  chat,
} from "../src/lib/server/ai";
import { demoAnswer } from "../src/lib/demo-ai";
import { appConfig } from "../src/lib/server/config";
import { monthlyUsageLabel } from "../src/lib/usage";

test("student content policy refuses before file work; exact edits preserve the remaining game", () => {
  for (const request of [
    "카지노 게임 만들어줘",
    "정치 홍보 사이트 만들어줘",
    "종교 전도 앱 만들어줘",
    "음란 사이트 만들어줘",
  ]) {
    assert.match(requestRefusal(request)!, /파일은 변경하지 않았습니다/);
    assert.deepEqual(demoAnswer(createProject(), request).proposals, []);
  }
  assert.equal(requestRefusal("스네이크 게임 만들어줘"), null);
  const project = createProject("game");
  const original = project.files["script.js"].content;
  const changes = replaceExact(project, [
    { path: "script.js", before: "score += 1;", after: "score += 2;" },
  ]);
  assert.equal(
    changes[0].content,
    original.replace("score += 1;", "score += 2;"),
  );
  assert.equal(project.files["script.js"].content, original);
  assert.throws(
    () =>
      replaceExact(project, [
        { path: "script.js", before: "missing", after: "" },
      ]),
    /원문/,
  );
  assert.throws(
    () =>
      replaceExact(project, [
        { path: "script.js", before: "score", after: "points" },
      ]),
    /원문/,
  );
  assert.equal(rewriteNeedsReview(project, "script.js", "버튼 수정해줘"), true);
  assert.equal(
    rewriteNeedsReview(project, "script.js", "버튼 수정해줘", true),
    false,
  );
  assert.equal(
    rewriteNeedsReview(project, "script.js", "프로젝트 전체를 새로 만들어줘"),
    false,
  );
  assert.equal(
    rewriteNeedsReview(createProject("blank"), "index.html", "게임 만들어줘"),
    false,
  );
});

test("unsupported image requests return a chat explanation without a model or budget call", async () => {
  const settings = {
    NEXT_PUBLIC_SUPABASE_URL: "https://image-test.example.test",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-only",
    SUPABASE_SERVICE_ROLE_KEY: "test-only",
    OPENROUTER_API_KEY: "test-only",
    OPENROUTER_MODEL_CODE: "test-code",
    EDITOR_AI_ENABLED: "true",
    EDITOR_IMAGE_ENABLED: "false",
    EDITOR_AI_DAILY_LIMIT_USD: "5",
    EDITOR_AI_MONTHLY_LIMIT_USD: "2",
    EDITOR_AI_MAX_TURN_USD: "1",
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]]),
  );
  const oldFetch = globalThis.fetch;
  let saves = 0;
  try {
    Object.assign(process.env, settings);
    globalThis.fetch = async (input) => {
      assert.match(String(input), /\/rest\/v1\/rpc\/editor_save_project$/);
      saves++;
      return Response.json({ revision: 0, metadataRevision: 1 });
    };
    const project = createProject("blank", "이미지 안내");
    const response = await chat(
      { id: crypto.randomUUID(), role: "student" },
      project,
      {
        projectId: project.id,
        threadId: project.threads[0].id,
        text: "사과 이미지 만들어줘",
        model: "test-code",
        images: [],
        previewErrors: [],
      },
      new Request("https://image-test.example.test/api/editor"),
    );
    const result = await response.json();
    assert.equal(result.type, "done");
    assert.match(
      result.message.text,
      /^이 도구는 이미지 생성, 편집 기능을 제공하지 않습니다\./,
    );
    assert.deepEqual(result.message.proposals, []);
    assert.equal(saves, 1);
    for (const text of [
      "카지노 게임 만들어줘",
      "정치 사이트 만들어줘",
      "종교 앱 만들어줘",
      "음란 게임 만들어줘",
    ]) {
      const refused = await chat(
        { id: crypto.randomUUID(), role: "student" },
        project,
        {
          projectId: project.id,
          threadId: project.threads[0].id,
          text,
          model: "test-code",
          images: [],
          previewErrors: [],
        },
        new Request("https://image-test.example.test/api/editor"),
      );
      const event = await refused.json();
      assert.match(event.message.text, /지원하지 않습니다/);
      assert.deepEqual(event.message.proposals, []);
    }
    assert.equal(saves, 5);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of Object.keys(settings)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("new conversations receive Markdown memory; unread or partial code cannot be overwritten", () => {
  const project = createProject("blank", "숫자 맞히기");
  project.files["PROJECT.md"] = textFile(
    "# 숫자 맞히기\n1~100 사이 숫자를 맞히며 횟수를 표시합니다.",
  );
  project.files["script.js"] = textFile("guessNumber();".repeat(3000));
  const instructions = systemPrompt(project);
  assert.match(instructions, /폴더 정리해줘.*파일·폴더 구조 정리/);
  assert.match(
    instructions,
    /정리 노트·할 일 앱을 만들거나 기존 화면·기능을 교체하지 않는다/,
  );
  assert.match(instructions, /저장 안내는 넣지 않는다/);
  assert.match(instructions, /현재 파일:/);
  assert.throws(
    () =>
      assertUnreferencedMove(
        {
          ...project,
          files: {
            ...project.files,
            "index.html": textFile('<script src="./script.js"></script>'),
          },
        },
        "script.js",
      ),
    /참조 경로/,
  );
  assert.doesNotThrow(() => assertUnreferencedMove(project, "PROJECT.md"));
  const context = projectContext(project);
  assert.deepEqual(
    context.map((file) => file.path),
    ["PROJECT.md"],
  );
  assert.match(context[0].content, /숫자 맞히기/);
  assert.ok(new TextEncoder().encode(JSON.stringify(context)).length <= 8192);
  const reads = new Map(
    context.map((file) => [file.path, file.content.length]),
  );
  assert.throws(() => assertFilesRead(project, ["script.js"], reads), /끝까지/);
  reads.set("script.js", 8192);
  assert.throws(() => assertFilesRead(project, ["script.js"], reads), /끝까지/);
  reads.set("script.js", project.files["script.js"].content.length);
  assert.doesNotThrow(() =>
    assertFilesRead(project, ["script.js", "new.js", "PROJECT.md"], reads),
  );
  project.files["large.md"] = textFile("가".repeat(9000));
  assert.ok(!projectContext(project).some((file) => file.path === "large.md"));
});

test("late server replies preserve concurrent local edits, additions and removals", () => {
  const base = {
    "index.html": textFile("before"),
    "old.js": textFile("old"),
    "style.css": textFile("black"),
  };
  const local = {
    "index.html": textFile("typed during approval"),
    "new.js": base["old.js"],
    "style.css": base["style.css"],
  };
  const remote = {
    ...base,
    "index.html": textFile("AI result"),
    "style.css": textFile("blue"),
  };
  const merged = mergeRemoteFiles(base, local, remote);
  assert.equal(merged.files["index.html"].content, "typed during approval");
  assert.equal(merged.files["style.css"].content, "blue");
  assert.equal(merged.files["new.js"].content, "old");
  assert.equal(merged.files["old.js"], undefined);
  assert.equal(base["index.html"].content, "before");
  assert.deepEqual([...merged.changed].sort(), [
    "index.html",
    "new.js",
    "old.js",
  ]);
});

test("path traversal, encoded paths and secret files are rejected", () => {
  for (const path of [
    "../x",
    "/index.html",
    "a/../b",
    "a\\b",
    "a//b",
    ".env.local",
    "x/.git/config",
    "node_modules/a.js",
    "runtime-config.js",
    "a%2fb",
    "a?x",
  ])
    assert.throws(() => assertPath(path));
  assert.equal(assertPath("assets/한글 logo.png"), "assets/한글 logo.png");
});
test("implicit folder rename preserves content and refuses collisions/self nesting", () => {
  const files = { "a/b.js": textFile("hello"), "other.js": textFile("world") };
  assert.equal(moveFile(files, "a", "src")["src/b.js"].content, "hello");
  assert.throws(() => moveFile(files, "a", "a/sub"));
  assert.throws(() => moveFile(files, "a/b.js", "other.js"));
});
test("untrusted AI replies propose changes but cannot mutate files; stale proposals fail", () => {
  const project = createProject("game", "test");
  const before = project.files["style.css"].content;
  const reply = demoAnswer(project, "버튼 색을 파랗게 바꿔줘");
  const largeTree = {
    ...project,
    files: Object.fromEntries(
      Array.from({ length: 500 }, (_, i) => [
        `${i}/한글`.repeat(20) + ".txt",
        textFile(""),
      ]),
    ),
  };
  assert.ok(
    new TextEncoder().encode(systemPrompt(largeTree, "index.html")).length <
      4000,
  );
  assert.equal(project.files["style.css"].content, before);
  const proposal = reply.proposals[0];
  const next = applyProposal(project, proposal);
  assert.match(next.files["style.css"].content, /#3b82f6/);
  assert.throws(() => applyProposal(next, proposal), /오래/);
  assert.throws(() =>
    applyProposal(project, { ...proposal, status: "applied" }),
  );
});
test("limits and nested file conflicts are enforced", () => {
  assert.throws(() =>
    validateFiles({ a: textFile("hi"), "a/b": textFile("x") }),
  );
  assert.throws(() =>
    validateFiles({
      a: textFile("hi"),
      "a/b": { kind: "directory", content: "", size: 0, mime: "" },
    }),
  );
  assert.throws(() =>
    validateFiles({
      "x.png": {
        kind: "binary",
        size: LIMITS.upload + 1,
        mime: "image/png",
        content: "",
      },
    }),
  );
  assert.throws(() =>
    validateFiles(
      Object.fromEntries(
        Array.from({ length: 501 }, (_, i) => [`${i}.txt`, textFile("")]),
      ),
    ),
  );
  assert.throws(() => validateFiles({ x: { ...textFile("abc"), size: 1 } }));
});
test("templates and nested binary assets roundtrip ZIP with stable digest", async () => {
  for (const template of ["blank", "game", "profile"]) {
    const files = createProject(template, "test").files;
    files["assets/logo.png"] = {
      kind: "binary",
      content: "data:image/png;base64,AQID",
      mime: "image/png",
      size: 3,
    };
    const artifact = await createArtifact(files);
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    const imported = await importArtifact(
      artifact.bytes.buffer.slice(
        artifact.bytes.byteOffset,
        artifact.bytes.byteOffset + artifact.bytes.byteLength,
      ) as ArrayBuffer,
    );
    assert.equal(imported["index.html"].content, files["index.html"].content);
    assert.equal(
      imported["assets/logo.png"].content,
      files["assets/logo.png"].content,
    );
  }
});
test("unsafe imports and unsupported deploy sources are rejected", async () => {
  const files = { "index.html": textFile('<img src="/assets/a.png">') };
  assert.throws(() => validateArtifact(files), /상대/);
  assert.throws(
    () =>
      validateArtifact({ "index.html": textFile(""), "main.ts": textFile("") }),
    /확장자/,
  );
  const zip = new JSZip();
  zip.file("../evil.txt", "bad");
  zip.file("index.html", "ok");

  // Actual path traversal archive must also be rejected after central directory validation.
  await assert.rejects(async () =>
    importArtifact(await zip.generateAsync({ type: "arraybuffer" })),
  );
});
test("production never activates demo or paid services with only keys", () => {
  const keys = [
    "NODE_ENV",
    "EDITOR_DEMO_MODE",
    "EDITOR_AI_ENABLED",
    "EDITOR_IMAGE_ENABLED",
    "EDITOR_AI_DAILY_LIMIT_USD",
    "EDITOR_AI_MONTHLY_LIMIT_USD",
    "EDITOR_AI_MAX_TURN_USD",
  ];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.EDITOR_DEMO_MODE = "true";
    process.env.EDITOR_AI_ENABLED = "true";
    delete process.env.EDITOR_AI_MAX_TURN_USD;
    assert.equal(appConfig().demo, false);
    assert.equal(appConfig().ai, false);
    assert.equal(appConfig().image, false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("forged ZIP metadata cannot bypass streaming inflation cap", async () => {
  const zip = new JSZip();
  zip.file("index.html", "x".repeat(LIMITS.upload + 1));
  const bytes = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
    }),
    view = new DataView(bytes);
  for (let p = 0; p + 46 < bytes.byteLength; p++)
    if (view.getUint32(p, true) === 0x02014b50) {
      view.setUint32(p + 24, 1, true);
      break;
    }
  await assert.rejects(() => importArtifact(bytes), /크기|size/);
});

test("autosave waits 60 seconds by default and clamps overrides", () => {
  const previous = process.env.EDITOR_AUTOSAVE_MS;
  try {
    delete process.env.EDITOR_AUTOSAVE_MS;
    assert.equal(appConfig().autosaveMs, 60000);
    for (const [raw, expected] of [
      ["", 60000],
      ["abc", 60000],
      ["Infinity", 60000],
      ["1000", 1000],
      [" 30000 ", 30000],
      ["10", 1000],
      ["-5", 1000],
      ["3600000", 600000],
    ] as const) {
      process.env.EDITOR_AUTOSAVE_MS = raw;
      assert.equal(appConfig().autosaveMs, expected, raw);
    }
  } finally {
    if (previous === undefined) delete process.env.EDITOR_AUTOSAVE_MS;
    else process.env.EDITOR_AUTOSAVE_MS = previous;
  }
});

test("turn reservations use estimated cost without raising the per-turn ceiling", async () => {
  const { turnReservation } = await import("../src/lib/server/config");
  assert.equal(turnReservation(0.03, 10), 0.03);
  assert.equal(turnReservation(10, 10), 10);
  assert.equal(turnReservation(0, 10), 0.000001);
  for (const estimate of [10.01, NaN, Infinity, -1])
    assert.throws(() => turnReservation(estimate, 10), /예산/);
  assert.throws(() => turnReservation(0.03, 0), /예산/);
});

test("deployment ZIP digest ignores insertion order and wall-clock time", async () => {
  const files = createProject("game", "stable").files;
  const first = await createArtifact(files);
  const reordered = Object.fromEntries(Object.entries(files).reverse());
  const second = await createArtifact(reordered);
  assert.equal(first.sha256, second.sha256);
  const zip = await JSZip.loadAsync(first.bytes);
  for (const file of Object.values(zip.files))
    if (!file.dir)
      assert.equal(file.date.toISOString(), "1980-01-01T00:00:00.000Z");
});

test("generated files commit as one revision; stale, duplicate and invalid batches leave originals intact", () => {
  const project = createProject("blank");
  const original = structuredClone(project);
  const proposals = [
    { path: "index.html", content: "<h1>게임</h1>" },
    { path: "style.css", content: "body { color: green; }" },
    { path: "script.js", content: "console.log('ready');" },
  ].map((file) => ({
    id: crypto.randomUUID(),
    operation: "write" as const,
    ...file,
    baseRevision: project.revision,
    status: "pending" as const,
  }));
  const next = applyProposals(project, proposals);
  assert.equal(next.revision, project.revision + 1);
  for (const proposal of proposals)
    assert.equal(next.files[proposal.path].content, proposal.content);
  assert.deepEqual(project, original);
  assert.throws(() => applyProposals(next, proposals), /오래/);
  assert.throws(
    () => applyProposals(project, [...proposals, proposals[0]]),
    /서로 다른/,
  );
  assert.throws(
    () =>
      applyProposals(project, [
        proposals[0],
        { ...proposals[1], path: ".env.local" },
      ]),
    /금지/,
  );
  assert.throws(
    () => applyProposals(project, [{ ...proposals[0], operation: "delete" }]),
    /개별 확인/,
  );
  assert.deepEqual(project, original);
});

test("account storage permits 100MB exactly and rejects invalid or excessive usage", () => {
  const files = Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [
      `${i}.png`,
      {
        kind: "binary" as const,
        content: "blob:test",
        mime: "image/png",
        size: LIMITS.upload,
      },
    ]),
  );
  assert.equal(validateFiles(files).total, 30 * 1024 * 1024);
  assert.throws(
    () => validateFiles({ ...files, "extra.txt": textFile("x") }),
    /30MB/,
  );
  assert.equal(formatBytes(0), "0B");
  assert.equal(formatBytes(1024 * 3), "3KB");
  assert.equal(formatBytes(1024 * 1024), "1MB");
  assert.equal(formatBytes(1536), "1.5KB");
  assertStorageLimit(LIMITS.account);
  assertStorageLimit(0);
  for (const bytes of [LIMITS.account + 1, -1, NaN, Infinity, 0.5])
    assert.throws(() => assertStorageLimit(bytes), /100MB/);
});

test("monthly usage accounts for reservations and resets on the first in Korea", () => {
  const usage = {
    dailyLimitUsd: 5,
    monthlyLimitUsd: 2,
    costUsd: 0.2,
    reservedUsd: 0.1,
    monthCostUsd: 1.4,
    monthReservedUsd: 0.3,
    promptTokens: 0,
    completionTokens: 0,
  };
  assert.equal(
    monthlyUsageLabel(usage, Date.parse("2026-10-06T15:00:00Z")),
    "15% 남음 (25일 후 초기화)",
  );
  assert.equal(
    monthlyUsageLabel(
      { ...usage, monthCostUsd: 2 },
      Date.parse("2026-10-31T14:59:59Z"),
    ),
    "0% 남음 (1일 후 초기화)",
  );
  assert.equal(
    monthlyUsageLabel(
      { ...usage, monthCostUsd: 0, monthReservedUsd: 0 },
      Date.parse("2026-10-31T15:00:00Z"),
    ),
    "100% 남음 (30일 후 초기화)",
  );
  assert.equal(
    monthlyUsageLabel(
      { ...usage, monthlyLimitUsd: 0 },
      Date.parse("2028-02-28T15:00:00Z"),
    ),
    "0% 남음 (1일 후 초기화)",
  );
});

test("Luna chat transport keeps ZDR, tools and budget reservation enabled", async () => {
  const settings = {
    NEXT_PUBLIC_SUPABASE_URL: "https://luna-test.example.test",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-only",
    SUPABASE_SERVICE_ROLE_KEY: "test-only",
    OPENROUTER_API_KEY: "test-only",
    OPENROUTER_MODEL_CODE: "openai/gpt-6-luna",
    EDITOR_AI_ENABLED: "true",
    EDITOR_AI_DAILY_LIMIT_USD: "5",
    EDITOR_AI_MONTHLY_LIMIT_USD: "2",
    EDITOR_AI_MAX_TURN_USD: "1",
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]]),
  );
  const oldFetch = globalThis.fetch;
  const project = createProject("blank", "Transport test");
  let reserved = false,
    sent = false,
    settled = false;
  let scenario = "tools",
    remaining = 2,
    providerCalls = 0,
    lastMaxOutput = 0,
    largeReadCount = 0,
    checkpointCall = 0;
  let expectedLounge: "ranking" | "name" | undefined,
    loungeFailure = false;
  try {
    Object.assign(process.env, settings);
    globalThis.fetch = async (input, init) => {
      const req = new Request(input, init);
      const url = new URL(req.url);
      if (url.hostname === "lounge-deploy-mcp.letscoding.kr") {
        const body = await req.json();
        const { name, arguments: args } = body.params;
        if (loungeFailure) return new Response("unavailable", { status: 503 });
        let data: unknown = loungePolicyFixture;
        if (name === "analyze_project") {
          assert.ok(
            args.files.every(
              (f: object) => !Object.keys(f).includes("content"),
            ),
          );
          data = {
            policyVersion: loungePolicyFixture.version,
            result: { pass: true, build: { command: null }, findings: [] },
          };
        } else if (name === "validate_artifact") {
          assert.ok(
            args.manifest.files.every(
              (f: object) => !Object.keys(f).includes("content"),
            ),
          );
          data = {
            policyVersion: loungePolicyFixture.version,
            decision: "PASS",
            pass: true,
          };
        } else assert.equal(name, "get_policy");
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result: { structuredContent: { ok: true, data } },
        });
      }
      if (url.pathname === "/api/v1/models")
        return Response.json({
          data: [
            {
              id: "openai/gpt-6-luna",
              pricing: { prompt: "0.0000001", completion: "0.0000005" },
              top_provider: { max_completion_tokens: 128000 },
            },
          ],
        });
      if (url.pathname === "/rest/v1/rpc/editor_reserve_usage") {
        const body = await req.json();
        assert.ok(
          body.p_amount > 0 && body.p_amount <= Math.min(1, remaining) + 1e-9,
        );
        assert.equal(body.p_monthly, 2);
        reserved = true;
        return Response.json(null);
      }
      if (url.pathname === "/api/v1/chat/completions") {
        providerCalls++;
        assert.ok(reserved);
        const body = await req.json();
        if (expectedLounge) {
          const instructions = body.messages.find(
            (m: { role: string }) => m.role === "system",
          ).content;
          assert.match(instructions, /라운지 공식 연동 지침/);
          assert.match(
            instructions,
            expectedLounge === "ranking"
              ? /LetscodingRanking.submitScore/
              : /\/api\/me\?projectId=/,
          );
          assert.match(instructions, /textContent/);
        }
        lastMaxOutput = body.max_tokens;
        assert.ok(lastMaxOutput > 0 && lastMaxOutput <= 128000);
        assert.equal(body.model, "openai/gpt-6-luna");
        assert.equal(body.reasoning.effort, "none");
        assert.equal(body.provider.zdr, true);
        assert.equal(body.provider.data_collection, "deny");
        assert.ok(
          body.tools.some(
            (t: { function: { name: string } }) =>
              t.function.name === "write_files",
          ),
        );
        if (scenario.startsWith("checkpoint-")) {
          checkpointCall++;
          if (scenario === "checkpoint-network" && checkpointCall === 3)
            throw new TypeError("Simulated provider disconnect");
          if (
            checkpointCall <= 2 ||
            ([
              "checkpoint-invalid",
              "checkpoint-failed-batch",
              "checkpoint-recovered",
            ].includes(scenario) &&
              checkpointCall === 3) ||
            (scenario === "checkpoint-recovered" && checkpointCall === 4)
          ) {
            const editing = checkpointCall === 2 || checkpointCall === 4;
            const args = editing
              ? {
                  edits: [
                    {
                      path: "greeting.txt",
                      before: checkpointCall === 4 ? "improved" : "base",
                      after: checkpointCall === 4 ? "finished" : "improved",
                    },
                  ],
                  projectDocument: "# Test\nRecovery item ready",
                  summary: "체력 회복 아이템 표시 완성",
                  nextStep:
                    checkpointCall === 4 ? "" : "아이템 획득 시 체력 회복 연결",
                }
              : {
                  files: [
                    {
                      path: "PROJECT.md",
                      content: "# Test\nRecovery item base ready",
                    },
                    { path: "greeting.txt", content: "base" },
                    ...(checkpointCall === 3
                      ? [{ path: ".env", content: "invalid" }]
                      : []),
                  ],
                  summary: "체력 회복 아이템 기본 화면 완성",
                  nextStep: "아이템 표시 개선",
                };
            const chunk = {
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: `checkpoint-${checkpointCall}`,
                        type: "function",
                        function: {
                          name: editing ? "edit_files" : "write_files",
                          arguments:
                            scenario === "checkpoint-invalid" &&
                            checkpointCall === 3
                              ? JSON.stringify(args).slice(0, -8)
                              : JSON.stringify(args),
                        },
                      },
                    ],
                  },
                  finish_reason: "tool_calls",
                },
              ],
              usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
              },
            };
            return new Response(
              `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`,
              {
                headers: { "content-type": "text/event-stream" },
              },
            );
          }
        }
        if (scenario === "large-edit" && largeReadCount < 4) {
          const path = ["script.js", "style.css", "index.html", "extra.js"][
            largeReadCount++
          ];
          const chunk = {
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: `read-${largeReadCount}`,
                      type: "function",
                      function: {
                        name: "read_file",
                        arguments: JSON.stringify({ path }),
                      },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          };
          return new Response(
            `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`,
            {
              headers: { "content-type": "text/event-stream" },
            },
          );
        }
        if (!sent) {
          if (scenario === "large-edit") {
            const results = body.messages.filter(
              (message: { role: string }) => message.role === "tool",
            );
            assert.equal(results.length, 4);
            const result = JSON.parse(results[0].content);
            assert.equal(result.truncated, false);
            assert.equal(result.content, project.files["script.js"].content);
          }
          sent = true;
          let args = JSON.stringify({
            files: [
              { path: "PROJECT.md", content: "# Test\nGenerated greeting.txt" },
              { path: "greeting.txt", content: "hidden generated code" },
            ],
          });
          if (scenario === "large-edit")
            args = JSON.stringify({
              edits: Array.from({ length: 12 }, (_, i) => ({
                path: "script.js",
                before: `const item${i} = 0;`,
                after: `const item${i} = 1;`,
              })),
              projectDocument: "# Test\nAdded recovery items",
            });
          if (scenario === "large-create")
            args = JSON.stringify({
              files: [
                { path: "PROJECT.md", content: "# Test\nCreated files" },
                ...Array.from({ length: 12 }, (_, i) => ({
                  path: `item${i}.js`,
                  content: `const item${i} = 0;`,
                })),
              ],
            });
          if (scenario === "tool-error")
            args = JSON.stringify({
              files: [{ path: "greeting.txt", content: "failed code" }],
            });
          if (scenario === "invalid-json") args = args.slice(0, -8);
          const chunks = [
            {
              id: "tools",
              model: body.model,
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: "write-test",
                        type: "function",
                        function: {
                          name:
                            scenario === "large-edit"
                              ? "edit_files"
                              : "write_files",
                          arguments: args.slice(0, 20),
                        },
                      },
                    ],
                  },
                  finish_reason: null,
                },
              ],
            },
            {
              id: "tools",
              model: body.model,
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: [
                      { index: 0, function: { arguments: args.slice(20) } },
                    ],
                  },
                  finish_reason: null,
                },
              ],
            },
            {
              id: "tools",
              model: body.model,
              choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
              usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
              },
            },
          ];
          return new Response(
            chunks
              .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
              .join("") + "data: [DONE]\n\n",
            { headers: { "content-type": "text/event-stream" } },
          );
        }
        const chunks = [
          {
            id: "test",
            model: body.model,
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant",
                  reasoning: "비공개 준비 내용",
                  content: ["tools", "large-edit", "large-create"].includes(
                    scenario,
                  )
                    ? "테스트 응답입니다."
                    : scenario === "false-completion"
                      ? "투호 게임을 구현했습니다."
                      : scenario === "false-progress"
                        ? "아직 작업 중입니다. 잠시 기다려주세요."
                        : "",
                },
                finish_reason: null,
              },
            ],
          },
          {
            id: "test",
            model: body.model,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: ["length", "checkpoint-length"].includes(
                  scenario,
                )
                  ? "length"
                  : "stop",
              },
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 20,
              total_tokens: 120,
            },
          },
        ];
        return new Response(
          chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
            "data: [DONE]\n\n",
          { headers: { "content-type": "text/event-stream" } },
        );
      }
      if (url.pathname === "/rest/v1/rpc/editor_save_project")
        return Response.json({ revision: 0, metadataRevision: 1 });
      if (url.pathname === "/rest/v1/editor_projects")
        return Response.json({
          id: project.id,
          title: project.title,
          template: "blank",
          revision: 0,
          metadata_revision: 1,
          updated_at: project.updatedAt,
          snapshot: { threads: project.threads },
        });
      if (url.pathname === "/rest/v1/editor_files") return Response.json([]);
      if (url.pathname === "/rest/v1/editor_ai_usage_daily")
        return Response.json([
          {
            date: new Date().toLocaleDateString("en-CA", {
              timeZone: "Asia/Seoul",
            }),
            cost_usd: 2 - remaining,
            reserved_usd: 0,
          },
        ]);
      if (url.pathname === "/rest/v1/rpc/editor_settle_usage") {
        const body = await req.json();
        if (scenario === "checkpoint-network") {
          assert.equal(body.p_prompt, 0);
          assert.equal(body.p_completion, 0);
          assert.ok(
            body.p_cost > 0,
            "unknown provider cost keeps the reservation",
          );
        } else {
          assert.equal(body.p_prompt, 100);
          assert.equal(body.p_completion, 20);
          assert.ok(Math.abs(body.p_cost - 0.00002) < 1e-10);
        }
        settled = true;
        return Response.json(null);
      }
      throw new Error(`Unexpected test endpoint: ${url.pathname}`);
    };
    const response = await chat(
      { id: crypto.randomUUID(), role: "student" },
      project,
      {
        projectId: project.id,
        threadId: project.threads[0].id,
        text: "현재 프로젝트를 설명해줘",
        model: "openai/gpt-6-luna",
        images: [],
        previewErrors: [],
      },
      new Request("https://luna-test.example.test/api/editor"),
    );
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.ok(
      !events.some((event) => event.type === "error"),
      JSON.stringify(events),
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "done" && event.message.text === "테스트 응답입니다.",
      ),
    );
    assert.ok(!JSON.stringify(events).includes("비공개 준비 내용"));
    const progress = events.filter((event) => event.type === "progress");
    assert.ok(progress.length > 0);
    assert.ok(progress.at(-1).characters > 20);
    assert.deepEqual(Object.keys(progress[0]).sort(), ["characters", "type"]);
    assert.equal(
      events.find((event) => event.type === "done").message.proposals.length,
      2,
    );
    assert.ok(sent && reserved && settled);
    for (scenario of [
      "empty",
      "length",
      "tool-error",
      "invalid-json",
      "false-completion",
      "false-progress",
    ]) {
      sent = !["tool-error", "invalid-json"].includes(scenario);
      const failed = await chat(
        { id: crypto.randomUUID(), role: "student" },
        project,
        {
          projectId: project.id,
          threadId: project.threads[0].id,
          text: "게임을 수정해줘",
          model: "openai/gpt-6-luna",
          images: [],
          previewErrors: [],
        },
        new Request("https://luna-test.example.test/api/editor"),
      );
      const failedBody = await failed.text();
      assert.ok(failedBody.includes('"type":"progress"'), scenario);
      assert.ok(!failedBody.includes("비공개 준비 내용"), scenario);
      const done = failedBody
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
        .find((event) => event.type === "done");
      assert.equal(done.message.status, "error", scenario);
      assert.match(
        done.message.text,
        /못했습니다|못하고|중단되었습니다/,
        scenario,
      );
      assert.equal(done.message.proposals.length, 0, scenario);
      if (["tool-error", "invalid-json"].includes(scenario)) {
        const diagnostic = done.message.tools.find(
          (t: { output: { status?: string } }) => t.output.status === "error",
        );
        assert.equal(diagnostic.input, null);
        assert.equal(
          diagnostic.output.kind,
          scenario === "invalid-json" ? "invalid-input" : "execution",
        );
      }
    }

    for (scenario of ["large-edit", "large-create"]) {
      const originalFiles = structuredClone(project.files);
      project.files["script.js"] = textFile(
        "// preserved game logic\n".repeat(2200) +
          Array.from({ length: 12 }, (_, i) => `const item${i} = 0;`).join(
            "\n",
          ),
      );
      project.files["extra.js"] = textFile("// extra game logic");
      sent = false;
      largeReadCount = 0;
      const response = await chat(
        { id: crypto.randomUUID(), role: "student" },
        project,
        {
          projectId: project.id,
          threadId: project.threads[0].id,
          text: "체력 회복 아이템을 추가해줘",
          model: "openai/gpt-6-luna",
          images: [],
          previewErrors: [],
        },
        new Request("https://luna-test.example.test/api/editor"),
      );
      const events = (await response.text())
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      const done = events.find((event) => event.type === "done");
      assert.equal(done.message.status, "complete", JSON.stringify(events));
      assert.equal(
        done.message.proposals.length,
        scenario === "large-edit" ? 2 : 13,
      );
      if (scenario === "large-edit") {
        const code = done.message.proposals.find(
          (proposal: { path: string }) => proposal.path === "script.js",
        );
        assert.ok(
          code.content.startsWith("// preserved game logic\n".repeat(2200)),
        );
        assert.ok(code.content.includes("const item11 = 1;"));
      }
      project.files = originalFiles;
    }

    for (scenario of [
      "checkpoint-length",
      "checkpoint-invalid",
      "checkpoint-failed-batch",
      "checkpoint-network",
      "checkpoint-stop",
      "checkpoint-recovered",
    ]) {
      checkpointCall = 0;
      const response = await chat(
        { id: crypto.randomUUID(), role: "student" },
        project,
        {
          projectId: project.id,
          threadId: project.threads[0].id,
          text: "체력 회복 아이템 만들어줘",
          model: "openai/gpt-6-luna",
          images: [],
          previewErrors: [],
        },
        new Request("https://luna-test.example.test/api/editor"),
      );
      const events = (await response.text())
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      const done = events.find((event) => event.type === "done");
      assert.equal(
        done.message.status,
        scenario === "checkpoint-recovered" ? "complete" : "partial",
        JSON.stringify(events),
      );
      assert.equal(
        done.message.proposals.length,
        2,
        "repeated paths merge; failed batch is excluded",
      );
      if (scenario !== "checkpoint-recovered") {
        assert.match(done.message.text, /체력 회복 아이템 표시 완성/);
        assert.match(
          done.message.text,
          /다음 작업: 아이템 획득 시 체력 회복 연결/,
        );
      }
      assert.ok(!events.some((event) => event.type === "error"), scenario);
      const applied = applyProposals(project, done.message.proposals);
      assert.equal(
        applied.files["greeting.txt"].content,
        scenario === "checkpoint-recovered" ? "finished" : "improved",
      );
      assert.equal(
        done.message.proposals.find(
          (p: { path: string }) => p.path === "greeting.txt",
        ).operation,
        "create",
      );
      assert.ok(!applied.files[".env"]);
      assert.ok(
        !project.files["greeting.txt"],
        "preparation doesn't mutate original files",
      );
    }

    scenario = "empty";
    sent = true;
    for (expectedLounge of ["ranking", "name"] as const) {
      const guided = await chat(
        { id: crypto.randomUUID(), role: "student" },
        project,
        {
          projectId: project.id,
          threadId: project.threads[0].id,
          text: loungePrompts[expectedLounge === "ranking" ? 0 : 2],
          model: "openai/gpt-6-luna",
          images: [],
          previewErrors: [],
        },
        new Request("https://luna-test.example.test/api/editor"),
      );
      await guided.text();
    }
    expectedLounge = undefined;
    scenario = "empty";
    remaining = 0.1;
    sent = true;
    const limited = await chat(
      { id: crypto.randomUUID(), role: "student" },
      project,
      {
        projectId: project.id,
        threadId: project.threads[0].id,
        text: "설명해줘",
        model: "openai/gpt-6-luna",
        images: [],
        previewErrors: [],
      },
      new Request("https://luna-test.example.test/api/editor"),
    );
    await limited.text();
    assert.ok(lastMaxOutput < 128000, "remaining monthly budget limits output");
    remaining = 0;
    const before = providerCalls;
    await assert.rejects(
      () =>
        chat(
          { id: crypto.randomUUID(), role: "student" },
          project,
          {
            projectId: project.id,
            threadId: project.threads[0].id,
            text: "다시 만들어줘",
            model: "openai/gpt-6-luna",
            images: [],
            previewErrors: [],
          },
          new Request("https://luna-test.example.test/api/editor"),
        ),
      /예산/,
    );
    assert.equal(providerCalls, before, "exhausted budget makes no paid call");
    process.env.EDITOR_AI_ENABLED = "false";
    for (const text of [loungePrompts[1], loungePrompts[3]]) {
      const result = await chat(
        { id: crypto.randomUUID(), role: "student" },
        project,
        {
          projectId: project.id,
          threadId: project.threads[0].id,
          text,
          model: "",
          images: [],
          previewErrors: [],
        },
        new Request("https://luna-test.example.test/api/editor"),
      );
      const done = JSON.parse((await result.text()).trim());
      assert.equal(done.message.status, "complete");
      assert.match(done.message.text, /검증했습니다/);
      assert.equal(Boolean(done.artifact), text === loungePrompts[1]);
      assert.equal(
        providerCalls,
        before,
        "ZIP/check don't call the paid model",
      );
    }
    loungeFailure = true;
    const failedZip = await chat(
      { id: crypto.randomUUID(), role: "student" },
      project,
      {
        projectId: project.id,
        threadId: project.threads[0].id,
        text: loungePrompts[1],
        model: "",
        images: [],
        previewErrors: [],
      },
      new Request("https://luna-test.example.test/api/editor"),
    );
    const failedResult = JSON.parse((await failedZip.text()).trim());
    assert.equal(failedResult.message.status, "error");
    assert.equal(failedResult.artifact, undefined);
    assert.match(failedResult.message.text, /503/);
    assert.equal(providerCalls, before);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of Object.keys(settings)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
