import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { classifyKey, parseSupabaseUrl } from "../supabase-link";
import { admin, get, uuid } from "./repository";
import { appConfig } from "./config";
import type { Project, SessionUser } from "../types";

const BUCKET = "editor-db-secrets";
const encryptionKey = () => process.env.EDITOR_SUPABASE_ADMIN_KEY ?? "";
export const adminDbEnabled = () =>
  appConfig().supabaseLink &&
  !appConfig().demo &&
  /^[a-f0-9]{64}$/i.test(encryptionKey());
const binding = (userId: string, project: Project) =>
  JSON.stringify([
    userId,
    project.id,
    project.supabase?.url,
    project.supabase?.connectedAt,
  ]);
const pathFor = (userId: string, projectId: string) =>
  `connections/${uuid.parse(userId)}/${uuid.parse(projectId)}.enc`;

export function sealDbKey(
  secret: string,
  context: string,
  key = encryptionKey(),
) {
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error("관리자 연결 암호화 설정이 필요합니다.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(Buffer.from(`editor-db-admin:v1:${context}`));
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}
export function unsealDbKey(
  value: string,
  context: string,
  key = encryptionKey(),
) {
  try {
    if (value.length > 4096 || !/^[a-f0-9]{64}$/i.test(key)) return null;
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key, "hex"),
      bytes.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from(`editor-db-admin:v1:${context}`));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
export function validateAdminKey(input: unknown) {
  const key = z.string().trim().min(20).max(1000).regex(/^\S+$/).parse(input);
  if (!["service_role", "secret"].includes(classifyKey(key)))
    throw new Error("service_role 또는 secret 키를 입력해주세요.");
  return key;
}

// Only fixed GET endpoints are reachable; redirects must not receive the key.
export async function adminDbRead(
  url: string,
  key: string,
  table?: string,
  fetcher: typeof fetch = fetch,
) {
  const origin = parseSupabaseUrl(url);
  if (
    table !== undefined &&
    (!table || table.length > 63 || /[/.?#\\]/.test(table))
  )
    throw new Error("테이블 이름이 올바르지 않습니다.");
  const endpoint =
    table === undefined
      ? "/rest/v1/"
      : `/rest/v1/${encodeURIComponent(table)}?select=*&limit=100`;
  let response: Response;
  try {
    response = await fetcher(origin + endpoint, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      headers: {
        apikey: key,
        ...(classifyKey(key) === "service_role"
          ? { Authorization: `Bearer ${key}` }
          : {}),
        Accept:
          table === undefined ? "application/openapi+json" : "application/json",
        "Accept-Profile": "public",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error(
      "Supabase 연결에 실패했습니다. 주소와 네트워크를 확인해주세요.",
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      response.status === 401 || response.status === 403
        ? "관리자 키가 거부되었거나 조회 권한이 없습니다."
        : "Supabase 조회에 실패했습니다. Data API와 테이블 설정을 확인해주세요.",
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Supabase 응답이 비어 있습니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024)
        throw new Error(
          "조회 결과가 너무 큽니다. Supabase 대시보드에서 확인해주세요.",
        );
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString()) as unknown;
  } catch {
    throw new Error("조회 응답이 너무 크거나 올바르지 않습니다.");
  } finally {
    await reader.cancel().catch(() => {});
  }
}
export function tableNames(spec: unknown) {
  const parsed = z
    .object({ paths: z.record(z.string(), z.unknown()) })
    .parse(spec);
  return Object.entries(parsed.paths)
    .flatMap(([path, methods]) =>
      /^\/[^/]+$/.test(path) &&
      methods &&
      typeof methods === "object" &&
      "get" in methods
        ? [path.substring(1)]
        : [],
    )
    .sort();
}
async function privateBucket(create = false) {
  const db = admin();
  let result = await db.storage.getBucket(BUCKET);
  if (result.error && create && String(result.error.statusCode) === "404") {
    await db.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 4096,
      allowedMimeTypes: ["text/plain"],
    });
    result = await db.storage.getBucket(BUCKET);
  }
  if (result.error) {
    if (String(result.error.statusCode) === "404" && !create) return null;
    throw new Error("관리자 연결 저장소 설정을 확인해주세요.");
  }
  if (result.data.public)
    throw new Error("관리자 연결 저장소는 비공개 설정이어야 합니다.");
  return db.storage.from(BUCKET);
}
export async function removeAdminDb(userId: string, projectId: string) {
  const bucket = await privateBucket();
  if (!bucket) return;
  const result = await bucket.remove([pathFor(userId, projectId)]);
  if (result.error)
    throw new Error("관리자 연결 삭제에 실패했습니다. 다시 시도해주세요.");
}
export async function adminDbAction(
  user: SessionUser,
  body: Record<string, unknown>,
) {
  const project = await get(user, uuid.parse(body.projectId));
  if (body.action === "supabase-admin-status" && !adminDbEnabled())
    return { enabled: false, connected: false };
  if (!adminDbEnabled())
    throw new Error("관리자 연결 암호화 설정이 필요합니다.");
  if (body.action === "supabase-admin-unlink") {
    await removeAdminDb(user.id, project.id);
    return { enabled: true, connected: false };
  }
  if (!project.supabase)
    throw new Error("먼저 작품의 DB 공개 키 연결을 완료해주세요.");
  const context = binding(user.id, project);
  if (body.action === "supabase-admin-connect") {
    const key = validateAdminKey(body.key);
    const tables = tableNames(await adminDbRead(project.supabase.url, key));
    const bucket = (await privateBucket(true))!;
    const result = await bucket.upload(
      pathFor(user.id, project.id),
      Buffer.from(sealDbKey(key, context)),
      { upsert: true, contentType: "text/plain" },
    );
    if (result.error) throw new Error("관리자 연결 저장에 실패했습니다.");
    return { enabled: true, connected: true, tables };
  }
  const bucket = await privateBucket();
  let key: string | null = null;
  if (bucket) {
    const result = await bucket.download(pathFor(user.id, project.id));
    if (
      result.error &&
      !["404", "400"].includes(String(result.error.statusCode))
    )
      throw new Error("관리자 연결을 불러오지 못했습니다.");
    if (result.data && result.data.size <= 4096)
      key = unsealDbKey(await result.data.text(), context);
  }
  if (!key) {
    if (body.action === "supabase-admin-status")
      return { enabled: true, connected: false };
    throw new Error("관리자 연결을 다시 등록해주세요.");
  }
  if (body.action === "supabase-admin-status")
    return {
      enabled: true,
      connected: true,
      tables: tableNames(await adminDbRead(project.supabase.url, key)),
    };
  if (body.action !== "supabase-admin-read")
    throw new Error("지원하지 않는 관리자 요청입니다.");
  const table = z.string().min(1).max(63).parse(body.table);
  const tables = tableNames(await adminDbRead(project.supabase.url, key));
  if (!tables.includes(table)) throw new Error("조회할 수 없는 테이블입니다.");
  const rows = z
    .array(z.record(z.string(), z.unknown()))
    .max(100)
    .parse(await adminDbRead(project.supabase.url, key, table));
  return { rows };
}
