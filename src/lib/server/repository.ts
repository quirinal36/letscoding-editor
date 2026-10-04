import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Project, ProjectFile, SessionUser } from "../types";
import { validateFiles } from "../vfs";
export const uuid = z.string().uuid();
export const fileSchema = z.object({
  kind: z.enum(["text", "binary", "directory"]),
  content: z.string().max(7 * 1024 * 1024),
  mime: z.string().max(100),
  size: z.number().int().min(0),
  storagePath: z.string().max(500).optional(),
});
export const projectInput = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(100),
  template: z.string().max(40),
  revision: z.number().int(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
  files: z.record(z.string(), fileSchema),
});
export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 서버 저장 설정이 필요합니다.");
  return createClient(url, key, {
    db: { schema: "editor" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function authenticate(request: Request): Promise<SessionUser> {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    throw new Error("다른 출처의 요청은 허용되지 않습니다.");
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error("로그인이 필요합니다.");
  const db = admin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("로그인 세션이 만료되었습니다.");
  const profile = await db
    .schema("public")
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (profile.error || !profile.data)
    throw new Error("라운지 사용자 정보를 확인할 수 없습니다.");
  return { id: data.user.id, email: data.user.email, role: profile.data.role };
}
export function activeUser(user: SessionUser) {
  if (!["student", "teacher", "admin"].includes(user.role))
    throw new Error(
      "현재 계정은 편집기와 배포를 사용할 수 없습니다. 라운지에서 수강 상태를 확인하세요.",
    );
}
export async function list(user: SessionUser): Promise<Project[]> {
  const { data, error } = await admin()
    .from("editor_projects")
    .select("*")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error)
    throw new Error(
      "에디터 테이블 준비가 필요합니다. 검토 문서의 DB 적용 항목을 확인하세요.",
    );
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    template: row.template,
    revision: row.revision,
    metadataRevision: row.metadata_revision,
    updatedAt: row.updated_at,
    loungeId: row.lounge_project_id ?? undefined,
    files: {},
    threads: [],
    deployments: [],
  }));
}
export async function get(user: SessionUser, id: string): Promise<Project> {
  uuid.parse(id);
  const db = admin();
  const { data: row, error } = await db
    .from("editor_projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();
  if (error || !row)
    throw new Error("프로젝트를 찾을 수 없거나 접근 권한이 없습니다.");
  const { data: files, error: fileError } = await db
    .from("editor_files")
    .select("*")
    .eq("project_id", id);
  if (fileError) throw new Error("파일을 읽지 못했습니다.");
  const result: Record<string, ProjectFile> = {};
  for (const file of files ?? []) {
    let content = file.text_content ?? "";
    if (file.kind === "text" && file.storage_path) {
      const { data, error } = await db.storage
        .from("editor-files")
        .download(file.storage_path);
      if (error || !data || data.size !== file.size_bytes)
        throw new Error("텍스트 파일을 읽지 못했습니다.");
      content = new TextDecoder("utf-8", { fatal: true }).decode(
        await data.arrayBuffer(),
      );
    }
    if (file.kind === "binary") {
      const signed = await db.storage
        .from("editor-files")
        .createSignedUrl(file.storage_path, 300);
      if (signed.error)
        throw new Error("파일 다운로드 URL 생성에 실패했습니다.");
      content = signed.data.signedUrl;
    }
    result[file.path] = {
      kind: file.kind,
      content,
      mime: file.mime,
      size: file.size_bytes,
      storagePath: file.storage_path ?? undefined,
    };
  }
  return {
    id: row.id,
    title: row.title,
    template: row.template,
    revision: row.revision,
    metadataRevision: row.metadata_revision,
    updatedAt: row.updated_at,
    loungeId: row.lounge_project_id ?? undefined,
    files: result,
    threads: row.snapshot.threads ?? [],
    deployments: row.snapshot.deployments ?? [],
  };
}
export async function prepareFiles(user: SessionUser, project: Project) {
  validateFiles(project.files);
  const db = admin();
  const files = [];
  for (const [path, f] of Object.entries(project.files)) {
    if (f.kind === "binary" || f.storagePath) {
      if (!f.storagePath?.startsWith(`${user.id}/${project.id}/`))
        throw new Error(`${path}: 올바른 업로드 경로가 필요합니다.`);
      const blob = await db.storage.from("editor-files").info(f.storagePath);
      if (blob.error || Number(blob.data.size) !== f.size)
        throw new Error(`${path}: 업로드 파일 크기를 검증하지 못했습니다.`);
    }
    files.push({
      path,
      kind: f.kind,
      text_content: f.kind === "text" && !f.storagePath ? f.content : null,
      storage_path: f.storagePath ?? null,
      size_bytes: f.size,
      mime: f.mime,
    });
  }
  return files;
}
export async function save(
  user: SessionUser,
  project: Project,
  expectedRevision: number,
  advance = true,
  metadata = true,
): Promise<Project> {
  const db = admin();
  const files = await prepareFiles(user, project);
  const { data, error } = await db.rpc("editor_save_project", {
    p_owner: user.id,
    p_project: { ...project, files: undefined },
    p_files: files,
    p_expected: expectedRevision,
    p_advance: advance,
    p_metadata: metadata,
    p_meta_expected: project.metadataRevision ?? 0,
  });
  if (error)
    throw new Error(
      error.message.includes("revision")
        ? "다른 탭에서 파일을 저장했습니다. 프로젝트를 다시 열어주세요."
        : "프로젝트 저장에 실패했습니다. DB 계약과 용량을 확인하세요.",
    );
  return {
    ...project,
    revision: Number(data.revision),
    metadataRevision: Number(data.metadataRevision),
    updatedAt: new Date().toISOString(),
  };
}
export async function cloudBytes(project: Project) {
  const files = { ...project.files };
  for (const [path, f] of Object.entries(files))
    if (f.kind === "binary" && f.storagePath) {
      const { data, error } = await admin()
        .storage.from("editor-files")
        .download(f.storagePath);
      if (error || !data)
        throw new Error(`${path}: 바이너리를 읽지 못했습니다.`);
      const bytes = Buffer.from(await data.arrayBuffer());
      files[path] = {
        ...f,
        content: `data:${f.mime};base64,${bytes.toString("base64")}`,
      };
    }
  return files;
}
export async function reserve(user: SessionUser, amount: number) {
  const id = crypto.randomUUID();
  const { error } = await admin().rpc("editor_reserve_usage", {
    p_owner: user.id,
    p_id: id,
    p_amount: amount,
    p_daily: Number(process.env.EDITOR_AI_DAILY_LIMIT_USD),
    p_monthly: Number(process.env.EDITOR_AI_MONTHLY_LIMIT_USD),
  });
  if (error)
    throw new Error(
      "AI 예산이 부족하거나 이전 AI 요청이 진행 중입니다. 잠시 후 다시 확인하세요.",
    );
  return id;
}
export async function settle(
  user: SessionUser,
  id: string,
  cost: number,
  promptTokens: number,
  completionTokens: number,
) {
  const { error } = await admin().rpc("editor_settle_usage", {
    p_owner: user.id,
    p_id: id,
    p_cost: cost,
    p_prompt: promptTokens,
    p_completion: completionTokens,
  });
  if (error)
    throw new Error("AI 사용량 정산이 필요합니다. 관리자에게 알려주세요.");
}
