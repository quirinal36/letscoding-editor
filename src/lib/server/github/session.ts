import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";

export const GITHUB_COOKIE = "editor-github";
export const GITHUB_STATE_COOKIE = "editor-github-state";
export const sessionSchema = z.object({
  kind: z.literal("session"),
  userId: z.string().uuid(),
  githubUserId: z.number().int().positive(),
  login: z.string().max(100),
  token: z.string().min(1).max(1000),
  expires: z.number(),
});
export type GitHubSession = z.infer<typeof sessionSchema>;
export const stateSchema = z.object({
  kind: z.literal("state"),
  userId: z.string().uuid(),
  state: z.string().min(40),
  verifier: z.string().min(40),
  expires: z.number(),
});
export function githubConfig() {
  const key = process.env.GITHUB_COOKIE_KEY ?? "";
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let validOrigin = false;
  try {
    const url = new URL(origin);
    validOrigin =
      url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {}
  const enabled =
    process.env.EDITOR_GITHUB_ENABLED === "true" &&
    /^[a-f0-9]{64}$/i.test(key) &&
    !!process.env.GITHUB_APP_CLIENT_ID &&
    !!process.env.GITHUB_APP_CLIENT_SECRET &&
    /^[a-z0-9-]+$/.test(process.env.GITHUB_APP_SLUG ?? "") &&
    validOrigin;
  return {
    enabled,
    key,
    clientId: process.env.GITHUB_APP_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET ?? "",
    callback: validOrigin
      ? new URL("/api/github/callback", origin).toString()
      : "",
    installUrl: `https://github.com/apps/${process.env.GITHUB_APP_SLUG ?? ""}/installations/new`,
  };
}
export function seal(value: unknown, key = githubConfig().key) {
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error("GitHub 연결 설정이 필요합니다.");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(Buffer.from("editor-github:v1"));
  const bytes = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64url");
}
export function unseal(
  value: string | undefined,
  key = githubConfig().key,
): unknown {
  try {
    if (!value || value.length > 4000 || !/^[a-f0-9]{64}$/i.test(key))
      return null;
    const bytes = Buffer.from(value, "base64url");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key, "hex"),
      bytes.subarray(0, 12),
    );
    cipher.setAAD(Buffer.from("editor-github:v1"));
    cipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        cipher.update(bytes.subarray(28)),
        cipher.final(),
      ]).toString(),
    );
  } catch {
    return null;
  }
}
export function readSession(
  value: string | undefined,
  userId: string,
  key = githubConfig().key,
) {
  const result = sessionSchema.safeParse(unseal(value, key));
  return result.success &&
    result.data.userId === userId &&
    result.data.expires > Date.now()
    ? result.data
    : null;
}
export function newAuthorization(userId: string) {
  const config = githubConfig();
  if (!config.enabled) throw new Error("GitHub App 연결 설정이 필요합니다.");
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callback,
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return {
    url: url.toString(),
    cookie: seal({
      kind: "state",
      userId,
      state,
      verifier,
      expires: Date.now() + 600000,
    }),
  };
}
export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/github",
    maxAge,
  };
}
