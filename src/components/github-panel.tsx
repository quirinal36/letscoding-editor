"use client";
import { useEffect, useState } from "react";
import { githubApi } from "@/lib/client";
import type { Project } from "@/lib/types";
import type { GitHubRepository, GitHubStatus } from "@/lib/github";

export function GitHubPanel({
  demo,
  project,
  beforeSync,
  onProject,
}: {
  demo: boolean;
  project: Project | null;
  beforeSync: () => Promise<number>;
  onProject: (project: Project) => Promise<void>;
}) {
  const [status, setStatus] = useState<GitHubStatus | null>(null),
    [repos, setRepos] = useState<GitHubRepository[]>([]),
    [branches, setBranches] = useState<{ name: string }[]>([]);
  const [repoId, setRepoId] = useState(""),
    [branch, setBranch] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const repo = repos.find((r) => String(r.id) === repoId);
  const projectId = project?.id;
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    githubApi("status", { projectId })
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [demo, projectId]);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub 작업에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    await beforeSync();
    setStatus(await githubApi("status", { projectId }));
  }
  const selected = () => ({
    installationId: repo!.installationId,
    repositoryId: repo!.id,
    branch,
  });
  const reviewed = () => ({
    projectId,
    revision: status!.revision,
    version: status!.version,
    head: status!.head,
  });
  if (demo)
    return (
      <p className="callout">
        GitHub 연동은 라운지 계정으로 로그인한 운영 에디터에서 사용할 수
        있습니다. 데모 프로젝트는 ZIP으로 보관해주세요.
      </p>
    );
  return (
    <section className="github-panel" aria-label="GitHub 연동" aria-busy={busy}>
      <p>
        본인 GitHub 계정의 허용한 저장소를 연결합니다. 가져오기·커밋은 버튼을
        눌렀을 때만 실행됩니다.
      </p>
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
      {busy && <p role="status">GitHub 작업을 처리하고 있습니다…</p>}
      {!status && !error && <p role="status">연결 상태를 확인하고 있습니다…</p>}
      {status && !status.enabled && (
        <p className="callout">
          GitHub 연결을 준비 중입니다. 관리자가 설정을 완료하면 사용할 수
          있습니다.
        </p>
      )}
      {status?.enabled && (
        <>
          <div className="github-actions">
            <strong>
              {status.connected
                ? `연결된 계정: ${status.login}`
                : "GitHub 계정을 연결해주세요."}
            </strong>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await beforeSync();
                  const r = await githubApi("connect");
                  window.location.assign(r.url);
                })
              }
            >
              {status.connected ? "GitHub 계정 다시 연결" : "내 GitHub 연결"}
            </button>
            {status.connected && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await githubApi("disconnect");
                    setStatus({ ...status, connected: false });
                    setRepos([]);
                    setRepoId("");
                    setNotice("이 브라우저의 GitHub 연결을 해제했습니다.");
                  })
                }
              >
                이 브라우저 연결 해제
              </button>
            )}
          </div>
          <a href={status.installUrl} target="_blank" rel="noreferrer">
            GitHub에서 허용할 저장소 선택 ↗
          </a>
          {status.connected && (
            <>
              {status.link ? (
                <>
                  <p>
                    <strong>
                      {status.link.owner}/{status.link.name}
                    </strong>{" "}
                    · {status.link.branch}
                  </p>
                  <p>
                    기준 커밋 <code>{status.link.baseSha.slice(0, 7)}</code>
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(refresh)}
                  >
                    변경사항 새로 확인
                  </button>
                  {!!status.ignoredCount && (
                    <p>
                      지원하지 않는 파일 {status.ignoredCount}개는 GitHub에
                      그대로 보존합니다.
                    </p>
                  )}
                  {status.remoteAhead && (
                    <p className="callout">
                      GitHub에 새 변경사항이 있습니다.{" "}
                      {status.canPull
                        ? "최신 내용을 가져올 수 있습니다."
                        : "에디터에도 수정한 내용이 있습니다. ZIP으로 보관하거나 새 프로젝트로 가져와 비교해주세요."}
                    </p>
                  )}
                  <ul
                    className="github-changes"
                    aria-label="커밋할 파일 변경사항"
                  >
                    {status.changes?.map((c) => (
                      <li key={c.path}>
                        <span>
                          {
                            {
                              added: "추가",
                              modified: "수정",
                              deleted: "삭제",
                            }[c.kind]
                          }
                        </span>
                        <code>{c.path}</code>
                      </li>
                    ))}
                  </ul>
                  {!status.changes?.length && (
                    <p>에디터에서 변경한 파일이 없습니다.</p>
                  )}
                  <label htmlFor="github-message">커밋 메시지</label>
                  <input
                    id="github-message"
                    value={message}
                    maxLength={500}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="예: 게임 버튼 색상 수정"
                  />
                  <div className="github-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={
                        busy ||
                        !message.trim() ||
                        !status.changes?.length ||
                        status.remoteAhead ||
                        !status.link.canPush
                      }
                      onClick={() =>
                        void run(async () => {
                          await beforeSync();
                          const result = await githubApi("push", {
                            ...reviewed(),
                            message,
                          });
                          await refresh();
                          setMessage("");
                          setNotice(
                            `GitHub에 커밋했습니다: ${result.commit.slice(0, 7)}`,
                          );
                        })
                      }
                    >
                      변경사항 커밋
                    </button>
                    <button
                      type="button"
                      disabled={busy || !status.remoteAhead || !status.canPull}
                      onClick={() =>
                        void run(async () => {
                          await beforeSync();
                          const r = await githubApi("pull", reviewed());
                          await onProject(r.project);
                        })
                      }
                    >
                      최신 내용 가져오기
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await beforeSync();
                          await githubApi("unlink", {
                            projectId,
                            version: status.version,
                            revision: status.revision,
                          });
                          await refresh();
                          setNotice(
                            "프로젝트 연결을 해제했습니다. 파일과 GitHub 저장소는 유지됩니다.",
                          );
                        })
                      }
                    >
                      프로젝트 연결 해제
                    </button>
                  </div>
                </>
              ) : (
                <p>연결된 프로젝트 저장소가 없습니다.</p>
              )}
              <hr />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setRepos(await githubApi("repositories"));
                    setRepoId("");
                    setBranches([]);
                    setBranch("");
                  })
                }
              >
                내 저장소 목록 불러오기
              </button>
              {!!repos.length && (
                <>
                  <label htmlFor="github-repository">저장소</label>
                  <select
                    id="github-repository"
                    value={repoId}
                    disabled={busy}
                    onChange={(e) => {
                      const id = e.target.value;
                      setRepoId(id);
                      setBranch("");
                      setBranches([]);
                      const target = repos.find((r) => String(r.id) === id);
                      if (target)
                        void run(async () => {
                          const list = await githubApi("branches", {
                            installationId: target.installationId,
                            repositoryId: target.id,
                          });
                          setBranches(list);
                          setBranch(
                            list.some(
                              (b: { name: string }) =>
                                b.name === target.defaultBranch,
                            )
                              ? target.defaultBranch
                              : (list[0]?.name ?? ""),
                          );
                        });
                    }}
                  >
                    <option value="">저장소를 선택해주세요</option>
                    {repos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.owner}/{r.name} · {r.private ? "비공개" : "공개"}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="github-branch">브랜치</label>
                  <select
                    id="github-branch"
                    value={branch}
                    disabled={busy || !repo}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    <option value="">브랜치를 선택해주세요</option>
                    {branches.map((b) => (
                      <option key={b.name}>{b.name}</option>
                    ))}
                  </select>
                  <p>
                    루트에 index.html이 있는 정적 웹 프로젝트를 지원합니다. 기존
                    저장소의 브랜치를 선택해주세요.
                  </p>
                  <div className="github-actions">
                    <button
                      type="button"
                      disabled={busy || !repo || !branch}
                      onClick={() =>
                        void run(async () => {
                          await beforeSync();
                          const r = await githubApi("import", selected());
                          await onProject(r.project);
                        })
                      }
                    >
                      새 프로젝트로 가져오기
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy || !repo || !branch || !project || !!status.link
                      }
                      onClick={() =>
                        void run(async () => {
                          const revision = await beforeSync();
                          await githubApi("link", {
                            ...selected(),
                            projectId,
                            revision,
                          });
                          await refresh();
                          setNotice(
                            "저장소를 연결했습니다. 파일 변경 목록을 검토한 뒤 커밋해주세요.",
                          );
                        })
                      }
                    >
                      현재 프로젝트 연결
                    </button>
                  </div>
                </>
              )}
              {!repos.length && (
                <p>
                  저장소가 보이지 않으면 GitHub에서 앱에 해당 저장소를 허용한 뒤
                  목록을 다시 불러오세요.
                </p>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <div className="github-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(refresh)}
          >
            다시 확인
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await githubApi("disconnect");
                setStatus(await githubApi("status", { projectId }));
              })
            }
          >
            GitHub 연결 초기화
          </button>
        </div>
      )}
    </section>
  );
}
