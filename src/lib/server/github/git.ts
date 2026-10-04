import { createHash } from "node:crypto";
import type { Project } from "../../types";
import type { GitHubChange, GitHubLink, GitHubRepository } from "../../github";
import { assertPath, LIMITS, textFile } from "../../vfs";
import { binaryBytes, mimeFor, validateArtifact } from "../../artifact";
import { branchPath, github, GitHubError, repoPath } from "./api";
import type { GitHubSession } from "./session";

const extensions = new Set(
  "html htm css js mjs json md txt png jpg jpeg gif svg webp ico mp3 wav ogg mp4 woff woff2 ttf gltf glb bin".split(
    " ",
  ),
);
export function managedPath(path: string) {
  try {
    assertPath(path);
  } catch {
    return false;
  }
  return (
    !path.split("/").some((p) => p.startsWith(".")) &&
    extensions.has(path.split(".").at(-1)?.toLowerCase() ?? "")
  );
}
export function blobSha(bytes: Uint8Array) {
  return createHash("sha1")
    .update(`blob ${bytes.byteLength}\0`)
    .update(bytes)
    .digest("hex");
}
export function fileBytes(file: Project["files"][string]) {
  return file.kind === "text"
    ? Buffer.from(file.content, "utf8")
    : Buffer.from(binaryBytes(file.content));
}
export function localHashes(files: Project["files"]) {
  validateArtifact(files);
  return Object.fromEntries(
    Object.entries(files)
      .filter(([, f]) => f.kind !== "directory")
      .map(([path, file]) => {
        if (!managedPath(path))
          throw new GitHubError(
            `${path}: GitHub 연동에서 다루지 않는 파일입니다. ZIP으로 보관한 뒤 제외해주세요.`,
          );
        return [path, blobSha(fileBytes(file))];
      }),
  );
}
export function changes(
  base: Record<string, { sha: string }>,
  hashes: Record<string, string>,
): GitHubChange[] {
  return [...new Set([...Object.keys(base), ...Object.keys(hashes)])]
    .sort()
    .flatMap((path) =>
      base[path]?.sha === hashes[path]
        ? []
        : [
            {
              path,
              kind: !base[path]
                ? "added"
                : !hashes[path]
                  ? "deleted"
                  : "modified",
            } as GitHubChange,
          ],
    );
}
export type TreeEntry = {
  path: string;
  type: string;
  mode: string;
  sha: string;
  size?: number;
};
export type Snapshot = {
  head: string;
  treeSha: string;
  entries: TreeEntry[];
  files: GitHubLink["files"];
  ignoredCount: number;
};
export async function snapshot(
  session: GitHubSession,
  repo: GitHubRepository,
  branch: string,
): Promise<Snapshot> {
  const path = repoPath(repo);
  const ref = await github(
    session.token,
    `${path}/git/ref/heads/${branchPath(branch)}`,
  );
  if (ref.object.type !== "commit")
    throw new GitHubError("커밋이 있는 브랜치를 선택해주세요.");
  const commit = await github(
    session.token,
    `${path}/git/commits/${ref.object.sha}`,
  );
  const tree = await github(
    session.token,
    `${path}/git/trees/${commit.tree.sha}?recursive=1`,
  );
  if (tree.truncated || tree.tree.length > 1500)
    throw new GitHubError(
      "저장소가 너무 큽니다. 정적 웹 프로젝트만 담긴 저장소를 선택해주세요.",
    );
  const entries: TreeEntry[] = [];
  let ignoredCount = 0,
    total = 0;
  for (const entry of tree.tree as TreeEntry[]) {
    if (entry.type === "tree") continue;
    if (!managedPath(entry.path)) {
      ignoredCount++;
      continue;
    }
    if (entry.type !== "blob" || !["100644", "100755"].includes(entry.mode))
      throw new GitHubError("심볼릭 링크·서브모듈은 가져올 수 없습니다.");
    if (
      !Number.isSafeInteger(entry.size) ||
      entry.size! < 0 ||
      entry.size! > LIMITS.upload
    )
      throw new GitHubError(
        `${entry.path}: 파일 용량 제한(5MB)을 초과했습니다.`,
      );
    total += entry.size!;
    entries.push(entry);
  }
  if (entries.length > LIMITS.files || total > LIMITS.zip)
    throw new GitHubError(
      "GitHub 가져오기는 500개 파일·합계 30MB까지 지원합니다.",
    );
  return {
    head: ref.object.sha,
    treeSha: commit.tree.sha,
    entries,
    files: Object.fromEntries(
      entries.map((e) => [e.path, { sha: e.sha, mode: e.mode }]),
    ),
    ignoredCount,
  };
}
export async function downloadFiles(
  session: GitHubSession,
  repo: GitHubRepository,
  tree: Snapshot,
) {
  const files: Project["files"] = {};
  // Bound provider requests and memory; never execute repository code.
  for (let i = 0; i < tree.entries.length; i += 4)
    await Promise.all(
      tree.entries.slice(i, i + 4).map(async (entry) => {
        const blob = await github(
          session.token,
          `${repoPath(repo)}/git/blobs/${entry.sha}`,
        );
        if (blob.encoding !== "base64" || typeof blob.content !== "string")
          throw new GitHubError("GitHub 파일 응답 형식을 확인해주세요.");
        const bytes = Buffer.from(blob.content, "base64");
        if (
          bytes.length !== entry.size ||
          bytes.length > LIMITS.upload ||
          blobSha(bytes) !== entry.sha
        )
          throw new GitHubError("GitHub 파일 크기·무결성 검증에 실패했습니다.");
        if (
          bytes
            .subarray(0, 80)
            .toString()
            .startsWith("version https://git-lfs.github.com/spec")
        )
          throw new GitHubError(
            "Git LFS 파일은 지원하지 않습니다. 실제 파일을 업로드해주세요.",
          );
        if (/\.(html?|css|m?js|json|md|txt|svg)$/i.test(entry.path)) {
          const content = new TextDecoder("utf-8", { fatal: true }).decode(
            bytes,
          );
          files[entry.path] = textFile(
            content,
            /\.html?$/i.test(entry.path)
              ? "text/html"
              : /\.css$/i.test(entry.path)
                ? "text/css"
                : /\.m?js$/i.test(entry.path)
                  ? "text/javascript"
                  : "text/plain",
          );
        } else
          files[entry.path] = {
            kind: "binary",
            content: `data:${mimeFor(entry.path)};base64,${bytes.toString("base64")}`,
            mime: mimeFor(entry.path),
            size: bytes.length,
          };
      }),
    );
  validateArtifact(files);
  return files;
}
export async function pushFiles(
  session: GitHubSession,
  repo: GitHubRepository,
  link: GitHubLink,
  tree: Snapshot,
  files: Project["files"],
  message: string,
) {
  if (!repo.canPush)
    throw new GitHubError("이 저장소에 코드를 저장할 권한이 없습니다.", 403);
  if (tree.head !== link.baseSha)
    throw new GitHubError(
      "GitHub에 새 변경이 있습니다. 먼저 최신 내용을 확인해주세요.",
      409,
    );
  const hashes = localHashes(files),
    diff = changes(link.files, hashes);
  if (!diff.length) throw new GitHubError("커밋할 변경사항이 없습니다.");
  const updates: {
    path: string;
    mode: string;
    type: "blob";
    sha: string | null;
  }[] = [];
  for (const item of diff) {
    if (item.kind === "deleted")
      updates.push({
        path: item.path,
        mode: link.files[item.path].mode,
        type: "blob",
        sha: null,
      });
    else {
      const blob = await github(
        session.token,
        `${repoPath(repo)}/git/blobs`,
        "POST",
        {
          content: fileBytes(files[item.path]).toString("base64"),
          encoding: "base64",
        },
      );
      if (blob.sha !== hashes[item.path])
        throw new GitHubError("GitHub 업로드 무결성을 확인하지 못했습니다.");
      updates.push({
        path: item.path,
        mode: link.files[item.path]?.mode ?? "100644",
        type: "blob",
        sha: blob.sha,
      });
    }
  }
  // base_tree preserves ignored files; only explicitly managed files are changed.
  const createdTree = await github(
    session.token,
    `${repoPath(repo)}/git/trees`,
    "POST",
    { base_tree: tree.treeSha, tree: updates },
  );
  const commit = await github(
    session.token,
    `${repoPath(repo)}/git/commits`,
    "POST",
    { message, tree: createdTree.sha, parents: [tree.head] },
  );
  await github(
    session.token,
    `${repoPath(repo)}/git/refs/heads/${branchPath(link.branch)}`,
    "PATCH",
    { sha: commit.sha, force: false },
  );
  return {
    ...link,
    ...repo,
    baseSha: commit.sha,
    files: Object.fromEntries(
      Object.entries(hashes).map(([path, sha]) => [
        path,
        { sha, mode: link.files[path]?.mode ?? "100644" },
      ]),
    ),
  };
}
