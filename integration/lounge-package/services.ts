/** Port together with lounge-handler.ts and lounge-integration.sql.
 * The only injected operation is the lounge's existing lease/rollback deploy core,
 * extracted from deployUploadedFile with an explicitly verified server principal.
 * Never call its cookie-authenticated HTTP endpoint with a fabricated cookie.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LoungeServices } from "./handler";
type CompleteInput = Parameters<LoungeServices["complete"]>[0];
type PrepareInput = Parameters<LoungeServices["prepare"]>[0];
export type TrustedDeploy = (input: {
  userId: string;
  projectId: string;
  file: File;
  form: PrepareInput["form"];
  thumbnail?: File;
}) => Promise<{ resultUrl: string; policyVersion: string }>;
export function createLoungeServices(
  db: SupabaseClient,
  deployCore: TrustedDeploy,
): LoungeServices {
  const editorDb = db.schema("editor"),
    loungeDb = db.schema("public");
  return {
    async claimNonce(nonce, expiresAt) {
      const { error } = await editorDb
        .from("editor_lounge_nonces")
        .insert({ nonce, expires_at: expiresAt });
      if (error && error.code !== "23505")
        throw new Error("nonce persistence unavailable");
      return !error;
    },
    async authorize(userId, editorProjectId, loungeProjectId) {
      const [profile, editor, work] = await Promise.all([
        loungeDb.from("profiles").select("role").eq("id", userId).maybeSingle(),
        editorDb
          .from("editor_projects")
          .select("owner_id,deleted_at")
          .eq("id", editorProjectId)
          .maybeSingle(),
        loungeProjectId
          ? loungeDb
              .from("projects")
              .select("user_id")
              .eq("id", loungeProjectId)
              .maybeSingle()
          : Promise.resolve(null),
      ]);
      return (
        !profile.error &&
        !editor.error &&
        ["student", "teacher", "admin"].includes(profile.data?.role) &&
        editor.data?.owner_id === userId &&
        !editor.data?.deleted_at &&
        (!loungeProjectId || (!work?.error && work?.data?.user_id === userId))
      );
    },
    async prepare(input) {
      const { data, error } = await editorDb.rpc(
        "editor_prepare_lounge_upload",
        {
          p_user: input.userId,
          p_editor: input.editorProjectId,
          p_lounge: input.loungeProjectId ?? null,
          p_form: input.form,
          p_sha: input.sha256,
          p_bytes: input.byteSize,
          p_key: input.idempotencyKey,
          p_policy: input.policyVersion,
        },
      );
      if (error || !data)
        throw new Error(
          "배포 준비 실패: 작품 주소 충돌 또는 배포 진행 상태를 확인하세요.",
        );
      if (data.status === "completed")
        return {
          projectId: data.project_id,
          uploadId: data.id,
          uploadUrl: "",
          receipt: data.receipt,
        };
      const { data: signed, error: signError } = await db.storage
        .from("project-upload-staging")
        .createSignedUploadUrl(data.storage_path, { upsert: false });
      if (signError || !signed) throw new Error("ZIP 업로드 URL 생성 실패");
      return {
        projectId: data.project_id,
        uploadId: data.id,
        uploadUrl: signed.signedUrl,
      };
    },
    async complete(input: CompleteInput) {
      const { data: item, error } = await editorDb
        .from("editor_lounge_uploads")
        .select("*")
        .eq("id", input.uploadId)
        .eq("user_id", input.userId)
        .eq("editor_project_id", input.editorProjectId)
        .eq("project_id", input.loungeProjectId)
        .maybeSingle();
      if (error || !item) throw new Error("업로드 소유권 확인 실패");
      if (item.status === "completed") return item.receipt;
      if (
        item.status !== "pending" ||
        Date.parse(item.expires_at) <= Date.now()
      )
        throw new Error("업로드 만료 또는 처리 중");
      const { data: claimed, error: claimError } = await editorDb
        .from("editor_lounge_uploads")
        .update({ status: "processing" })
        .eq("id", item.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (claimError || !claimed)
        throw new Error("배포 처리 잠금을 얻지 못했습니다.");
      try {
        const { data: blob, error: downloadError } = await db.storage
          .from("project-upload-staging")
          .download(item.storage_path);
        if (downloadError || !blob || blob.size !== item.byte_size)
          throw new Error("ZIP 크기 검증 실패");
        const bytes = Buffer.from(await blob.arrayBuffer());
        if (createHash("sha256").update(bytes).digest("hex") !== item.sha256)
          throw new Error("ZIP SHA 검증 실패");
        let thumbnail: File | undefined;
        if (item.form.thumbnailPath) {
          const file = await editorDb
            .from("editor_files")
            .select("storage_path,mime,size_bytes")
            .eq("project_id", input.editorProjectId)
            .eq("path", item.form.thumbnailPath)
            .maybeSingle();
          if (
            file.error ||
            !file.data ||
            !["image/png", "image/jpeg", "image/webp"].includes(
              file.data.mime,
            ) ||
            !file.data.storage_path?.startsWith(
              `${input.userId}/${input.editorProjectId}/`,
            )
          )
            throw new Error("썸네일 소유권/형식 확인 실패");
          const image = await db.storage
            .from("editor-files")
            .download(file.data.storage_path);
          if (
            image.error ||
            !image.data ||
            image.data.size !== file.data.size_bytes
          )
            throw new Error("썸네일 다운로드 실패");
          thumbnail = new File(
            [image.data],
            item.form.thumbnailPath.split("/").at(-1),
            { type: file.data.mime },
          );
        }
        const receipt = await deployCore({
          userId: input.userId,
          projectId: item.project_id,
          file: new File([bytes], "editor.zip", { type: "application/zip" }),
          form: item.form,
          thumbnail,
        });
        const { error: updateError } = await editorDb
          .from("editor_lounge_uploads")
          .update({
            status: "completed",
            receipt,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("status", "processing");
        if (updateError) throw new Error("배포 완료 기록 확인 필요");
        return receipt;
      } catch (error) {
        // Never repeat an uncertain deploy automatically: existing lease/logs may show a commit.
        await editorDb
          .from("editor_lounge_uploads")
          .update({ status: "needs_review" })
          .eq("id", item.id)
          .eq("status", "processing");
        throw error;
      } finally {
        await db.storage
          .from("project-upload-staging")
          .remove([item.storage_path]);
      }
    },
  };
}
