import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLoungeHandler } from "@/lib/editor-integration/handler";
import { createLoungeServices } from "@/lib/editor-integration/services";
import { deployUploadedFile } from "@/app/api/projects/deploy/route";
import { publicPlayUrl } from "@/lib/play-launch";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: NextRequest) {
  const secret = process.env.EDITOR_INTERNAL_API_SECRET;
  if (!secret)
    return Response.json(
      { error: "editor integration disabled" },
      { status: 503 },
    );
  const db = createAdminClient();
  const services = createLoungeServices(db, async (input) => {
    const response = await deployUploadedFile(
      request,
      input.projectId,
      input.file,
      input.userId,
      { userId: input.userId, form: input.form, thumbnail: input.thumbnail },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "배포 실패");
    const resultUrl = publicPlayUrl(result.deployUrl, input.projectId);
    if (
      !resultUrl ||
      new URL(resultUrl, "https://lounge.invalid").hostname !==
        "play.letscoding.kr"
    )
      throw new Error("Play 오리진 설정 확인 필요");
    return { resultUrl, policyVersion: "lounge-static-v1" };
  });
  return createLoungeHandler(services, secret)(request);
}
