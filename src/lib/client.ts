import { createClient } from "@supabase/supabase-js";
import type { Project } from "./types";
import { localList, localSave } from "./local-store";
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
    signal,
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
export async function saveProject(
  project: Project,
  expectedRevision: number,
  demo: boolean,
  advance = true,
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
      const { token, storagePath } = await (
        await api("upload", {
          projectId: project.id,
          path,
          mime: file.mime,
          size: file.size,
        })
      ).json();
      const blob =
        file.kind === "text"
          ? new Blob([file.content], { type: file.mime })
          : await (await fetch(file.content)).blob();
      const result = await browserSupabase()
        .storage.from("editor-files")
        .uploadToSignedUrl(storagePath, token, blob, {
          contentType: file.mime,
        });
      if (result.error)
        throw new Error("파일 업로드 실패: " + result.error.message);
      files[path] = { ...file, storagePath };
    }
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
    })
  ).json()) as Project;
  return {
    ...saved,
    files: Object.fromEntries(
      Object.entries(saved.files).map(([path, file]) => [
        path,
        file.kind === "binary"
          ? { ...file, content: files[path]?.content ?? file.content }
          : file,
      ]),
    ),
  };
}
export async function hydrateProject(project: Project): Promise<Project> {
  const files = { ...project.files };
  for (const [path, file] of Object.entries(files))
    if (file.kind === "binary" && file.content.startsWith("https:")) {
      const response = await fetch(file.content);
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
  return { ...project, files };
}

export async function uploadAttachments(
  images: string[],
  projectId: string,
  threadId: string,
) {
  return Promise.all(
    images.map(async (image) => {
      const blob = await (await fetch(image)).blob();
      const { storagePath, token } = await (
        await api("attachment-upload", {
          projectId,
          threadId,
          mime: blob.type,
          size: blob.size,
        })
      ).json();
      const result = await browserSupabase()
        .storage.from("editor-attachments")
        .uploadToSignedUrl(storagePath, token, blob, {
          contentType: blob.type,
        });
      if (result.error) throw new Error("첨부 이미지 업로드에 실패했습니다.");
      return storagePath as string;
    }),
  );
}
