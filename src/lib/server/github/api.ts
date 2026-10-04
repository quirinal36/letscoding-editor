import type { GitHubRepository } from "../../github";
import type { GitHubSession } from "./session";

export class GitHubError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function limitedJson(response: Response, limit = 8 * 1024 * 1024) {
  if (Number(response.headers.get("content-length")) > limit)
    throw new GitHubError("GitHub 응답이 너무 큽니다.");
  const reader = response.body?.getReader();
  if (!reader) throw new GitHubError("GitHub 응답을 읽지 못했습니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new GitHubError("GitHub 응답이 너무 큽니다.");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString());
  } finally {
    await reader.cancel().catch(() => {});
  }
}
export async function github(
  token: string,
  path: string,
  method = "GET",
  body?: unknown,
) {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new GitHubError("잘못된 GitHub 경로입니다.");
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new GitHubError(
        "GitHub 연결이 만료되었습니다. 다시 연결해주세요.",
        401,
      );
    if (response.status === 403 || response.status === 429)
      throw new GitHubError(
        "GitHub 권한 또는 요청 한도를 확인해주세요. 저장소 접근을 허용한 뒤 잠시 후 다시 시도하세요.",
        403,
      );
    if (response.status === 404)
      throw new GitHubError(
        "저장소·브랜치를 찾을 수 없습니다. GitHub App에 이 저장소를 허용했는지 확인해주세요.",
        404,
      );
    if ([409, 422].includes(response.status))
      throw new GitHubError(
        "GitHub 변경 또는 브랜치 보호 규칙으로 저장하지 못했습니다. 변경사항을 다시 확인해주세요.",
        409,
      );
    throw new GitHubError(
      "GitHub 요청에 실패했습니다. 변경사항을 확인한 뒤 다시 시도해주세요.",
      502,
    );
  }
  return response.status === 204 ? null : limitedJson(response);
}
type RawRepository = {
  id: number;
  owner: { id: number; login: string };
  name: string;
  default_branch: string;
  private: boolean;
  permissions?: { push?: boolean };
  archived?: boolean;
};
export async function installationRepositories(
  session: GitHubSession,
  installationId: number,
) {
  const result: GitHubRepository[] = [];
  for (let page = 1; page <= 20; page++) {
    const data = await github(
      session.token,
      `/user/installations/${installationId}/repositories?per_page=100&page=${page}`,
    );
    for (const repo of data.repositories as RawRepository[])
      if (repo.owner.id === session.githubUserId && !repo.archived)
        result.push({
          id: repo.id,
          installationId,
          owner: repo.owner.login,
          name: repo.name,
          defaultBranch: repo.default_branch,
          private: repo.private,
          canPush: !!repo.permissions?.push,
        });
    if (data.repositories.length < 100) return result;
  }
  throw new GitHubError("연결할 저장소 수를 줄인 뒤 다시 시도해주세요.");
}
export async function repositories(session: GitHubSession) {
  const result: GitHubRepository[] = [];
  for (let page = 1; page <= 10; page++) {
    const data = await github(
      session.token,
      `/user/installations?per_page=100&page=${page}`,
    );
    for (const installation of data.installations)
      result.push(
        ...(await installationRepositories(session, installation.id)),
      );
    if (data.installations.length < 100) return result;
  }
  throw new GitHubError("GitHub 설치 목록을 모두 확인하지 못했습니다.");
}
export async function repository(
  session: GitHubSession,
  installationId: number,
  id: number,
) {
  const repo = (await installationRepositories(session, installationId)).find(
    (r) => r.id === id,
  );
  if (!repo)
    throw new GitHubError(
      "본인 계정에서 앱에 허용한 저장소만 연결할 수 있습니다.",
      403,
    );
  return repo;
}
export const repoPath = (repo: Pick<GitHubRepository, "owner" | "name">) =>
  `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
export function branchPath(branch: string) {
  if (
    !branch ||
    branch.length > 200 ||
    /[\x00-\x20~^:?*\[\\]/.test(branch) ||
    branch.includes("..") ||
    branch.includes("@{") ||
    branch
      .split("/")
      .some(
        (p) =>
          !p || p.startsWith(".") || p.endsWith(".") || p.endsWith(".lock"),
      )
  )
    throw new GitHubError("올바른 브랜치 이름을 선택해주세요.");
  return branch.split("/").map(encodeURIComponent).join("/");
}
