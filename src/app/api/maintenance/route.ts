import { timingSafeEqual } from "node:crypto";
import { admin } from "@/lib/server/repository";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "",
    actual = request.headers.get("authorization") ?? "",
    expected = `Bearer ${secret}`;
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return Response.json({ error: "인증 필요" }, { status: 401 });
  const db = admin(),
    cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const expired = await db
    .from("editor_projects")
    .select("id,owner_id")
    .lt("deleted_at", cutoff)
    .limit(25);
  if (expired.error)
    return Response.json({ error: "정리 테이블 확인 필요" }, { status: 503 });
  let removed = 0;
  for (const project of expired.data ?? []) {
    const files = await db
        .from("editor_files")
        .select("storage_path")
        .eq("project_id", project.id),
      versions = await db
        .from("editor_file_versions")
        .select("file_data")
        .eq("project_id", project.id);
    if (files.error || versions.error)
      return Response.json(
        { error: "삭제할 파일 목록 조회 실패" },
        { status: 500 },
      );
    const paths = [
      ...new Set([
        ...files.data.flatMap((f) => (f.storage_path ? [f.storage_path] : [])),
        ...versions.data.flatMap((v) =>
          v.file_data.storage_path ? [v.file_data.storage_path] : [],
        ),
      ]),
    ];
    if (paths.length) {
      const result = await db.storage.from("editor-files").remove(paths);
      if (result.error)
        return Response.json({ error: "원본 파일 삭제 실패" }, { status: 500 });
    }
    const attachments = await db.storage
      .from("editor-attachments")
      .list(`${project.owner_id}/${project.id}`, { limit: 1000 });
    if (attachments.error)
      return Response.json({ error: "첨부 목록 조회 실패" }, { status: 500 });
    for (const folder of attachments.data ?? []) {
      const items = await db.storage
        .from("editor-attachments")
        .list(`${project.owner_id}/${project.id}/${folder.name}`, {
          limit: 1000,
        });
      if (items.error)
        return Response.json({ error: "첨부 조회 실패" }, { status: 500 });
      const paths = items.data.map(
        (f) => `${project.owner_id}/${project.id}/${folder.name}/${f.name}`,
      );
      if (paths.length) {
        const result = await db.storage
          .from("editor-attachments")
          .remove(paths);
        if (result.error)
          return Response.json({ error: "첨부 삭제 실패" }, { status: 500 });
      }
    }
    const deleted = await db
      .from("editor_projects")
      .delete()
      .eq("id", project.id)
      .lt("deleted_at", cutoff);
    if (deleted.error)
      return Response.json({ error: "프로젝트 정리 실패" }, { status: 500 });
    removed++;
  }
  // Binary versions still reference immutable objects; orphan-object cleanup requires
  // a reference scan and is documented separately, never a blanket bucket deletion.
  const versions = await db
    .from("editor_file_versions")
    .delete()
    .lt("created_at", cutoff);
  if (versions.error)
    return Response.json({ error: "버전 정리 실패" }, { status: 500 });
  const candidates = await db.rpc("editor_cleanup_candidates", {
    p_cutoff: cutoff,
    p_limit: 100,
  });
  if (candidates.error)
    return Response.json(
      { error: "Storage 정리 계약 확인 필요" },
      { status: 500 },
    );
  let objectsRemoved = 0;
  for (const bucket of ["editor-files", "editor-attachments"]) {
    const names = (candidates.data ?? [])
      .filter(
        (o: { bucket_id: string; name: string }) => o.bucket_id === bucket,
      )
      .map((o: { name: string }) => o.name);
    if (names.length) {
      const result = await db.storage.from(bucket).remove(names);
      if (result.error)
        return Response.json({ error: "Storage 정리 실패" }, { status: 500 });
      objectsRemoved += names.length;
    }
  }
  return Response.json({ removed, objectsRemoved });
}
