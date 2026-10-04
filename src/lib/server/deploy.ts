import { createHmac, createHash } from "node:crypto";
import type { Project, SessionUser } from "../types";
import { createArtifact } from "../artifact";
import { cloudBytes } from "./repository";
import { z } from "zod";
export const deployForm = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(3000),
  category: z.enum(["web_game", "website"]),
  slug: z.string().regex(/^[a-z0-9-]{3,20}$/),
  isPublished: z.boolean(),
  isListed: z.boolean(),
  thumbnailPath: z.string().optional(),
});
export function signedHeaders(
  secret: string,
  body: string,
  timestamp = String(Date.now()),
  nonce = crypto.randomUUID(),
) {
  return {
    "Content-Type": "application/json",
    "X-Editor-Timestamp": timestamp,
    "X-Editor-Nonce": nonce,
    "X-Editor-Signature": createHmac("sha256", secret)
      .update(`${timestamp}.${nonce}.${body}`)
      .digest("hex"),
  };
}
export async function deploy(
  user: SessionUser,
  project: Project,
  form: z.infer<typeof deployForm>,
) {
  const base = process.env.LOUNGE_INTERNAL_API_URL,
    secret = process.env.LOUNGE_INTERNAL_API_SECRET;
  if (!base || !secret || process.env.EDITOR_DEPLOY_ENABLED !== "true")
    throw new Error(
      "라운지 배포 연결을 준비한 뒤 활성화해주세요. ZIP 다운로드는 사용할 수 있습니다.",
    );
  const origin = new URL(base);
  if (
    origin.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(origin.hostname)
    )
  )
    throw new Error("내부 배포 API는 HTTPS 주소여야 합니다.");
  const artifact = await createArtifact(await cloudBytes(project));
  const call = async (action: string, payload: Record<string, unknown>) => {
    const body = JSON.stringify({
      action,
      userId: user.id,
      editorProjectId: project.id,
      ...payload,
    });
    const response = await fetch(base, {
      method: "POST",
      headers: signedHeaders(secret, body),
      body,
      signal: AbortSignal.timeout(25000),
      redirect: "error",
    });
    const json = await response
      .json()
      .catch(() => ({ error: "라운지 API 응답 형식이 올바르지 않습니다." }));
    if (!response.ok)
      throw new Error(
        json.code === "PROJECT_NOT_FOUND"
          ? "연결된 라운지 작품이 삭제되었습니다. 연결 해제 후 새 작품으로 배포해주세요."
          : (json.error ?? "라운지 배포 요청에 실패했습니다."),
      );
    return json;
  };
  const init = await call("prepare", {
    loungeProjectId: project.loungeId,
    form,
    sha256: artifact.sha256,
    byteSize: artifact.bytes.length,
    policyVersion: artifact.policyVersion,
    idempotencyKey: `${project.id}:${createHash("sha256")
      .update(
        JSON.stringify({
          loungeId: project.loungeId ?? null,
          sha256: artifact.sha256,
          form,
        }),
      )
      .digest("hex")}`,
  });
  if (init.receipt) {
    const receipt = z
      .object({ resultUrl: z.string().url(), policyVersion: z.string() })
      .parse(init.receipt);
    const url = new URL(receipt.resultUrl);
    if (url.protocol !== "https:" || url.hostname !== "play.letscoding.kr")
      throw new Error("배포 결과 URL이 올바르지 않습니다.");
    return {
      loungeId: z.string().uuid().parse(init.projectId),
      deployment: {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: "success" as const,
        sha256: artifact.sha256,
        policyVersion: receipt.policyVersion,
        url: receipt.resultUrl,
      },
    };
  }
  const upload = z
    .object({
      uploadUrl: z.string().url(),
      uploadId: z.string(),
      projectId: z.string().uuid(),
    })
    .parse(init);
  const uploadUrl = new URL(upload.uploadUrl),
    storageHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  if (uploadUrl.protocol !== "https:" || uploadUrl.hostname !== storageHost)
    throw new Error("라운지 업로드 주소가 허용한 Storage 주소와 다릅니다.");
  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/zip" },
    body: new Uint8Array(artifact.bytes),
    signal: AbortSignal.timeout(60000),
    redirect: "error",
  });
  if (!response.ok) throw new Error("ZIP 업로드가 실패했습니다.");
  const complete = await call("complete", {
    uploadId: upload.uploadId,
    loungeProjectId: upload.projectId,
  });
  const result = z
    .object({ resultUrl: z.string().url(), policyVersion: z.string() })
    .parse(complete);
  const resultUrl = new URL(result.resultUrl);
  if (
    resultUrl.protocol !== "https:" ||
    resultUrl.hostname !== "play.letscoding.kr"
  )
    throw new Error("배포 결과 URL이 올바르지 않습니다.");
  return {
    loungeId: upload.projectId,
    deployment: {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "success" as const,
      sha256: artifact.sha256,
      policyVersion: result.policyVersion,
      url: result.resultUrl,
    },
  };
}
