import { createClient } from "@supabase/supabase-js";
import type {
  Checkpoint,
  CheckpointDetail,
  Project,
  SaveSource,
} from "./types";
import {
  localCreateSnapshot,
  localGetSnapshot,
  localList,
  localListSnapshots,
  localSave,
} from "./local-store";
let supabase: ReturnType<typeof createClient> | undefined;
export const browserSupabase = () =>
  (supabase ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "pkce" } },
  ));
export async function api(
  action: string,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
) {
  const session = await browserSupabase().auth.getSession();
  const response = await fetch("/api/editor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ action, ...payload }),
    signal: AbortSignal.any([
      ...(signal ? [signal] : []),
      AbortSignal.timeout(action === "chat" ? 270000 : 30000),
    ]),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "서버 요청에 실패했습니다." }));
    throw new Error(error.error ?? "서버 요청에 실패했습니다.");
  }
  return response;
}
export async function listProjects(demo: boolean): Promise<Project[]> {
  return demo ? localList() : (await api("list")).json();
}
async function uploadSigned(
  signedUrl: string,
  blob: Blob,
  signal?: AbortSignal,
  onProgress?: (percent: number) => void,
) {
  const url = new URL(signedUrl);
  if (
    url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin ||
    !url.pathname.startsWith("/storage/v1/object/upload/sign/")
  )
    throw new Error("허용되지 않은 업로드 주소입니다.");
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const cancel = () => request.abort();
    request.open("PUT", url);
    request.timeout = 120000;
    request.setRequestHeader(
      "Content-Type",
      blob.type || "application/octet-stream",
    );
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(
            new Error("파일 업로드에 실패했습니다. 저장을 다시 시도해주세요."),
          );
    request.onerror = request.ontimeout = () =>
      reject(new Error("업로드 연결이 끊겼습니다. 저장을 다시 시도해주세요."));
    request.onabort = () =>
      reject(new DOMException("업로드를 취소했습니다.", "AbortError"));
    request.onloadend = () => signal?.removeEventListener("abort", cancel);
    signal?.addEventListener("abort", cancel, { once: true });
    request.send(blob);
  });
}
export async function saveProject(
  project: Project,
  expectedRevision: number,
  demo: boolean,
  advance = true,
  upload: {
    signal?: AbortSignal;
    onProgress?: (message: string) => void;
    /** Only "import" is meaningful to the server; every other save is the student's own. */
    source?: Extract<SaveSource, "student" | "import">;
  } = {},
): Promise<Project> {
  if (demo) return localSave(project, expectedRevision, advance);
  const files = { ...project.files };
  const storeText =
    Object.values(files).reduce(
      (sum, f) => sum + (f.kind === "text" ? f.size : 0),
      0,
    ) >
    2 * 1024 * 1024;
  for (const [path, file] of Object.entries(files))
    if (
      ((file.kind === "binary" && file.content.startsWith("data:")) ||
        (file.kind === "text" &&
          (storeText || file.size > 256 * 1024) &&
          file.size > 0)) &&
      !file.storagePath
    ) {
      upload.onProgress?.(`${path} 업로드 준비 중…`);
      const { signedUrl, storagePath } = await (
        await api(
          "upload",
          {
            projectId: project.id,
            path,
            mime: file.mime,
            size: file.size,
          },
          upload.signal,
        )
      ).json();
      const blob =
        file.kind === "text"
          ? new Blob([file.content], { type: file.mime })
          : await (await fetch(file.content, { signal: upload.signal })).blob();
      await uploadSigned(signedUrl, blob, upload.signal, (percent) =>
        upload.onProgress?.(`${path} 업로드 ${percent}%`),
      );
      files[path] = { ...file, storagePath };
    }
  upload.signal?.throwIfAborted();
  upload.onProgress?.("");
  const saved = (await (
    await api("save", {
      project: {
        id: project.id,
        title: project.title,
        template: project.template,
        revision: project.revision,
        updatedAt: project.updatedAt,
        files: Object.fromEntries(
          Object.entries(files).map(([path, file]) => [
            path,
            file.storagePath ? { ...file, content: "" } : file,
          ]),
        ),
      },
      expectedRevision,
      source: upload.source ?? "student",
    })
  ).json()) as Project;
  return {
    ...saved,
    files: Object.fromEntries(
      Object.entries(saved.files).map(([path, file]) => [
        path,
        file.storagePath
          ? { ...file, content: files[path]?.content ?? file.content }
          : file,
      ]),
    ),
  };
}
export async function hydrateProject(project: Project): Promise<Project> {
  return { ...project, files: await hydrateFiles(project.files) };
}
/** Signed binary URLs expire, so binaries become data URLs before the preview reads them. */
async function hydrateFiles(source: Project["files"]) {
  const files = { ...source };
  for (const [path, file] of Object.entries(files))
    if (file.kind === "binary" && file.content.startsWith("https:")) {
      const response = await fetch(file.content, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw new Error(
          `${path}: 파일을 읽지 못했습니다. 프로젝트를 다시 열어주세요.`,
        );
      const blob = await response.blob();
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      files[path] = { ...file, content };
    }
  return files;
}

/** Deploy snapshots are made by the server during deployment; only the demo stores them here. */
export async function createCheckpoint(
  project: Project,
  demo: boolean,
  note?: string,
  kind: Checkpoint["kind"] = "checkpoint",
): Promise<Checkpoint> {
  if (demo) return localCreateSnapshot(project, kind, note);
  if (kind !== "checkpoint")
    throw new Error("게시 체크포인트는 배포할 때 서버가 남깁니다.");
  return (await api("checkpoint", { projectId: project.id, note })).json();
}
export async function listCheckpoints(
  projectId: string,
  demo: boolean,
): Promise<Checkpoint[]> {
  if (demo) return localListSnapshots(projectId);
  return (await api("checkpoints", { projectId })).json();
}
export async function openCheckpoint(
  projectId: string,
  checkpointId: string,
  demo: boolean,
): Promise<CheckpointDetail> {
  const detail: CheckpointDetail = demo
    ? await localGetSnapshot(projectId, checkpointId)
    : await (await api("checkpoint-files", { projectId, checkpointId })).json();
  return { ...detail, files: await hydrateFiles(detail.files) };
}

export async function uploadAttachments(
  images: string[],
  projectId: string,
  threadId: string,
  signal?: AbortSignal,
) {
  return Promise.all(
    images.map(async (image) => {
      const blob = await (await fetch(image, { signal })).blob();
      const { storagePath, signedUrl } = await (
        await api(
          "attachment-upload",
          {
            projectId,
            threadId,
            mime: blob.type,
            size: blob.size,
          },
          signal,
        )
      ).json();
      await uploadSigned(signedUrl, blob, signal);
      return storagePath as string;
    }),
  );
}

export async function githubApi(
  action: string,
  payload: Record<string, unknown> = {},
) {
  const session = await browserSupabase().auth.getSession();
  const response = await fetch("/api/github", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response
    .json()
    .catch(() => ({ error: "GitHub 응답을 읽지 못했습니다." }));
  if (!response.ok)
    throw new Error(result.error ?? "GitHub 연결에 실패했습니다.");
  return result;
}
