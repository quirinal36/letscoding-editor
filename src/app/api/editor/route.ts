import * as Sentry from "@sentry/nextjs";
import { logAction } from "@/lib/observability";
import { z } from "zod";
import {
  activeUser,
  aiUsage,
  admin,
  authenticate,
  createSnapshot,
  get,
  getSnapshot,
  list,
  listSnapshots,
  projectInput,
  recordEvent,
  reserve,
  save,
  settle,
  storageUsage,
  uuid,
} from "@/lib/server/repository";
import { generateImageFile } from "@/lib/server/image";
import { chat, chatInput } from "@/lib/server/ai";
import {
  appConfig,
  positive,
  processRecordEnabled,
  turnReservation,
} from "@/lib/server/config";
import { deploy, deployForm, launchDeployment } from "@/lib/server/deploy";
import {
  applyProposal,
  applyProposals,
  assertPath,
  assertStorageLimit,
  LIMITS,
} from "@/lib/vfs";
import { createProject } from "@/lib/templates";
import type { Project, SessionUser } from "@/lib/types";
export const runtime = "nodejs";
export const maxDuration = 300;
const reflection = z.string().trim().max(200).optional();
/** Browser-reported learning events. Code is never accepted, only short metadata. */
const eventInput = z.object({
  projectId: uuid,
  kind: z.enum(["preview_error", "errors_resolved", "large_paste"]),
  revision: z.number().int().min(0),
  payload: z
    .object({
      message: z.string().max(300).optional(),
      path: z.string().max(180).optional(),
      line: z.number().int().min(0).max(1_000_000).optional(),
      count: z.number().int().min(1).max(1000).optional(),
      lines: z.number().int().min(1).max(100_000).optional(),
    })
    .strict(),
});
/** Server-side process events must never fail the request that produced them. */
async function recordQuietly(
  user: SessionUser,
  projectId: string,
  kind: string,
  revision: number,
  payload: Record<string, unknown>,
) {
  if (!processRecordEnabled()) return;
  try {
    await recordEvent(user, projectId, kind, revision, payload);
  } catch {
    logAction(`record-${kind}-failed`, user.id, { projectId });
  }
}
export async function POST(request: Request) {
  let telemetry:
    | { userId: string; action: string; projectId?: string; threadId?: string }
    | undefined;
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return Response.json(
        { error: "JSON 요청이 필요합니다." },
        { status: 415 },
      );
    const user = await authenticate(request);
    activeUser(user);
    const raw = await request.text();
    if (raw.length > 4 * 1024 * 1024)
      return Response.json(
        { error: "요청이 너무 큽니다. 파일은 서명 업로드를 사용하세요." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    const action = z
      .enum([
        "session",
        "list",
        "get",
        "create",
        "save",
        "delete",
        "duplicate",
        "rename-project",
        "upload",
        "attachment-upload",
        "thread",
        "delete-thread",
        "chat",
        "approve",
        "reject",
        "usage",
        "storage",
        "deploy",
        "launch",
        "unlink",
        "image",
        "event",
        "checkpoint",
        "checkpoints",
        "checkpoint-files",
      ])
      .parse(body.action);
    const telemetryId = (value: unknown) =>
      typeof value === "string" && /^[a-f0-9-]{36}$/.test(value)
        ? value
        : undefined;
    telemetry = {
      userId: user.id,
      action,
      projectId: telemetryId(body.projectId ?? body.project?.id),
      threadId: telemetryId(body.threadId),
    };
    logAction(action, user.id, {
      ...body,
      projectId: body.projectId ?? body.project?.id,
    });
    if (action === "session") return Response.json(user);
    if (action === "list") return Response.json(await list(user));
    if (action === "get")
      return Response.json(await get(user, uuid.parse(body.projectId)));
    if (action === "create") {
      const input = z
        .object({
          template: z.enum(["blank", "game", "profile"]),
          title: z.string().trim().min(1).max(100),
        })
        .parse(body);
      const project = createProject(input.template, input.title);
      return Response.json(
        await save(user, project, -1, true, true, { source: "template" }),
      );
    }
    if (action === "save") {
      const input = projectInput.parse(body.project),
        expected = z.number().int().min(0).parse(body.expectedRevision),
        // Only "import" may be claimed by the browser; it is shown to teachers as a hint.
        source = z
          .enum(["student", "import"])
          .default("student")
          .parse(body.source),
        current = await get(user, input.id);
      for (const [path, file] of Object.entries(input.files))
        if (file.kind === "text" && file.storagePath) {
          if (!file.storagePath.startsWith(`${user.id}/${input.id}/`))
            throw new Error("텍스트 업로드 경로가 올바르지 않습니다.");
          const { data, error } = await admin()
            .storage.from("editor-files")
            .download(file.storagePath);
          if (
            error ||
            !data ||
            data.size !== file.size ||
            data.size > LIMITS.upload
          )
            throw new Error(`${path}: 업로드 텍스트 검증 실패`);
          file.content = new TextDecoder("utf-8", { fatal: true }).decode(
            await data.arrayBuffer(),
          );
        }
      const project: Project = {
        ...current,
        title: input.title,
        files: input.files,
        deletedAt: current.deletedAt,
      };
      // Chat and deployment records are server-owned; client snapshots cannot forge approval results.
      await save(user, project, expected, true, false, { source });
      return Response.json(await get(user, project.id));
    }
    if (action === "rename-project") {
      const input = z
        .object({ projectId: uuid, title: z.string().trim().min(1).max(100) })
        .parse(body);
      const project = await get(user, input.projectId);
      project.title = input.title;
      return Response.json(await save(user, project, project.revision, false));
    }
    if (action === "delete") {
      const project = await get(user, uuid.parse(body.projectId));
      if (z.string().parse(body.title) !== project.title)
        throw new Error("프로젝트 이름을 정확하게 입력해주세요.");
      project.deletedAt = new Date().toISOString();
      await save(user, project, project.revision);
      return Response.json({ ok: true });
    }
    if (action === "duplicate") {
      const project = await get(user, uuid.parse(body.projectId));
      const id = crypto.randomUUID(),
        files = { ...project.files };
      for (const [path, file] of Object.entries(files))
        if (file.storagePath) {
          const to = `${user.id}/${id}/${crypto.randomUUID()}`;
          const copy = await admin()
            .storage.from("editor-files")
            .copy(file.storagePath, to);
          if (copy.error) throw new Error("파일 복제에 실패했습니다.");
          files[path] = { ...file, storagePath: to };
        }
      return Response.json(
        await save(
          user,
          {
            ...project,
            id,
            title: project.title + " 복사본",
            loungeId: undefined,
            files,
            revision: 0,
            threads: [
              {
                id: crypto.randomUUID(),
                title: "새 대화",
                autoApply: true,
                messages: [],
              },
            ],
            deployments: [],
          },
          -1,
          true,
          true,
          { source: "template" },
        ),
      );
    }
    if (action === "upload") {
      const input = z
        .object({
          projectId: uuid,
          path: z.string(),
          mime: z.string().max(100),
          size: z.number().int().positive().max(LIMITS.upload),
        })
        .parse(body);
      const project = await get(user, input.projectId);
      assertPath(input.path);
      const usage = await storageUsage(user);
      assertStorageLimit(
        usage.usedBytes + input.size - (project.files[input.path]?.size ?? 0),
      );
      const storagePath = `${user.id}/${input.projectId}/${crypto.randomUUID()}`;
      const result = await admin()
        .storage.from("editor-files")
        .createSignedUploadUrl(storagePath);
      if (result.error) throw new Error("업로드 주소를 만들지 못했습니다.");
      return Response.json({
        storagePath,
        token: result.data.token,
        signedUrl: result.data.signedUrl,
      });
    }
    if (action === "attachment-upload") {
      const input = z
        .object({
          projectId: uuid,
          threadId: uuid,
          mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
          size: z.number().int().positive().max(LIMITS.upload),
        })
        .parse(body);
      const project = await get(user, input.projectId);
      if (!project.threads.some((t) => t.id === input.threadId))
        throw new Error("대화를 찾을 수 없습니다.");
      const storagePath = `${user.id}/${project.id}/${input.threadId}/${crypto.randomUUID()}`;
      const result = await admin()
        .storage.from("editor-attachments")
        .createSignedUploadUrl(storagePath);
      if (result.error) throw new Error("첨부 업로드 주소 생성 실패");
      return Response.json({
        storagePath,
        token: result.data.token,
        signedUrl: result.data.signedUrl,
      });
    }
    if (action === "delete-thread") {
      const project = await get(user, uuid.parse(body.projectId));
      const threadId = uuid.parse(body.threadId);
      let next = project;
      if (project.threads.some((thread) => thread.id === threadId)) {
        project.threads = project.threads.filter(
          (thread) => thread.id !== threadId,
        );
        if (!project.threads.length)
          project.threads.push({
            id: crypto.randomUUID(),
            title: "새 대화",
            autoApply: true,
            messages: [],
          });
        next = await save(user, project, project.revision, false);
      }
      // Messages cascade with their thread; retries also clean up after a failed delete.
      const { error } = await admin()
        .from("editor_ai_threads")
        .delete()
        .eq("id", threadId)
        .eq("project_id", project.id)
        .eq("user_id", user.id);
      if (error)
        throw new Error("대화 삭제를 완료하지 못했습니다. 다시 시도해주세요.");
      return Response.json(next);
    }
    if (action === "thread") {
      const project = await get(user, uuid.parse(body.projectId));
      if (body.threadId) {
        const thread = project.threads.find(
          (t) => t.id === uuid.parse(body.threadId),
        );
        if (!thread) throw new Error("대화가 없습니다.");
        thread.autoApply = z.boolean().parse(body.autoApply);
      } else
        project.threads.push({
          id: crypto.randomUUID(),
          title: "새 대화",
          autoApply: true,
          messages: [],
        });
      return Response.json(await save(user, project, project.revision, false));
    }
    if (action === "chat") {
      const input = chatInput.parse(body);
      return await chat(user, await get(user, input.projectId), input, request);
    }
    if (action === "approve" || action === "reject") {
      const project = await get(user, uuid.parse(body.projectId));
      if (body.proposalIds) {
        const ids = z
          .array(uuid)
          .min(1)
          .max(LIMITS.files)
          .refine((ids) => new Set(ids).size === ids.length)
          .parse(body.proposalIds);
        const message = project.threads
          .flatMap((t) => t.messages)
          .find((m) => m.proposals.some((p) => p.id === ids[0]));
        if (
          !message ||
          (action === "approve" &&
            !["complete", "partial"].includes(message.status))
        )
          throw new Error("완료된 작업만 자동 반영할 수 있습니다.");
        const proposals = ids.map((id) => {
          const proposal = message.proposals.find((p) => p.id === id);
          if (!proposal)
            throw new Error("같은 작업의 변경안만 함께 반영할 수 있습니다.");
          return proposal;
        });
        if (body.automatic && proposals.some((p) => p.requiresReview))
          throw new Error("기존 파일 전체 교체는 비교 후 직접 승인해주세요.");
        if (proposals.some((p) => p.status !== "pending"))
          throw new Error("처리할 변경안이 없습니다.");
        if (
          message.proposals.some((p) => p.requiresReview) &&
          message.proposals
            .filter((p) => p.status === "pending")
            .some((p) => !ids.includes(p.id))
        )
          throw new Error(
            "전체 교체 작업은 모든 파일을 함께 승인하거나 무시해주세요.",
          );
        const updated =
          action === "approve" ? applyProposals(project, proposals) : project;
        for (const proposal of proposals)
          proposal.status = action === "approve" ? "applied" : "rejected";
        const saved = await save(
          user,
          updated,
          project.revision,
          action === "approve",
          true,
          { source: "ai", messageId: message.id },
        );
        if (action === "reject")
          await recordQuietly(
            user,
            project.id,
            "proposal_rejected",
            saved.revision,
            {
              messageId: message.id,
              count: proposals.length,
            },
          );
        return Response.json(await get(user, project.id));
      }
      const proposalId = uuid.parse(body.proposalId),
        owner = project.threads
          .flatMap((t) => t.messages)
          .find((m) => m.proposals.some((p) => p.id === proposalId)),
        proposal = owner?.proposals.find((p) => p.id === proposalId);
      if (!owner || !proposal || proposal.status !== "pending")
        throw new Error("처리할 변경안이 없습니다.");
      if (action === "reject") {
        proposal.status = "rejected";
        const saved = await save(user, project, project.revision, false);
        await recordQuietly(
          user,
          project.id,
          "proposal_rejected",
          saved.revision,
          {
            messageId: owner.id,
            count: 1,
          },
        );
        return Response.json(saved);
      }
      if (body.automatic && proposal.requiresReview)
        throw new Error("기존 파일 전체 교체는 비교 후 직접 승인해주세요.");
      const updated = applyProposal(project, proposal);
      proposal.status = "applied";
      await save(user, updated, project.revision, true, true, {
        source: "ai",
        messageId: owner.id,
      });
      return Response.json(await get(user, project.id));
    }
    if (action === "storage") return Response.json(await storageUsage(user));
    if (action === "usage") return Response.json(await aiUsage(user));
    if (action === "launch") {
      return Response.json(
        await launchDeployment(
          user,
          await get(user, uuid.parse(body.projectId)),
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (action === "deploy") {
      const project = await get(user, uuid.parse(body.projectId)),
        form = deployForm.parse(body.form),
        note = reflection.parse(body.note);
      try {
        const result = await deploy(user, project, form);
        const latest = await get(user, project.id);
        latest.loungeId = result.loungeId;
        latest.deployments.push(result.deployment);
        const saved = await save(user, latest, latest.revision, false);
        // The deployed state becomes a durable snapshot; failure here never undoes the deployment.
        if (processRecordEnabled())
          await createSnapshot(user, project.id, "deploy", note).catch(() =>
            logAction("deploy-snapshot-failed", user.id, {
              projectId: project.id,
            }),
          );
        return Response.json(saved);
      } catch (error) {
        const latest = await get(user, project.id);
        latest.deployments.push({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          status: "error",
          sha256: "",
          policyVersion: "editor-static-v1",
          error: error instanceof Error ? error.message : "배포 실패",
        });
        await save(user, latest, latest.revision, false);
        throw error;
      }
    }
    if (action === "unlink") {
      const project = await get(user, uuid.parse(body.projectId));
      project.loungeId = undefined;
      return Response.json(await save(user, project, project.revision, false));
    }
    if (action === "image") {
      const input = z
        .object({ projectId: uuid, prompt: z.string().trim().min(1).max(3000) })
        .parse(body);
      if (!appConfig().image || !positive("EDITOR_AI_IMAGE_OUTPUT_RESERVE_USD"))
        throw new Error("이미지 모델과 출력 예산 검증 후 활성화해주세요.");
      const maxTurn = positive("EDITOR_AI_MAX_TURN_USD");
      if (positive("EDITOR_AI_IMAGE_OUTPUT_RESERVE_USD") > maxTurn)
        throw new Error("이미지 출력 예산이 요청당 한도를 초과했습니다.");
      const reservedUsd = turnReservation(
        positive("EDITOR_AI_IMAGE_OUTPUT_RESERVE_USD"),
        maxTurn,
      );
      const project = await get(user, input.projectId),
        reservation = await reserve(user, reservedUsd);
      let cost = reservedUsd,
        promptTokens = 0,
        completionTokens = 0;
      try {
        const result = await generateImageFile(
          user,
          project.id,
          input.prompt,
          request.signal,
        );
        cost = result.cost;
        promptTokens = result.promptTokens;
        completionTokens = result.completionTokens;
        const latest = await get(user, project.id);
        latest.files[result.path] = result.file;
        await save(user, latest, latest.revision, true, true, {
          source: "ai",
        });
        return Response.json(await get(user, project.id));
      } finally {
        await settle(user, reservation, cost, promptTokens, completionTokens);
      }
    }
    if (action === "event") {
      const input = eventInput.parse(body);
      return Response.json({
        recorded: await recordEvent(
          user,
          input.projectId,
          input.kind,
          input.revision,
          input.payload,
        ),
      });
    }
    if (action === "checkpoint") {
      const input = z.object({ projectId: uuid, note: reflection }).parse(body);
      return Response.json(
        await createSnapshot(user, input.projectId, "checkpoint", input.note),
      );
    }
    if (action === "checkpoints")
      return Response.json(
        await listSnapshots(user, uuid.parse(body.projectId)),
      );
    if (action === "checkpoint-files")
      return Response.json(
        await getSnapshot(
          user,
          uuid.parse(body.projectId),
          uuid.parse(body.checkpointId),
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    throw new Error("지원하지 않는 요청입니다.");
  } catch (error) {
    if (process.env.SENTRY_DSN && telemetry) {
      const context = telemetry;
      Sentry.withScope((scope) => {
        scope.setUser({ id: context.userId });
        scope.setTags({
          action: context.action,
          project_id: context.projectId ?? "unknown",
          thread_id: context.threadId ?? "unknown",
        });
        Sentry.captureException(new Error("Editor operation failed"));
      });
    }
    const message =
      error instanceof z.ZodError
        ? "요청 값이 올바르지 않습니다."
        : error instanceof Error
          ? error.message
          : "요청 처리 실패";
    const status = /로그인|세션/.test(message)
      ? 401
      : /권한|출처|계정/.test(message)
        ? 403
        : /설정|준비|활성화/.test(message)
          ? 503
          : 400;
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
