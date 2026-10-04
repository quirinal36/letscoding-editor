import { z } from "zod";
import type { ProjectFile, SessionUser } from "../types";
import { binaryBytes } from "../artifact";
import { LIMITS } from "../vfs";
import { admin } from "./repository";
import { appConfig, positive } from "./config";
export async function generateImageFile(
  user: SessionUser,
  projectId: string,
  prompt: string,
  signal?: AbortSignal,
) {
  const config = appConfig(),
    model = config.models.find((m) => m.image);
  if (
    !config.image ||
    !model ||
    !positive("EDITOR_AI_IMAGE_OUTPUT_RESERVE_USD")
  )
    throw new Error("이미지 모델·출력 예산 검증 후 활성화해주세요.");
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
        max_tokens: 1024,
        provider: { zdr: true, data_collection: "deny" },
      }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(120000)])
        : AbortSignal.timeout(120000),
    },
  );
  if (!response.ok) throw new Error("이미지 모델 요청 실패");
  const reader = response.body!.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("이미지 응답 크기 초과");
    }
    chunks.push(value);
  }
  const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const url = z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .parse(result.choices?.[0]?.message?.images?.[0]?.image_url?.url);
  const bytes = binaryBytes(url);
  if (bytes.length > LIMITS.upload)
    throw new Error("생성 이미지는 5MB 이하만 가능합니다.");
  const mime = url.slice(5, url.indexOf(";")),
    path = `images/generated-${crypto.randomUUID()}.${mime === "image/jpeg" ? "jpg" : mime.split("/")[1]}`,
    storagePath = `${user.id}/${projectId}/${crypto.randomUUID()}`;
  const upload = await admin()
    .storage.from("editor-files")
    .upload(storagePath, bytes, { contentType: mime });
  if (upload.error) throw new Error("생성 이미지 저장 실패");
  const cost = Number(result.usage?.cost);
  return {
    path,
    file: {
      kind: "binary",
      content: "",
      mime,
      size: bytes.length,
      storagePath,
    } as ProjectFile,
    cost:
      Number.isFinite(cost) && cost >= 0
        ? cost
        : positive("EDITOR_AI_IMAGE_OUTPUT_RESERVE_USD"),
    promptTokens: Number(result.usage?.prompt_tokens ?? 0),
    completionTokens: Number(result.usage?.completion_tokens ?? 0),
  };
}
