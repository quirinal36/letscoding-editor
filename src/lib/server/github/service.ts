import { z } from "zod";
import type { GitHubLink, GitHubRepository, GitHubStatus } from "../../github";
import type { Project, SessionUser } from "../../types";
import { createProject } from "../../templates";
import { admin, cloudBytes, get, prepareFiles } from "../repository";
import {
  branchPath,
  github,
  GitHubError,
  repositories,
  repository,
  repoPath,
} from "./api";
import {
  changes,
  downloadFiles,
  fileBytes,
  localHashes,
  pushFiles,
  snapshot,
} from "./git";
import type { GitHubSession } from "./session";

const selection = z.object({
  installationId: z.number().int().positive(),
  repositoryId: z.number().int().positive(),
  branch: z.string().min(1).max(200),
});
const projectInput = z.object({ projectId: z.string().uuid() });
const reviewed = projectInput.extend({
  revision: z.number().int().min(0),
  version: z.string().uuid(),
  head: z.string().regex(/^[a-f0-9]{40}$/),
});
async function storedLink(user: SessionUser, project: Project) {
  const { data, error } = await admin()
    .from("editor_github_links")
    .select("link,version")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error)
    throw new GitHubError(
      "GitHub 연결 DB 준비가 필요합니다. 관리자에게 문의해주세요.",
      503,
    );
  return data as { link: GitHubLink; version: string } | null;
}
async function sync(
  user: SessionUser,
  project: Project,
  previous: string | null,
  link: GitHubLink | null,
  writeFiles = false,
  expected = project.revision,
) {
  const { error } = await admin().rpc("editor_github_sync", {
    p_owner: user.id,
    p_project: { ...project, files: undefined },
    p_files: writeFiles ? await prepareFiles(user, project) : [],
    p_expected: expected,
    p_previous: previous,
    p_link: link,
    p_write_files: writeFiles,
  });
  if (error)
    throw new GitHubError(
      "프로젝트 또는 연결 상태가 바뀌었습니다. 새로고침 후 GitHub 변경사항을 다시 확인해주세요.",
      409,
    );
}
async function saveDownloaded(
  user: SessionUser,
  project: Project,
  previous: string | null,
  link: GitHubLink,
  expected = project.revision,
) {
  const db = admin();
  {
    const textTotal = Object.values(project.files)
      .filter((f) => f.kind === "text")
      .reduce((n, f) => n + f.size, 0);
    for (const [path, file] of Object.entries(project.files))
      if (
        file.kind === "binary" ||
        (file.kind === "text" &&
          (file.size > 256 * 1024 || textTotal > 2 * 1024 * 1024) &&
          file.size > 0)
      ) {
        const storagePath = `${user.id}/${project.id}/github-${crypto.randomUUID()}/${path}`;
        const { error } = await db.storage
          .from("editor-files")
          .upload(storagePath, fileBytes(file), {
            contentType: file.mime,
            upsert: false,
          });
        if (error)
          throw new GitHubError(
            "GitHub 파일을 에디터에 저장하지 못했습니다. 다시 시도해주세요.",
          );
        file.storagePath = storagePath;
      }
    await sync(user, project, previous, link, true, expected);
  }
  // Keep uploads on uncertain DB outcomes: deleting could break a committed snapshot.
  // Existing retention cleanup can remove genuinely unreferenced objects later.
  return get(user, project.id);
}
function newLink(
  session: GitHubSession,
  repo: GitHubRepository,
  branch: string,
  tree: Awaited<ReturnType<typeof snapshot>>,
): GitHubLink {
  return {
    ...repo,
    githubUserId: session.githubUserId,
    branch,
    baseSha: tree.head,
    files: tree.files,
  };
}
async function linked(
  user: SessionUser,
  session: GitHubSession,
  projectId: string,
) {
  const project = await get(user, projectId),
    stored = await storedLink(user, project);
  if (!stored) throw new GitHubError("먼저 GitHub 저장소를 연결해주세요.");
  if (stored.link.githubUserId !== session.githubUserId)
    throw new GitHubError(
      "이 프로젝트를 연결한 GitHub 계정으로 다시 연결해주세요.",
      403,
    );
  const repo = await repository(
    session,
    stored.link.installationId,
    stored.link.id,
  );
  const tree = await snapshot(session, repo, stored.link.branch);
  return { project, stored, repo, tree };
}
export async function githubAction(
  user: SessionUser,
  session: GitHubSession,
  action: string,
  body: unknown,
) {
  if (action === "repositories") return repositories(session);
  if (action === "branches") {
    const input = selection.omit({ branch: true }).parse(body),
      repo = await repository(
        session,
        input.installationId,
        input.repositoryId,
      );
    const branches: { name: string }[] = [];
    for (let page = 1; page <= 10; page++) {
      const data = await github(
        session.token,
        `${repoPath(repo)}/branches?per_page=100&page=${page}`,
      );
      branches.push(...data.map((b: { name: string }) => ({ name: b.name })));
      if (data.length < 100) return branches;
    }
    throw new GitHubError(
      "브랜치가 너무 많아 목록을 모두 가져오지 못했습니다.",
    );
  }
  if (action === "status") {
    const input = projectInput.partial().parse(body);
    if (!input.projectId) return {};
    const project = await get(user, input.projectId),
      stored = await storedLink(user, project);
    if (!stored) return {};
    const { repo, tree } = await linked(user, session, project.id);
    const hashes = localHashes(await cloudBytes(project)),
      diff = changes(stored.link.files, hashes);
    const { files: _files, ...link } = stored.link;
    void _files;
    return {
      link: { ...link, canPush: repo.canPush },
      changes: diff,
      remoteAhead: tree.head !== link.baseSha,
      canPull: !diff.length || !changes(tree.files, hashes).length,
      revision: project.revision,
      version: stored.version,
      head: tree.head,
      ignoredCount: tree.ignoredCount,
    } satisfies Partial<GitHubStatus>;
  }
  if (action === "import" || action === "link") {
    const input = selection
      .extend({
        projectId: z.string().uuid().optional(),
        revision: z.number().int().min(0).optional(),
      })
      .parse(body);
    const project =
      action === "link"
        ? await get(user, projectInput.parse(input).projectId)
        : createProject("blank", "GitHub 프로젝트");
    if (
      action === "link" &&
      (project.revision !== input.revision || (await storedLink(user, project)))
    )
      throw new GitHubError(
        "프로젝트가 변경되었거나 이미 연결되어 있습니다. 다시 확인해주세요.",
        409,
      );
    const repo = await repository(
      session,
      input.installationId,
      input.repositoryId,
    );
    branchPath(input.branch);
    const tree = await snapshot(session, repo, input.branch),
      link = newLink(session, repo, input.branch, tree);
    if (action === "link") {
      localHashes(await cloudBytes(project));
      await sync(user, project, null, link);
      return { project: await get(user, project.id) };
    }
    project.title = repo.name.slice(0, 100);
    project.files = await downloadFiles(session, repo, tree);
    return { project: await saveDownloaded(user, project, null, link, -1) };
  }
  if (action === "unlink") {
    const input = projectInput
        .extend({
          version: z.string().uuid(),
          revision: z.number().int().min(0),
        })
        .parse(body),
      project = await get(user, input.projectId);
    if (project.revision !== input.revision)
      throw new GitHubError(
        "프로젝트가 변경되었습니다. 다시 확인해주세요.",
        409,
      );
    await sync(user, project, input.version, null);
    return { ok: true };
  }
  if (action === "pull" || action === "push") {
    const input = reviewed
      .extend({ message: z.string().trim().min(1).max(500).optional() })
      .parse(body);
    const { project, stored, repo, tree } = await linked(
      user,
      session,
      input.projectId,
    );
    if (
      project.revision !== input.revision ||
      stored.version !== input.version ||
      tree.head !== input.head
    )
      throw new GitHubError(
        "검토 후 변경사항이 생겼습니다. 목록을 새로 확인해주세요.",
        409,
      );
    const files = await cloudBytes(project),
      hashes = localHashes(files);
    if (action === "push") {
      if (!input.message) throw new GitHubError("커밋 메시지를 입력해주세요.");
      const link = await pushFiles(
        session,
        repo,
        stored.link,
        tree,
        files,
        input.message,
      );
      await sync(user, project, stored.version, link);
      return { project: await get(user, project.id), commit: link.baseSha };
    }
    if (
      changes(stored.link.files, hashes).length &&
      changes(tree.files, hashes).length
    )
      throw new GitHubError(
        "에디터에도 수정한 파일이 있습니다. ZIP으로 보관하거나 새 프로젝트로 가져와 비교해주세요.",
        409,
      );
    if (tree.head === stored.link.baseSha)
      throw new GitHubError("이미 최신 상태입니다.");
    project.files = await downloadFiles(session, repo, tree);
    return {
      project: await saveDownloaded(
        user,
        project,
        stored.version,
        newLink(session, repo, stored.link.branch, tree),
      ),
    };
  }
  throw new GitHubError("지원하지 않는 GitHub 요청입니다.");
}
