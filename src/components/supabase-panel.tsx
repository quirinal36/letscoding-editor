"use client";
import { useState } from "react";
import type { Project } from "@/lib/types";
import {
  classifyKey,
  GUESTBOOK_SQL,
  normalizeLink,
  SUPABASE_CLIENT_FILE,
  supabaseHost,
  testSupabaseLink,
  type SupabaseLink,
} from "@/lib/supabase-link";

export function SupabasePanel({
  enabled,
  demo,
  project,
  onLink,
  onUnlink,
  onInsertCode,
}: {
  enabled: boolean;
  demo: boolean;
  project: Project | null;
  onLink: (link: SupabaseLink) => Promise<void>;
  onUnlink: () => Promise<void>;
  onInsertCode: (link: SupabaseLink) => Promise<void>;
}) {
  const [url, setUrl] = useState(""),
    [anonKey, setAnonKey] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const link = project?.supabase ?? null;
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "DB 작업에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  function keyInput(value: string) {
    const kind = classifyKey(value);
    if (kind === "service_role" || kind === "secret") {
      // Secret keys never leave the input: clear it before any state or request sees it.
      setAnonKey("");
      setError(
        "service_role·secret 키는 붙여넣지 마세요. 이 키는 누구나 모든 데이터를 바꿀 수 있습니다. anon(publishable) key만 사용하세요.",
      );
      return;
    }
    setError("");
    setAnonKey(value);
  }
  if (!enabled)
    return (
      <p className="callout">
        DB 연결을 준비 중입니다. 관리자가 설정을 완료하면 사용할 수 있습니다.
      </p>
    );
  if (!project) return <p className="callout">먼저 프로젝트를 열어주세요.</p>;
  return (
    <section className="github-panel" aria-label="DB 연결" aria-busy={busy}>
      <p>
        본인 Supabase 프로젝트의 Project URL과 anon(publishable) key를
        연결합니다. 두 값은 작품 코드에 그대로 들어가는 공개 값입니다.
        service_role·secret 키는 절대 넣지 마세요.
      </p>
      {demo && (
        <p className="callout">
          로컬 데모에서는 연결 정보가 이 브라우저에만 저장됩니다. 라운지
          계정으로 로그인하면 서버에 저장됩니다.
        </p>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="callout">
          {notice}
        </p>
      )}
      {busy && <p role="status">Supabase에 연결하고 있습니다…</p>}
      {link ? (
        <>
          <p>
            <strong>{supabaseHost(link)}</strong> · 연결됨 (
            {new Date(link.connectedAt).toLocaleString("ko-KR")})
          </p>
          <div className="github-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await onInsertCode(link);
                  setNotice(
                    `${SUPABASE_CLIENT_FILE}를 만들었습니다. index.html에서 <script type="module" src="script.js">로 불러오고 script.js에서 import { supabase } from "./supabase.js"로 사용하세요.`,
                  );
                })
              }
            >
              코드에 넣기
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await navigator.clipboard.writeText(GUESTBOOK_SQL);
                  setNotice(
                    "방명록 테이블 SQL을 복사했습니다. Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요. RLS가 켜진 상태로 만들어집니다.",
                  );
                })
              }
            >
              테이블 만들기 SQL 복사
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await onUnlink();
                  setNotice(
                    "DB 연결을 해제했습니다. 미리보기의 외부 요청은 다시 차단되며 파일은 그대로 남습니다.",
                  );
                })
              }
            >
              연결 해제
            </button>
          </div>
          <p>
            RLS가 꺼진 테이블은 누구나 읽고 쓸 수 있습니다. 테이블은 위 SQL처럼
            RLS를 켠 상태로 만드세요.
          </p>
        </>
      ) : (
        <>
          <label htmlFor="supabase-url">Project URL</label>
          <input
            id="supabase-url"
            value={url}
            disabled={busy}
            placeholder="https://abcdefghijklmnopqrst.supabase.co"
            autoComplete="off"
            onChange={(e) => setUrl(e.target.value)}
          />
          <label htmlFor="supabase-key">anon (publishable) key</label>
          <input
            id="supabase-key"
            value={anonKey}
            disabled={busy}
            placeholder="sb_publishable_… 또는 eyJ…"
            autoComplete="off"
            onChange={(e) => keyInput(e.target.value)}
          />
          <p>
            Supabase 대시보드 → Project Settings → API Keys에서 복사합니다.
            연결하면 미리보기에서 이 프로젝트 주소로만 요청할 수 있습니다.
          </p>
          <div className="github-actions">
            <button
              type="button"
              disabled={busy || !url || !anonKey}
              onClick={() =>
                void run(async () => {
                  const candidate = normalizeLink({ url, anonKey });
                  await testSupabaseLink(candidate);
                  setNotice(
                    "연결 테스트에 성공했습니다. 연결을 눌러 저장하세요. 테이블 읽기·쓰기 권한은 테이블 설정에서 별도로 허용해야 합니다.",
                  );
                })
              }
            >
              연결 테스트
            </button>
            <button
              type="button"
              disabled={busy || !url || !anonKey}
              onClick={() =>
                void run(async () => {
                  await onLink(normalizeLink({ url, anonKey }));
                  setUrl("");
                  setAnonKey("");
                  setNotice(
                    "연결했습니다. 코드에 넣기로 supabase.js를 만들어 사용하세요.",
                  );
                })
              }
            >
              연결
            </button>
          </div>
        </>
      )}
    </section>
  );
}
