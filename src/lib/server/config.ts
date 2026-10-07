import type { AppConfig } from "../types";
export function positive(name: string) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : 0;
}
export const AUTOSAVE_DEFAULT_MS = 60_000;
/** Autosave interval: 60 seconds unless EDITOR_AUTOSAVE_MS sets 1 second to 10 minutes. */
export function autosaveMs() {
  const raw = process.env.EDITOR_AUTOSAVE_MS?.trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value)) return AUTOSAVE_DEFAULT_MS;
  return Math.min(Math.max(Math.round(value), 1000), 600_000);
}
export function appConfig(): AppConfig {
  const cloud = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const demo =
    process.env.NODE_ENV !== "production" &&
    (process.env.EDITOR_DEMO_MODE === "true" ||
      (!cloud && process.env.EDITOR_DEMO_MODE !== "false"));
  const models = [
    ["CODE", "코딩", false, false],
    ["AUX", "가벼운 대화", false, false],
    ["VISION", "이미지 이해", true, false],
    ["IMAGE", "이미지 생성", false, true],
  ].flatMap(([key, label, vision, image]) => {
    const id = process.env[`OPENROUTER_MODEL_${key}`];
    return id
      ? [
          {
            id,
            label: String(label),
            vision: Boolean(vision),
            image: Boolean(image),
          },
        ]
      : [];
  });
  const budget =
    positive("EDITOR_AI_DAILY_LIMIT_USD") &&
    positive("EDITOR_AI_MONTHLY_LIMIT_USD") &&
    positive("EDITOR_AI_MAX_TURN_USD");
  return {
    demo,
    cloud,
    ai:
      cloud &&
      !!budget &&
      process.env.EDITOR_AI_ENABLED === "true" &&
      !!process.env.OPENROUTER_API_KEY &&
      models.some((m) => !m.image),
    image:
      cloud &&
      !!budget &&
      process.env.EDITOR_AI_ENABLED === "true" &&
      process.env.EDITOR_IMAGE_ENABLED === "true" &&
      !!process.env.OPENROUTER_API_KEY &&
      models.some((m) => m.image),
    deploy:
      cloud &&
      process.env.EDITOR_DEPLOY_ENABLED === "true" &&
      !!process.env.LOUNGE_INTERNAL_API_URL &&
      !!process.env.LOUNGE_INTERNAL_API_SECRET,
    models,
    autosaveMs: autosaveMs(),
  };
}

/** Reserve a conservative estimate, bounded by the configured per-turn ceiling. */
export function turnReservation(estimate: number, ceiling: number) {
  const amount = Math.max(estimate, 0.000001);
  if (
    !Number.isFinite(estimate) ||
    estimate < 0 ||
    !Number.isFinite(ceiling) ||
    ceiling <= 0 ||
    amount > ceiling
  )
    throw new Error(
      "현재 모델과 문맥이 요청당 예산을 초과합니다. 대화를 새로 시작하거나 모델을 변경해주세요.",
    );
  return amount;
}
