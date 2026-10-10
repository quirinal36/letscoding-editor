// Student-owned Supabase project link. URL and anon key are public browser values;
// service_role/secret keys are rejected everywhere and never stored.
export type SupabaseLink = { url: string; anonKey: string; connectedAt: string };
export type SupabaseKeyKind = "anon" | "service_role" | "secret" | "unknown";
export const SUPABASE_JS_CDN =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
export const SUPABASE_CLIENT_FILE = "supabase.js";
const HOST = /^[a-z0-9][a-z0-9-]{2,62}\.supabase\.co$/;

function jwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !/^eyJ/.test(parts[0])) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        ),
      ),
    );
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}
export function classifyKey(key: string): SupabaseKeyKind {
  const value = key.trim();
  if (/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(value)) return "anon";
  if (/^sb_secret_/.test(value)) return "secret";
  const role = jwtRole(value);
  if (role === "anon") return "anon";
  if (role === "service_role") return "service_role";
  return "unknown";
}
export function parseSupabaseUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(
      "Project URL 형식이 올바르지 않습니다. 예: https://abcdefghijklmnopqrst.supabase.co",
    );
  }
  if (
    url.protocol !== "https:" ||
    !HOST.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  )
    throw new Error(
      "https://<프로젝트>.supabase.co 형식의 Project URL만 연결할 수 있습니다.",
    );
  return url.origin;
}
export function normalizeLink(
  input: { url: string; anonKey: string },
  now = new Date(),
): SupabaseLink {
  const url = parseSupabaseUrl(input.url),
    anonKey = input.anonKey.trim();
  if (anonKey.length < 20 || anonKey.length > 500 || /\s/.test(anonKey))
    throw new Error("anon key를 다시 확인해주세요.");
  const kind = classifyKey(anonKey);
  if (kind === "service_role" || kind === "secret")
    throw new Error(
      "service_role·secret 키는 연결할 수 없습니다. Supabase 대시보드의 anon(publishable) key를 사용하세요.",
    );
  if (kind !== "anon")
    throw new Error(
      "anon(publishable) key가 아닙니다. Supabase 대시보드 → Project Settings → API Keys에서 복사하세요.",
    );
  return { url, anonKey, connectedAt: now.toISOString() };
}
/** Reachability check with the anon key only; runs in the browser (demo) or on the server (cloud). */
export async function testSupabaseLink(
  link: Pick<SupabaseLink, "url" | "anonKey">,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(`${link.url}/rest/v1/`, {
      headers: {
        apikey: link.anonKey,
        Authorization: `Bearer ${link.anonKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Supabase 프로젝트에 연결할 수 없습니다. URL과 프로젝트 상태(일시정지 여부)를 확인해주세요.",
    );
  }
  if (response.status === 401 || response.status === 403)
    throw new Error(
      "anon key가 거부되었습니다. 같은 프로젝트의 키인지 확인해주세요.",
    );
  if (!response.ok)
    throw new Error(
      `Supabase 응답 오류(${response.status})입니다. 잠시 후 다시 시도해주세요.`,
    );
}
export function supabaseHost(link: SupabaseLink) {
  return new URL(link.url).host;
}
/** Preview CSP allows only the linked project host and the supabase-js CDN. */
export function previewSources(link?: SupabaseLink | null) {
  if (!link) return { connect: "", script: "" };
  const host = supabaseHost(link);
  return {
    connect: ` https://${host} wss://${host}`,
    script: ` ${new URL(SUPABASE_JS_CDN).origin}`,
  };
}
/** Generated client module. Overwrites supabase.js when the student presses "코드에 넣기". */
export function supabaseClientFile(link: SupabaseLink) {
  return `// DB 연결 패널에서 만든 파일입니다. 연결을 바꾸면 다시 "코드에 넣기"를 누르세요.
import { createClient } from "${SUPABASE_JS_CDN}";

export const supabase = createClient(
  ${JSON.stringify(link.url)},
  ${JSON.stringify(link.anonKey)},
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// 사용 예
// const { data, error } = await supabase.from("guestbook").select("*").order("created_at", { ascending: false });
// const { error } = await supabase.from("guestbook").insert({ name: "이름", message: "내용" });
`;
}
export function supabasePlaceholderFile() {
  return `// 아직 DB가 연결되지 않았습니다. 상단 "DB" 버튼에서 Supabase 프로젝트를 연결하고 "코드에 넣기"를 누르세요.
export const supabase = null;
`;
}
/** Deploy guard: a service_role JWT or sb_secret_ key inside student files blocks the ZIP. */
export function containsSecretKey(content: string) {
  if (/\bsb_secret_[A-Za-z0-9_-]{8,}/.test(content)) return true;
  for (const match of content.matchAll(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g))
    if (jwtRole(match[0]) === "service_role") return true;
  return false;
}
export const GUESTBOOK_SQL = `-- Supabase SQL Editor에서 실행하세요. 방명록 테이블과 RLS 정책을 만듭니다.
create table if not exists public.guestbook (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 20),
  message text not null check (char_length(message) between 1 and 200),
  created_at timestamptz not null default now()
);
alter table public.guestbook enable row level security;
-- 누구나 읽을 수 있고, 글쓰기만 허용합니다. 수정·삭제는 대시보드에서만 합니다.
create policy "guestbook read" on public.guestbook for select to anon using (true);
create policy "guestbook write" on public.guestbook for insert to anon with check (true);
`;
