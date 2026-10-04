import { loadEnvConfig } from "@next/env";
import { appConfig, positive } from "../src/lib/server/config";
loadEnvConfig(process.cwd());
const config = appConfig();
const groups = {
  "서버 저장": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  "실제 AI": [
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL_CODE",
    "EDITOR_AI_DAILY_LIMIT_USD",
    "EDITOR_AI_MONTHLY_LIMIT_USD",
    "EDITOR_AI_MAX_TURN_USD",
  ],
  "라운지 배포": ["LOUNGE_INTERNAL_API_URL", "LOUNGE_INTERNAL_API_SECRET"],
  "GitHub 연결": [
    "GITHUB_APP_SLUG",
    "GITHUB_APP_CLIENT_ID",
    "GITHUB_APP_CLIENT_SECRET",
    "GITHUB_COOKIE_KEY",
  ],
  "오류 수집": ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_DSN"],
  "정리 작업": ["CRON_SECRET"],
};
console.log("값은 출력하지 않습니다. 연결·결제·DB 변경을 수행하지 않습니다.");
for (const [name, keys] of Object.entries(groups))
  console.log(
    `${name}: ${keys.filter((k) => !process.env[k]).join(", ") || "필수 값 입력됨 (연결 검증 전)"}`,
  );
console.log(
  `개발 데모: ${config.demo}, 실제 AI: ${config.ai}, 이미지 생성: ${config.image}, 배포: ${config.deploy}`,
);
for (const key of [
  "EDITOR_AI_DAILY_LIMIT_USD",
  "EDITOR_AI_MONTHLY_LIMIT_USD",
  "EDITOR_AI_MAX_TURN_USD",
])
  if (process.env[key] && !positive(key))
    console.log(`${key}: 양수 금액이 필요합니다.`);
