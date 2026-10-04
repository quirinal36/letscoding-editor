import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createProject } from "../src/lib/templates";
import {
  assertPath,
  textFile,
  moveFile,
  applyProposal,
  validateFiles,
  LIMITS,
} from "../src/lib/vfs";
import {
  createArtifact,
  importArtifact,
  validateArtifact,
} from "../src/lib/artifact";
import { systemPrompt } from "../src/lib/server/ai";
import { demoAnswer } from "../src/lib/demo-ai";
import { appConfig } from "../src/lib/server/config";

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
