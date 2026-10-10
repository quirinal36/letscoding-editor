"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/client";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeLink,
  supabaseHost,
  type SupabaseLink,
} from "@/lib/supabase-link";

export function SupabaseTables({
  link,
  projectId,
  demo,
  sidebar,
  onConnect,
}: {
  link: SupabaseLink | null;
  projectId: string;
  demo: boolean;
  sidebar: HTMLElement | null;
  onConnect: () => void;
}) {
  const request = useRef<AbortController | null>(null);
  const [table, setTable] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [loadedTable, setLoadedTable] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminState, setAdminState] = useState<{
    enabled: boolean;
    connected: boolean;
    tables?: string[];
  } | null>(null);
  const [secret, setSecret] = useState("");
  useEffect(() => {
    if (demo || !link) return;
    const controller = new AbortController();
    void api("supabase-admin-status", { projectId }, controller.signal)
      .then((response) => response.json())
      .then((state) => {
        if (!controller.signal.aborted) setAdminState(state);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAdminState({ enabled: false, connected: false });
          setError(
            "관리자 연결 상태를 불러오지 못했습니다. 창을 다시 열어주세요.",
          );
        }
      });
    return () => controller.abort();
  }, [demo, projectId, link]);
  async function manageAdmin(
    action:
      | "supabase-admin-connect"
      | "supabase-admin-unlink"
      | "supabase-admin-status",
  ) {
    if (busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setRows(null);
    const key = secret;
    setSecret("");
    try {
      const result = await (
        await api(
          action,
          {
            projectId,
            ...(action === "supabase-admin-connect" ? { key } : {}),
          },
          controller.signal,
        )
      ).json();
      if (!controller.signal.aborted) {
        setAdminState(result);
        setTable("");
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "관리자 연결에 실패했습니다.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => () => request.current?.abort(), []);

  async function read(selectedTable = table) {
    if (!link || busy) return;
    const name = selectedTable.trim();
    setTable(name);
    setRows(null);
    setError("");
    if (!name || /[/.?#\\]/.test(name)) {
      setError("public 스키마의 테이블 이름만 입력해주세요. 예: guestbook");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      if (adminState?.connected) {
        const result = await (
          await api(
            "supabase-admin-read",
            { projectId, table: name },
            controller.signal,
          )
        ).json();
        if (!controller.signal.aborted) {
          setRows(result.rows);
          setLoadedTable(name);
        }
        return;
      }
      const safe = normalizeLink(link);
      const client = createClient(safe.url, safe.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      const result = await client
        .from(name)
        .select("*")
        .limit(100)
        .abortSignal(
          AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        );
      if (controller.signal.aborted) return;
      if (result.error) {
        setError(
          result.status === 401 || result.status === 403
            ? "조회 권한이 없습니다. 테이블의 SELECT 권한과 RLS 정책을 확인해주세요."
            : result.status === 404
              ? "테이블을 찾을 수 없습니다. 이름과 Data API 노출 설정을 확인해주세요."
              : "조회하지 못했습니다. 네트워크와 테이블 설정을 확인한 후 다시 시도해주세요.",
        );
        return;
      }
      setRows(result.data ?? []);
      setLoadedTable(name);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          adminState?.connected && error instanceof Error
            ? error.message
            : "연결이 끊겼거나 응답 시간이 초과되었습니다. 다시 시도해주세요.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  if (!link)
    return (
      <>
        {sidebar &&
          createPortal(
            <div className="github-panel">
              <p>먼저 Supabase를 연결해주세요.</p>
              <button onClick={onConnect}>DB 연결하기</button>
            </div>,
            sidebar,
          )}
        <p>DB를 연결하고 왼쪽에서 테이블을 선택해주세요.</p>
      </>
    );
  const columns = [...new Set((rows ?? []).flatMap((row) => Object.keys(row)))];
  const controls = (
    <section
      className="github-panel"
      aria-label="DB 테이블 목록"
      aria-busy={busy}
    >
      <p>{supabaseHost(link)} · 읽기 전용</p>
      <p>
        {adminState?.connected
          ? "관리자 조회 모드 · public 스키마에서 Data API에 노출된 테이블·뷰를 선택하세요. RLS를 우회해 조회합니다."
          : "public 스키마의 테이블 이름을 입력하세요. 공개 키의 권한과 RLS가 허용한 행만 표시합니다."}
      </p>
      {demo ? (
        <p>관리자 연결은 로그인한 서버 모드에서 사용할 수 있습니다.</p>
      ) : !adminState ? (
        <p role="status">관리자 연결 확인 중…</p>
      ) : !adminState.enabled ? (
        <p>관리자 연결을 사용하려면 서버의 암호화 키 설정이 필요합니다.</p>
      ) : adminState.connected ? (
        <div className="github-actions">
          <button
            disabled={busy}
            onClick={() => void manageAdmin("supabase-admin-status")}
          >
            테이블 목록 새로고침
          </button>
          <button
            disabled={busy}
            onClick={() => void manageAdmin("supabase-admin-unlink")}
          >
            관리자 연결 해제
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void manageAdmin("supabase-admin-connect");
          }}
        >
          <label htmlFor="supabase-admin-key">
            관리자 키 (service_role / secret)
          </label>
          <input
            id="supabase-admin-key"
            type="password"
            autoComplete="off"
            maxLength={1000}
            value={secret}
            disabled={busy}
            onChange={(event) => setSecret(event.target.value)}
          />
          <p>
            키는 서버에 암호화해 저장하며 작품 코드에 넣지 않습니다. 관리자
            조회는 이 작품의 소유자만 사용할 수 있습니다.
          </p>
          <button disabled={busy || !secret.trim()}>관리자 연결</button>
        </form>
      )}
      {adminState?.connected ? (
        <>
          <nav aria-label="테이블 목록">
            {(adminState.tables ?? []).map((name) => (
              <button
                key={name}
                className="database-table-item"
                aria-pressed={table === name}
                disabled={busy}
                onClick={() => void read(name)}
              >
                {name}
              </button>
            ))}
          </nav>
          {!adminState.tables?.length && <p>조회 가능한 테이블이 없습니다.</p>}
          <button disabled={busy || !table} onClick={() => void read()}>
            데이터 새로고침
          </button>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void read();
          }}
        >
          <label htmlFor="supabase-table-name">테이블 이름</label>
          <input
            id="supabase-table-name"
            value={table}
            placeholder="guestbook"
            maxLength={63}
            disabled={busy}
            onChange={(event) => {
              setTable(event.target.value);
              setRows(null);
              setError("");
            }}
          />
          <button disabled={busy || !table.trim() || (!demo && !adminState)}>
            {busy ? "조회 중…" : "조회 / 새로고침"}
          </button>
        </form>
      )}
    </section>
  );
  return (
    <>
      {sidebar && createPortal(controls, sidebar)}
      <section
        className="database-results"
        aria-label="테이블 데이터"
        aria-busy={busy}
      >
        {busy && <p role="status">불러오는 중…</p>}
        {!busy && !rows && !error && <p>왼쪽에서 테이블을 선택해주세요.</p>}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        {rows && (
          <>
            <p role="status">
              {loadedTable} · {rows.length}행 (최대 100행)
            </p>
            {rows.length === 0 ? (
              <p>
                {adminState?.connected
                  ? "표시할 행이 없습니다."
                  : "표시할 행이 없습니다. 데이터가 없거나 RLS 정책으로 숨겨졌을 수 있습니다."}
              </p>
            ) : (
              <div
                className="db-table-scroll"
                tabIndex={0}
                role="region"
                aria-label="조회 결과"
              >
                <table>
                  <caption>{loadedTable} 조회 결과</caption>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th scope="col" key={column}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index}>
                        {columns.map((column) => (
                          <td key={column}>
                            {row[column] === null
                              ? "NULL"
                              : typeof row[column] === "object"
                                ? JSON.stringify(row[column])
                                : String(row[column] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
