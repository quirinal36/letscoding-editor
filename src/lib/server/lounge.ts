import { createHash } from "node:crypto";
import { z } from "zod";
import { binaryBytes, createArtifact, importArtifact } from "../artifact";
import { loungeIntent } from "../lounge-prompts";
import type { Project } from "../types";
import { cloudBytes } from "./repository";
import { validateFiles } from "../vfs";

const endpoint = "https://lounge-deploy-mcp.letscoding.kr/mcp";
const sha = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const policySchema = z.object({
  policyId: z.literal("lounge-deploy"),
  version: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
  contentHash: hash,
  active: z.literal(true),
  policy: z.object({
    zip: z.object({
      maxCompressedBytes: z.number().int().positive(),
      maxUncompressedBytes: z.number().int().positive(),
      maxFiles: z.number().int().positive(),
      maxEntries: z.number().int().positive(),
      maxPathLength: z.number().int().positive(),
    }),
    files: z.object({ allowedExtensions: z.array(z.string()).min(1) }),
  }),
});
export async function loungeCall(
  name: "get_policy" | "analyze_project" | "validate_artifact",
  args: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const id = crypto.randomUUID();
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.any([
      ...(signal ? [signal] : []),
      AbortSignal.timeout(15000),
    ]),
  });
  if (!response.ok)
    throw new Error(
      `라운지 정책 서비스에 연결하지 못했습니다 (${response.status}). 잠시 후 다시 시도해주세요.`,
    );
  const raw = await response.text();
  if (raw.length > 500000) throw new Error("라운지 정책 응답이 너무 큽니다.");
  const rpc = z
    .object({
      id: z.literal(id),
      result: z.object({
        isError: z.boolean().optional(),
        structuredContent: z.unknown().optional(),
        content: z
          .array(z.object({ type: z.string(), text: z.string().optional() }))
          .optional(),
      }),
    })
    .parse(JSON.parse(raw));
  const envelope = z
    .object({
      ok: z.boolean(),
      data: z.unknown().optional(),
      error: z.object({ code: z.string(), message: z.string() }).optional(),
    })
    .parse(
      rpc.result.structuredContent ??
        JSON.parse(
          rpc.result.content?.find((c) => c.type === "text")?.text ?? "null",
        ),
    );
  if (rpc.result.isError || !envelope.ok)
    throw new Error(
      `라운지 검증 실패: ${envelope.error?.code ?? name} · ${envelope.error?.message ?? "다시 시도해주세요."}`,
    );
  return envelope.data;
}
export async function loungePolicy(signal?: AbortSignal) {
  return policySchema.parse(await loungeCall("get_policy", {}, signal));
}

// Adapted from Lounge Deploy 0.3.0's ranking/name skill. Limits come from the live policy.
export async function loungeGuidance(text: string, signal?: AbortSignal) {
  const intent = loungeIntent(text);
  if (!intent.ranking && !intent.displayName && !intent.artifact) return "";
  const policy = await loungePolicy(signal);
  return (
    `\n라운지 공식 연동 지침 (정책 ${policy.version}, ${policy.contentHash}): 사용자 요청 범위만 수행한다. 라운지는 정적 HTML/CSS/JS만 실행하며 서버 코드·로그인 화면·Supabase 키·사용자 UUID·인증 쿠키를 작품에 추가하지 않는다. index.html은 ZIP 루트, 로컬 자산은 상대 경로. 허용 확장자: ${policy.policy.files.allowedExtensions.join(", ")}.\n` +
    (intent.ranking
      ? `랭킹은 화면이나 localStorage로 흉내 내지 말고 공식 SDK로 점수를 등록한다. 기존 게임을 끝까지 읽어 실제 점수 변수와 모든 최종 게임 종료(마지막 생명 소진·시간 만료 등) 지점을 찾는다. 점수나 종료 조건이 없으면 코드를 바꾸지 않고 이유를 설명한다. 단계·라운드 완료나 일시정지는 종료가 아니다. 기존 head에 <script src="https://lounge.letscoding.kr/sdk/letscoding-ranking.js"></script>를 추가하고 기존 결과 화면에 처음에는 빈 rankingStatus 요소를 추가한다. 새 결과 화면·랭킹 조회 API를 발명하지 않는다. 각 게임 실행마다 rankingSubmitted=false를 두고, window.LetscodingRanking이 없으면 로컬 SDK 미로딩 안내 후 플레이를 유지한다. SDK 확인 후 플래그를 true로 설정하고 등록 중 안내, Number.isFinite(score) 확인 뒤 Math.max(0, Math.floor(score))를 window.LetscodingRanking.submitScore(safeScore)에 전달한다. 성공 안내를 표시하고 실패 시 error.message를 그대로 textContent로 보여주며 플래그를 false로 돌려 재시도 가능하게 한다. 새 게임 시작 시 플래그와 안내를 초기화한다. 점수 계산·난이도·게임 규칙을 보존하고 점수·사용자 ID를 다른 서버에 보내지 않는다. 응답과 PROJECT.md에는 점수 변수, 종료 지점, 로컬 미리보기에서는 실제 등록을 검증할 수 없음을 적는다.\n`
      : "") +
    (intent.displayName
      ? `표시 이름은 라운지가 삽입한 base href=/play/{작품ID}/ 에서 작품 ID를 읽는다. document.baseURI의 pathname이 실제 /play/{id}/인지 확인하고 그때만 fetch('/api/me?projectId=' + encodeURIComponent(projectId), {credentials:'same-origin'})를 호출한다. 응답의 profile.display_name만 textContent로 표시한다. 이 URL은 의도된 동일 출처 API이므로 상대 경로로 바꾸지 않는다. 이름을 저장·외부 전송·점수 키로 사용하지 않는다. 네트워크 실패·401·잘못된 응답·로컬 미리보기에서는 기존 안내 문구를 표시하고 게임을 계속 사용할 수 있게 한다. 라운지가 로그인을 담당한다.\n`
      : "") +
    (intent.artifact
      ? `코드 변경을 마친 뒤 prepare_lounge_artifact를 호출해야 ZIP·정책 검증 완료라고 말할 수 있다. 도구 실패 시 성공이라고 말하지 않는다. 사용자가 변경을 승인하거나 자동 반영한 파일과 검증 해시가 일치할 때만 ZIP을 다운로드한다. 실제 게시·업로드는 하지 않는다.\n`
      : "")
  );
}

export async function prepareLoungeArtifact(
  project: Project,
  signal?: AbortSignal,
) {
  // No work source, ZIP bytes, user names, or credentials leave Studio.
  for (let attempt = 0; attempt < 2; attempt++) {
    const policy = await loungePolicy(signal);
    validateFiles(project.files);
    const metadata = Object.entries(project.files)
      .filter(([, f]) => f.kind !== "directory")
      .map(([path, f]) => ({ path, sizeBytes: f.size }));
    const analysis = z
      .object({
        policyVersion: z.string(),
        result: z.object({
          pass: z.boolean(),
          build: z.object({ command: z.string().nullable() }),
          findings: z.array(z.object({ message: z.string() })),
        }),
      })
      .parse(
        await loungeCall(
          "analyze_project",
          // The analyzer classifies runtime entries; docs/images/data are checked in the full ZIP manifest below.
          {
            version: policy.version,
            files: metadata.filter(
              (f) =>
                /\.(?:html?|css|m?js|tsx?|jsx)$/i.test(f.path) ||
                /(?:^|\/)package\.json$/i.test(f.path),
            ),
          },
          signal,
        ),
      );
    if (analysis.policyVersion !== policy.version) continue;
    if (!analysis.result.pass || analysis.result.build.command)
      throw new Error(
        "라운지 정적 배포 검사 실패: " +
          (analysis.result.findings.map((f) => f.message).join(" · ") ||
            "이 작품은 정적 결과물로 먼저 변환해야 합니다."),
      );
    const hydrated = await cloudBytes(project);
    const artifact = await createArtifact(hydrated);
    // Inspect our exact ZIP again; user code is never executed.
    await importArtifact(
      new Uint8Array(artifact.bytes).buffer,
      policy.policy.zip.maxEntries,
    );
    const files = Object.entries(hydrated)
      .filter(([, f]) => f.kind !== "directory")
      .map(([path, f]) => {
        const bytes =
          f.kind === "text"
            ? new TextEncoder().encode(f.content)
            : binaryBytes(f.content);
        return { path, sizeBytes: bytes.length, sha256: sha(bytes) };
      });
    const total = files.reduce((sum, f) => sum + f.sizeBytes, 0),
      limits = policy.policy.zip;
    if (
      artifact.bytes.length > limits.maxCompressedBytes ||
      total > limits.maxUncompressedBytes ||
      files.length > Math.min(limits.maxFiles, limits.maxEntries) ||
      files.some(
        (f) =>
          f.path.length > limits.maxPathLength ||
          !policy.policy.files.allowedExtensions.includes(
            "." + f.path.split(".").at(-1)?.toLowerCase(),
          ),
      )
    )
      throw new Error(
        "현재 라운지 정책의 파일·크기·경로 제한에 맞지 않습니다.",
      );
    const latest = await loungePolicy(signal);
    if (
      latest.version !== policy.version ||
      latest.contentHash !== policy.contentHash
    )
      continue;
    const entries = files
      .map((f) => [
        `string:${f.path}`,
        `number:${f.sizeBytes}`,
        `sha256:${f.sha256}`,
      ])
      .sort((a, b) =>
        JSON.stringify(a) < JSON.stringify(b)
          ? -1
          : JSON.stringify(a) > JSON.stringify(b)
            ? 1
            : 0,
      );
    const validation = z
      .object({
        decision: z.string(),
        pass: z.boolean(),
        policyVersion: z.string(),
      })
      .parse(
        await loungeCall(
          "validate_artifact",
          {
            policyVersion: policy.version,
            manifest: {
              kind: "zip",
              compressedBytes: artifact.bytes.length,
              uncompressedBytes: total,
              fileCount: files.length,
              files,
              artifactSha256: artifact.sha256,
            },
            localValidation: {
              pass: true,
              policyVersion: policy.version,
              artifactSha256: artifact.sha256,
              fileSetSha256: sha(
                "letscoding-artifact-file-set-v1\0" + JSON.stringify(entries),
              ),
              fileCount: files.length,
              totalUncompressedBytes: total,
              codes: [],
            },
          },
          signal,
        ),
      );
    if (validation.decision === "REVALIDATION_REQUIRED") continue;
    if (
      !validation.pass ||
      validation.decision !== "PASS" ||
      validation.policyVersion !== policy.version
    )
      throw new Error(
        `라운지 최종 검증 실패 (${validation.decision}). 파일을 확인하고 다시 요청해주세요.`,
      );
    signal?.throwIfAborted();
    return {
      sha256: artifact.sha256,
      policyVersion: policy.version,
      fileCount: files.length,
      compressedBytes: artifact.bytes.length,
    };
  }
  throw new Error("검증 중 라운지 정책이 변경되었습니다. 다시 요청해주세요.");
}
