import { timingSafeEqual } from "node:crypto";
import { learningLogRetention } from "@/lib/server/config";
import { admin } from "@/lib/server/repository";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ error: "인증 필요" }, { status: 401 });
  if (
    process.env.EDITOR_AI_LOG_CLEANUP_ENABLED !== "true" ||
    !learningLogRetention()
  )
    return Response.json(
      { error: "학습 기록 정리 정책 활성화가 필요합니다." },
      { status: 503 },
    );
  const { data, error } = await admin().rpc("editor_cleanup_ai_requests");
  return Response.json(error ? { error: "학습 기록 정리 실패" } : data, {
    status: error ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
