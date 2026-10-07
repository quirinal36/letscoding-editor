import type { Project } from "./types";
import { validateFiles, assertStorageLimit } from "./vfs";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("letscoding-editor", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("projects", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error(
          "로컬 저장소를 열지 못했습니다. 브라우저 저장 공간을 확인하세요.",
        ),
      );
  });
}
export async function localList(): Promise<Project[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite"),
      store = tx.objectStore("projects"),
      req = store.getAll();
    req.onsuccess = () => {
      const cutoff = Date.now() - 30 * 86400000;
      for (const p of req.result as Project[])
        if (p.deletedAt && Date.parse(p.deletedAt) < cutoff) store.delete(p.id);
      resolve(
        (req.result as Project[])
          .filter((p) => !p.deletedAt)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
    };
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(new Error("프로젝트 목록을 읽지 못했습니다."));
  });
}
export async function localSave(
  project: Project,
  expectedRevision: number,
  advance = true,
): Promise<Project> {
  validateFiles(project.files);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite"),
      store = tx.objectStore("projects");
    let saved: Project;
    let failure: Error | undefined;
    const req = store.getAll();
    req.onsuccess = () => {
      const projects = req.result as Project[];
      const current = projects.find((item) => item.id === project.id);
      if ((current?.revision ?? -1) !== expectedRevision) {
        failure = new Error(
          "다른 탭에서 프로젝트를 저장했습니다. 다시 열어 최신 내용을 확인하세요.",
        );
        tx.abort();
        return;
      }
      if (!project.deletedAt) {
        try {
          const used = projects
            .filter((item) => !item.deletedAt && item.id !== project.id)
            .reduce((sum, item) => sum + validateFiles(item.files).total, 0);
          assertStorageLimit(used + validateFiles(project.files).total);
        } catch (e) {
          failure = e instanceof Error ? e : new Error(String(e));
          tx.abort();
          return;
        }
      }
      saved = {
        ...project,
        revision: advance
          ? expectedRevision + 1
          : Math.max(0, expectedRevision),
        updatedAt: new Date().toISOString(),
      };
      store.put(saved);
    };
    tx.oncomplete = () => {
      db.close();
      resolve(saved);
    };
    tx.onabort = () => {
      db.close();
      reject(
        failure ??
          new Error(
            "프로젝트 저장에 실패했습니다. 저장 공간을 확인하고 다시 시도하세요.",
          ),
      );
    };
    tx.onerror = () => {
      failure = new Error(
        "프로젝트 저장 공간이 부족합니다. ZIP을 내려받아 보관하세요.",
      );
    };
  });
}
