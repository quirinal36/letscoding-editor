import type { Checkpoint, CheckpointDetail, Project } from "./types";
import { validateFiles, assertStorageLimit } from "./vfs";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("letscoding-editor", 2);
    req.onupgradeneeded = () => {
      for (const name of ["projects", "snapshots"])
        if (!req.result.objectStoreNames.contains(name))
          req.result.createObjectStore(name, { keyPath: "id" });
    };
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

type LocalSnapshot = CheckpointDetail & { projectId: string };
function snapshots<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  return database().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction("snapshots", mode);
        let result: T;
        run(tx.objectStore("snapshots"), (value) => (result = value));
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(new Error("체크포인트를 브라우저에 저장하지 못했습니다."));
        };
      }),
  );
}
const summary = ({ id, revision, kind, note, createdAt }: LocalSnapshot) => ({
  id,
  revision,
  kind,
  note,
  createdAt,
});
/** Demo counterpart of editor_create_snapshot: same revision and kind returns the existing one. */
export async function localCreateSnapshot(
  project: Project,
  kind: Checkpoint["kind"],
  note?: string,
): Promise<Checkpoint> {
  const clean = note?.trim() || undefined;
  if (clean && clean.length > 200)
    throw new Error("한 줄 회고는 200자 이내로 적어주세요.");
  return snapshots("readwrite", (store, done) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const existing = (req.result as LocalSnapshot[]).find(
        (s) =>
          s.projectId === project.id &&
          s.revision === project.revision &&
          s.kind === kind,
      );
      if (existing) {
        if (clean && !existing.note) {
          existing.note = clean;
          store.put(existing);
        }
        done(summary(existing));
        return;
      }
      const created: LocalSnapshot = {
        id: crypto.randomUUID(),
        projectId: project.id,
        revision: project.revision,
        kind,
        note: clean,
        createdAt: new Date().toISOString(),
        files: structuredClone(project.files),
      };
      store.put(created);
      done(summary(created));
    };
  });
}
export async function localListSnapshots(
  projectId: string,
): Promise<Checkpoint[]> {
  return snapshots("readonly", (store, done) => {
    const req = store.getAll();
    req.onsuccess = () =>
      done(
        (req.result as LocalSnapshot[])
          .filter((s) => s.projectId === projectId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(summary),
      );
  });
}
export async function localGetSnapshot(
  projectId: string,
  id: string,
): Promise<CheckpointDetail> {
  const found = await snapshots<LocalSnapshot | undefined>(
    "readonly",
    (store, done) => {
      const req = store.get(id);
      req.onsuccess = () => done(req.result as LocalSnapshot | undefined);
    },
  );
  if (!found || found.projectId !== projectId)
    throw new Error("체크포인트를 찾을 수 없습니다.");
  return { ...summary(found), files: found.files };
}
