/** Known secret patterns only: this is not general personal-data detection. */
export function redactPrompt(text: string) {
  return text
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g,
      "[비밀키 가림]",
    )
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{12,}|xai-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,})\b/g,
      "[키 가림]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[토큰 가림]",
    )
    .replace(
      /(\b[\w-]*(?:authorization|password|passwd|api[_-]?key|service[_-]?role[_-]?key|secret|token)\b["']?\s*[:=]\s*)(?:Bearer\s+)?(?:"[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi,
      "$1[비밀값 가림]",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [토큰 가림]");
}
