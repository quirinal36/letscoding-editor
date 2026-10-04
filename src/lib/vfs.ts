import type { Project, ProjectFile, Proposal } from "./types";
export const LIMITS = {
  files: 500,
  total: 100 * 1024 * 1024,
  upload: 5 * 1024 * 1024,
  text: 256 * 1024,
  zip: 30 * 1024 * 1024,
};
export const textFile = (
  content: string,
  mime = "text/plain",
): ProjectFile => ({
  kind: "text",
  content,
  mime,
  size: new TextEncoder().encode(content).length,
});
export function assertPath(path: string) {
  if (
    !path ||
    path.length > 180 ||
    /[\\\x00-\x1f%?#;:]/.test(path) ||
    path.split("/").some((p) => !p || p === "." || p === ".." || p.trim() !== p)
  )
    throw new Error(
      "안전하지 않은 파일 경로입니다. 상대 경로와 올바른 이름을 사용하세요.",
    );
  if (
    path
      .split("/")
      .some(
        (p) =>
          p.toLowerCase().startsWith(".env") ||
          [".git", "node_modules"].includes(p.toLowerCase()),
      ) ||
    path.split("/").at(-1)?.toLowerCase() === "runtime-config.js"
  )
    throw new Error(
      "라운지에서 금지한 파일입니다: .env*, .git, node_modules, runtime-config.js",
    );
  return path;
}
export function validateFiles(files: Project["files"]) {
  if (Object.keys(files).length > LIMITS.files + 100)
    throw new Error("파일과 폴더 수가 한도를 초과했습니다.");
  let count = 0,
    total = 0;
  for (const [path, file] of Object.entries(files)) {
    assertPath(path);
    const parts = path.split("/");
    while (parts.pop() && parts.length)
      if (files[parts.join("/")] && files[parts.join("/")].kind !== "directory")
        throw new Error("파일 안에 다른 파일을 만들 수 없습니다.");
    if (file.kind === "directory") {
      if (file.size !== 0 || file.content)
        throw new Error("폴더에는 파일 내용이 없어야 합니다.");
      continue;
    }
    count++;
    total += file.size;
    if (
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      file.size > LIMITS.upload
    )
      throw new Error(`${path}: 파일 용량이 허용 범위를 벗어났습니다.`);
    if (file.kind === "text" && textFile(file.content).size !== file.size)
      throw new Error(`${path}: 파일 크기가 내용과 일치하지 않습니다.`);
    if (file.kind === "binary" && file.content.startsWith("data:")) {
      const base64 = file.content.split(",")[1] ?? "";
      const actual =
        (base64.length * 3) / 4 -
        (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
      if (
        !/^data:[\w.+/-]+;base64,[A-Za-z0-9+/]*={0,2}$/.test(file.content) ||
        actual !== file.size
      )
        throw new Error(`${path}: 바이너리 크기가 내용과 일치하지 않습니다.`);
    }
  }
  if (count > LIMITS.files || total > LIMITS.total)
    throw new Error("프로젝트 한도는 500개 파일, 전체 100MB입니다.");
  return { count, total };
}
export function moveFile(
  files: Project["files"],
  from: string,
  to: string,
  overwrite = false,
) {
  assertPath(from);
  assertPath(to);
  if (!files[from] && !Object.keys(files).some((p) => p.startsWith(from + "/")))
    throw new Error("이동할 파일을 찾을 수 없습니다.");
  if (from === to) return files;
  if (to.startsWith(from + "/"))
    throw new Error("폴더를 자신의 하위 폴더로 옮길 수 없습니다.");
  const next = { ...files },
    entries = Object.entries(files).filter(
      ([p]) => p === from || p.startsWith(from + "/"),
    );
  const moves = entries.map(
    ([p, f]) => [to + p.slice(from.length), f] as const,
  );
  for (const [p] of moves)
    if (next[p] && !overwrite)
      throw new Error(
        "같은 이름의 파일이 있습니다. 덮어쓰기 확인이 필요합니다.",
      );
  for (const [p] of entries) delete next[p];
  if (overwrite)
    for (const p of Object.keys(next))
      if (p === to || p.startsWith(to + "/")) delete next[p];
  for (const [p, f] of moves) next[p] = f;
  validateFiles(next);
  return next;
}
export function applyProposal(project: Project, proposal: Proposal): Project {
  if (proposal.status !== "pending")
    throw new Error("이미 처리한 변경안입니다.");
  if (proposal.baseRevision !== project.revision)
    throw new Error("파일이 변경되어 제안이 오래되었습니다. 다시 요청하세요.");
  assertPath(proposal.path);
  let files = { ...project.files };
  if (proposal.operation === "rename")
    files = moveFile(files, proposal.path, proposal.target ?? "");
  else if (proposal.operation === "delete") {
    if (
      !files[proposal.path] &&
      !Object.keys(files).some((p) => p.startsWith(proposal.path + "/"))
    )
      throw new Error("삭제할 파일이 없습니다.");
    for (const p of Object.keys(files))
      if (p === proposal.path || p.startsWith(proposal.path + "/"))
        delete files[p];
  } else {
    if (proposal.operation === "create" && files[proposal.path])
      throw new Error("같은 이름이 이미 있습니다.");
    if (proposal.operation === "write" && files[proposal.path]?.kind !== "text")
      throw new Error("편집 가능한 텍스트 파일이 아닙니다.");
    if (proposal.file) {
      if (proposal.operation !== "create" || proposal.file.kind !== "binary")
        throw new Error("이미지 제안 형식이 올바르지 않습니다.");
      files[proposal.path] = proposal.file;
    } else {
      const content = proposal.content ?? "";
      if (textFile(content).size > LIMITS.text)
        throw new Error("AI 편집은 256KB 이하 텍스트만 지원합니다.");
      files[proposal.path] = textFile(content);
    }
  }
  validateFiles(files);
  return {
    ...project,
    files,
    revision: project.revision + 1,
    updatedAt: new Date().toISOString(),
  };
}
export function language(path: string) {
  const ext = path.split(".").at(-1)?.toLowerCase();
  return (
    (
      {
        html: "html",
        htm: "html",
        css: "css",
        js: "javascript",
        mjs: "javascript",
        ts: "typescript",
        json: "json",
        md: "markdown",
      } as Record<string, string>
    )[ext ?? ""] ?? "plaintext"
  );
}
export function resolvePath(base: string, reference: string) {
  if (/^(?:[a-z]+:|\/\/|#|\/)/i.test(reference)) return null;
  const parts = base.split("/").slice(0, -1);
  for (const part of reference.split(/[?#]/)[0].split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}
