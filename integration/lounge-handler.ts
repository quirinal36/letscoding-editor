/** Review/port into the lounge repository. Does not run in the editor app.
 * Adapters must reuse lounge creation/lease/validation/cache invalidation services.
 */
import { z } from "zod";
import { verifySignature } from "../src/lib/server/internal-auth";
import { deployForm } from "../src/lib/server/deploy";
const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("prepare"),
    userId: z.string().uuid(),
    editorProjectId: z.string().uuid(),
    loungeProjectId: z.string().uuid().optional(),
    form: deployForm,
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    byteSize: z
      .number()
      .int()
      .positive()
      .max(30 * 1024 * 1024),
    policyVersion: z.string().max(100),
    idempotencyKey: z.string().max(200),
  }),
  z.object({
    action: z.literal("complete"),
    userId: z.string().uuid(),
    editorProjectId: z.string().uuid(),
    uploadId: z.string(),
    loungeProjectId: z.string().uuid(),
  }),
]);
export interface LoungeServices {
  /** Atomic unique nonce insert with timestamp/TTL, shared across instances. */
  claimNonce(nonce: string, expiresAt: string): Promise<boolean>;
  /** Re-check active role and editor project ownership against shared DB. */
  authorize(
    userId: string,
    editorProjectId: string,
    loungeProjectId?: string,
  ): Promise<boolean>;
  /** Idempotently create draft or verify owned work; issue staging upload URL.
   * Same key must resolve to same draft across retries. */
  prepare(
    input: Extract<z.infer<typeof requestSchema>, { action: "prepare" }>,
  ): Promise<{
    projectId: string;
    uploadId: string;
    uploadUrl: string;
    receipt?: { resultUrl: string; policyVersion: string };
  }>;
  /** Verify upload owner, expiry, state and expected SHA; reuse complete pipeline,
   * deployment lease/rollback/cache invalidation; completed retries return receipt. */
  complete(
    input: Extract<z.infer<typeof requestSchema>, { action: "complete" }>,
  ): Promise<{ resultUrl: string; policyVersion: string }>;
}
export function createLoungeHandler(services: LoungeServices, secret: string) {
  return async (request: Request) => {
    const body = await request.text();
    if (body.length > 20000)
      return Response.json({ error: "요청 크기 초과" }, { status: 413 });
    if (!verifySignature(request.headers, body, secret))
      return Response.json({ error: "서명/시각 검증 실패" }, { status: 401 });
    if (
      !(await services.claimNonce(
        request.headers.get("x-editor-nonce")!,
        new Date(Date.now() + 120000).toISOString(),
      ))
    )
      return Response.json({ error: "중복 요청" }, { status: 409 });
    try {
      const input = requestSchema.parse(JSON.parse(body));
      if (
        !(await services.authorize(
          input.userId,
          input.editorProjectId,
          input.loungeProjectId,
        ))
      )
        return Response.json({ error: "배포 권한 없음" }, { status: 403 });
      return Response.json(
        input.action === "prepare"
          ? await services.prepare(input)
          : await services.complete(input),
      );
    } catch {
      return Response.json({ error: "내부 배포 처리 실패" }, { status: 400 });
    }
  };
}
