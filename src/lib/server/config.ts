import type { AppConfig } from "../types";
export function positive(name: string) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : 0;
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
  };
}
