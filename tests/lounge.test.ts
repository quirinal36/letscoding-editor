import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createProject } from "../src/lib/templates";
import { textFile } from "../src/lib/vfs";
import { validateArtifact } from "../src/lib/artifact";
import { loungeIntent, loungePrompts } from "../src/lib/lounge-prompts";
import {
  loungeGuidance,
  prepareLoungeArtifact,
} from "../src/lib/server/lounge";
import policy from "./fixtures/lounge-policy.json";

test("Lounge prompts use official guidance and validate exact ZIP metadata without sharing source", async () => {
  assert.equal(loungeIntent(loungePrompts[0]).ranking, true);
  assert.equal(loungeIntent(loungePrompts[1]).artifact, "zip");
  assert.equal(loungeIntent(loungePrompts[2]).displayName, true);
  assert.equal(loungeIntent(loungePrompts[3]).artifact, "check");
  assert.equal(loungeIntent("라운지 ZIP 정책을 설명해줘").artifact, null);
  assert.equal(loungeIntent("일반 랭킹 화면 만들어줘").ranking, false);
  const oldFetch = globalThis.fetch;
  const project = createProject("blank");
  project.files["data.json"] = textFile('{"level":1}');
  project.files["assets/pixel.png"] = {
    kind: "binary",
    content: "data:image/png;base64,AQID",
    size: 3,
    mime: "image/png",
  };
  let mode = "success",
    policyReads = 0,
    validations = 0,
    analysisCalls = 0;
  try {
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      assert.equal(request.url, "https://lounge-deploy-mcp.letscoding.kr/mcp");
      const body = await request.json();
      assert.equal(body.method, "tools/call");
      assert.equal(request.headers.get("authorization"), null);
      const { name, arguments: args } = body.params;
      let data: unknown;
      if (name === "get_policy") {
        policyReads++;
        data =
          mode === "change" && policyReads % 2 === 0
            ? { ...policy, version: "2026-08-27.2" }
            : policy;
        if (mode === "limit")
          data = {
            ...policy,
            policy: {
              ...policy.policy,
              zip: { ...policy.policy.zip, maxFiles: 1 },
            },
          };
        if (mode === "entry-limit")
          data = {
            ...policy,
            policy: {
              ...policy.policy,
              zip: { ...policy.policy.zip, maxEntries: 6 },
            },
          };
        if (mode === "unavailable")
          return new Response("unavailable", { status: 503 });
      } else if (name === "analyze_project") {
        analysisCalls++;
        assert.deepEqual(
          args.files.map((f: { path: string }) => f.path),
          ["index.html", "style.css", "script.js"],
        );
        assert.ok(
          args.files.every(
            (f: object) => Object.keys(f).sort().join(",") === "path,sizeBytes",
          ),
        );
        data = {
          policyVersion: policy.version,
          result: {
            pass: mode !== "block",
            build: { command: null },
            findings:
              mode === "block"
                ? [{ message: "unsupported server runtime" }]
                : [],
          },
        };
      } else if (name === "validate_artifact") {
        validations++;
        assert.equal(args.manifest.fileCount, 6);
        const metadata = args.manifest.files;
        assert.ok(
          metadata.every(
            (f: object) =>
              Object.keys(f).sort().join(",") === "path,sha256,sizeBytes",
          ),
        );
        assert.equal(
          args.manifest.uncompressedBytes,
          metadata.reduce(
            (sum: number, f: { sizeBytes: number }) => sum + f.sizeBytes,
            0,
          ),
        );
        assert.equal(
          args.manifest.artifactSha256,
          args.localValidation.artifactSha256,
        );
        const canonical = metadata
          .map((f: { path: string; sizeBytes: number; sha256: string }) => [
            `string:${f.path}`,
            `number:${f.sizeBytes}`,
            `sha256:${f.sha256}`,
          ])
          .sort((a: string[], b: string[]) =>
            JSON.stringify(a) < JSON.stringify(b) ? -1 : 1,
          );
        assert.equal(
          args.localValidation.fileSetSha256,
          createHash("sha256")
            .update(
              "letscoding-artifact-file-set-v1\0" + JSON.stringify(canonical),
            )
            .digest("hex"),
        );
        data = {
          decision:
            mode === "fail"
              ? "VALIDATION_FAILED"
              : mode === "revalidate"
                ? "REVALIDATION_REQUIRED"
                : "PASS",
          pass: mode === "success",
          policyVersion: policy.version,
        };
      } else throw new Error("unexpected MCP call");
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: { structuredContent: { ok: true, data } },
      });
    };
    assert.equal(await loungeGuidance("버튼 색 바꿔줘"), "");
    assert.equal(policyReads, 0);
    const ranking = await loungeGuidance(loungePrompts[0]);
    assert.match(
      ranking,
      /https:\/\/lounge\.letscoding\.kr\/sdk\/letscoding-ranking\.js/,
    );
    assert.match(ranking, /submitScore\(safeScore\)/);
    assert.match(ranking, /마지막 생명|시간 만료/);
    assert.match(ranking, /플래그를 false/);
    assert.doesNotMatch(ranking, /fetch\('\/api\/me/);
    const name = await loungeGuidance(loungePrompts[2]);
    assert.match(name, /\/api\/me\?projectId=/);
    assert.match(name, /credentials:'same-origin'/);
    assert.match(name, /textContent/);
    assert.doesNotMatch(name, /submitScore/);
    const result = await prepareLoungeArtifact(project);
    assert.equal(result.fileCount, 6);
    assert.equal(result.policyVersion, policy.version);
    assert.ok(result.compressedBytes > 0);
    assert.equal(validations, 1);
    for (mode of [
      "unavailable",
      "entry-limit",
      "limit",
      "block",
      "fail",
      "change",
      "revalidate",
    ]) {
      policyReads = 0;
      await assert.rejects(
        () => prepareLoungeArtifact(project),
        /라운지|정책|다시|한도/,
      );
    }
    mode = "success";
    const before = analysisCalls;
    project.files[".env.local"] = textFile("SECRET");
    await assert.rejects(() => prepareLoungeArtifact(project), /금지/);
    assert.equal(
      analysisCalls,
      before,
      "forbidden file metadata is never sent",
    );
    delete project.files[".env.local"];
    project.files["scene.glb"] = {
      kind: "binary",
      content: "data:application/octet-stream;base64,AQID",
      size: 3,
      mime: "application/octet-stream",
    };
    await assert.rejects(
      () => prepareLoungeArtifact(project),
      /현재 라운지 정책/,
    );
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test("Lounge display-name API is allowed while unrelated root assets remain blocked", () => {
  validateArtifact({
    "index.html": textFile("<p id='name'></p>"),
    "script.js": textFile(
      "fetch('/api/me?projectId=' + encodeURIComponent(projectId), {credentials: 'same-origin'})",
    ),
  });
  for (const url of [
    "/api/users",
    "/api/me",
    "/api/me-other?projectId=1",
    "/images/me.png",
  ]) {
    assert.throws(
      () =>
        validateArtifact({
          "index.html": textFile(`<script>fetch('${url}')</script>`),
        }),
      /상대 경로/,
    );
  }
});
