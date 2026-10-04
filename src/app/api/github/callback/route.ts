import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { github, limitedJson } from "@/lib/server/github/api";
import {
  cookieOptions,
  GITHUB_COOKIE,
  GITHUB_STATE_COOKIE,
  githubConfig,
  seal,
  stateSchema,
  unseal,
} from "@/lib/server/github/session";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const config = githubConfig(),
    jar = await cookies();
  const pending = stateSchema.safeParse(
    unseal(jar.get(GITHUB_STATE_COOKIE)?.value),
  );
  jar.set(GITHUB_STATE_COOKIE, "", cookieOptions(0));
  const origin = config.callback
    ? new URL(config.callback).origin
    : new URL(request.url).origin;
  const destination = new URL("/", origin);
  try {
    const url = new URL(request.url),
      code = url.searchParams.get("code");
    if (
      !config.enabled ||
      url.origin !== origin ||
      !pending.success ||
      pending.data.expires <= Date.now() ||
      pending.data.state !== url.searchParams.get("state") ||
      !code ||
      code.length > 500
    )
      throw new Error("Invalid callback");
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callback,
          code_verifier: pending.data.verifier,
        }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    const token = await limitedJson(response, 16000);
    if (
      !response.ok ||
      typeof token.access_token !== "string" ||
      !token.access_token.startsWith("ghu_") ||
      !Number.isFinite(token.expires_in) ||
      token.expires_in <= 0
    )
      throw new Error("Invalid token");
    const user = await github(token.access_token, "/user");
    const ttl = Math.min(28800, token.expires_in);
    jar.set(
      GITHUB_COOKIE,
      seal({
        kind: "session",
        userId: pending.data.userId,
        githubUserId: user.id,
        login: user.login,
        token: token.access_token,
        expires: Date.now() + ttl * 1000,
      }),
      cookieOptions(ttl),
    );
    destination.searchParams.set("github", "connected");
  } catch {
    destination.searchParams.set("github", "error");
  }
  const result = NextResponse.redirect(destination);
  result.headers.set("Cache-Control", "no-store");
  result.headers.set("Referrer-Policy", "no-referrer");
  return result;
}
