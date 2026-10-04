import { cookies } from "next/headers";
import { z } from "zod";
import { activeUser, authenticate } from "@/lib/server/repository";
import { github } from "@/lib/server/github/api";
import { GitHubError } from "@/lib/server/github/api";
import { githubAction } from "@/lib/server/github/service";
import {
  cookieOptions,
  GITHUB_COOKIE,
  GITHUB_STATE_COOKIE,
  githubConfig,
  newAuthorization,
  readSession,
} from "@/lib/server/github/session";
export const runtime = "nodejs";
export const maxDuration = 300;
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "JSON 요청이 필요합니다." }, 415);
    const user = await authenticate(request);
    activeUser(user);
    const raw = await request.text();
    if (raw.length > 16000) return json({ error: "요청이 너무 큽니다." }, 413);
    const body = JSON.parse(raw),
      action = z
        .enum([
          "status",
          "connect",
          "disconnect",
          "repositories",
          "branches",
          "import",
          "link",
          "unlink",
          "pull",
          "push",
        ])
        .parse(body.action);
    const config = githubConfig(),
      jar = await cookies();
    if (action === "disconnect") {
      jar.set(GITHUB_COOKIE, "", cookieOptions(0));
      jar.set(GITHUB_STATE_COOKIE, "", cookieOptions(0));
      return json({ ok: true });
    }
    if (!config.enabled) {
      if (action === "status")
        return json({ enabled: false, connected: false });
      throw new GitHubError(
        "GitHub App 연결을 준비 중입니다. 관리자가 설정을 완료하면 사용할 수 있습니다.",
        503,
      );
    }
    if (action === "connect") {
      const result = newAuthorization(user.id);
      jar.set(GITHUB_STATE_COOKIE, result.cookie, cookieOptions(600));
      return json({ url: result.url });
    }
    const session = readSession(jar.get(GITHUB_COOKIE)?.value, user.id);
    if (!session) {
      if (action === "status")
        return json({
          enabled: true,
          connected: false,
          installUrl: config.installUrl,
        });
      throw new GitHubError("본인의 GitHub 계정을 연결해주세요.", 401);
    }
    if (action === "status") {
      const identity = await github(session.token, "/user");
      if (identity.id !== session.githubUserId)
        throw new GitHubError("GitHub 계정을 다시 연결해주세요.", 401);
      return json({
        enabled: true,
        connected: true,
        login: identity.login,
        installUrl: config.installUrl,
        ...(await githubAction(user, session, action, body)),
      });
    }
    return json(await githubAction(user, session, action, body));
  } catch (error) {
    if (error instanceof GitHubError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return json({ error: "요청 값을 확인해주세요." }, 400);
    // Never expose provider payloads, OAuth codes or credentials in logs/responses.
    const message = error instanceof Error ? error.message : "";
    if (/로그인|세션/.test(message))
      return json({ error: "로그인 세션을 확인해주세요." }, 401);
    if (/권한|출처|계정|접근/.test(message))
      return json(
        { error: "이 프로젝트 또는 계정에 접근할 권한이 없습니다." },
        403,
      );
    return json(
      {
        error:
          "GitHub 연동을 완료하지 못했습니다. 새로고침 후 상태를 확인해주세요.",
      },
      500,
    );
  }
}
