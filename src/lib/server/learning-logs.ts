import { createHash } from "node:crypto";
import type { Project, SessionUser } from "../types";
import { redactPrompt } from "../learning-logs";
import { learningLogPolicy } from "./config";
import { admin } from "./repository";
export type LogStatus =
  | "received"
  | "running"
  | "complete"
  | "partial"
  | "rejected"
  | "error"
  | "interrupted"
  | "unknown"
  | "save_failed"
  | "settlement_failed";
type Update = {
  status?: LogStatus;
  reason?: string;
  actual_model?: string;
  reservation_id?: string;
  cost_usd?: number;
  cost_kind?: "known" | "reserved" | "free";
  prompt_tokens?: number;
  completion_tokens?: number;
};
export type RequestLog = {
  update: (fields: Update) => Promise<void>;
  finish: (status: LogStatus, fields?: Update) => Promise<void>;
};
export async function beginRequest(
  user: SessionUser,
  project: Project,
  input: {
    requestId?: string;
    retryOf?: string;
    threadId?: string;
    text: string;
    model: string;
    kind: "chat" | "image" | "local";
    context: unknown;
  },
): Promise<RequestLog> {
  const policy = learningLogPolicy();
  if (!policy) {
    if (process.env.EDITOR_AI_LOGGING_ENABLED === "true")
      throw new Error("학습 기록 보존 정책 설정이 필요합니다.");
    return { update: async () => {}, finish: async () => {} };
  }
  if (!input.requestId)
    throw new Error("요청 ID가 필요합니다. 화면을 새로고침해주세요.");
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify([
        project.id,
        input.threadId,
        input.text,
        input.model,
        input.kind,
        input.context,
      ]),
    )
    .digest("hex");
  const db = admin();
  const { data, error } = await db.rpc("editor_begin_ai_request", {
    p_owner: user.id,
    p_id: input.requestId,
    p_project: project.id,
    p_thread: input.threadId ?? null,
    p_kind: input.kind,
    p_prompt: redactPrompt(input.text),
    p_fingerprint: fingerprint,
    p_model: redactPrompt(input.model),
    p_retry: input.retryOf ?? null,
    p_days: policy.retentionDays,
    p_policy: policy.version,
  });
  if (error || !data)
    throw new Error(
      "학습 기록을 저장하지 못해 요청을 중단했습니다. 요청 ID와 내용을 확인해주세요.",
    );
  if (!data.created)
    throw new Error(
      `이미 접수된 요청입니다 (${data.status}). 대화와 사용량을 새로고침해 확인해주세요. 중복 호출하지 않았습니다.`,
    );
  let finished = false;
  async function write(fields: Update, done = false) {
    const { error } = await db
      .from("editor_ai_requests")
      .update({
        ...fields,
        updated_at: new Date().toISOString(),
        ...(done ? { finished_at: new Date().toISOString() } : {}),
      })
      .eq("id", input.requestId!)
      .eq("user_id", user.id);
    if (error)
      throw new Error("학습 기록 상태 저장 실패. 관리자 확인이 필요합니다.");
  }
  return {
    update: (fields) => write(fields),
    finish: async (status, fields = {}) => {
      if (finished) return;
      await write({ ...fields, status }, true);
      finished = true;
    },
  };
}
