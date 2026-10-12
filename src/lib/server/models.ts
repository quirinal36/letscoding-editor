import { z } from "zod";

const price = z
  .union([z.string().trim().min(1), z.number()])
  .transform(Number)
  .pipe(z.number().finite().nonnegative());
const metadata = z.object({
  id: z.string(),
  name: z.string().optional(),
  supported_parameters: z.array(z.string()).refine((p) => p.includes("tools")),
  architecture: z.object({ input_modalities: z.array(z.string()) }),
  expiration_date: z.string().nullable().optional(),
  pricing: z.object({
    prompt: price,
    completion: price,
    request: price.optional(),
    internal_reasoning: price.optional(),
    overrides: z
      .array(z.object({ prompt: price, completion: price }))
      .optional(),
  }),
  top_provider: z.object({
    max_completion_tokens: z.number().int().positive(),
  }),
});
export function modelMetadata(value: unknown) {
  const m = metadata.parse(value);
  if (
    m.expiration_date &&
    (!Number.isFinite(Date.parse(m.expiration_date)) ||
      Date.parse(m.expiration_date) <= Date.now())
  )
    throw new Error("종료된 모델입니다.");
  return {
    label: m.name ?? m.id,
    vision: m.architecture.input_modalities.includes("image"),
    // Reserve the highest published tier; never underestimate a long-context turn.
    input: Math.max(
      m.pricing.prompt,
      ...(m.pricing.overrides ?? []).map((p) => p.prompt),
    ),
    output: Math.max(
      m.pricing.completion,
      m.pricing.internal_reasoning ?? 0,
      ...(m.pricing.overrides ?? []).map((p) => p.completion),
    ),
    request: m.pricing.request ?? 0,
    maxOutputTokens: m.top_provider.max_completion_tokens,
  };
}
export async function zdrModels() {
  const response = await fetch("https://openrouter.ai/api/v1/models?zdr=true", {
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("모델 정보를 확인할 수 없습니다.");
  const data = z
    .object({ data: z.array(z.object({ id: z.string() }).passthrough()) })
    .parse(await response.json());
  return data.data;
}
export async function modelPrices(id: string) {
  try {
    return modelMetadata((await zdrModels()).find((m) => m.id === id));
  } catch {
    throw new Error(
      "선택 모델의 ZDR·도구 지원과 가격을 확인할 수 없습니다. 다른 모델을 선택해주세요.",
    );
  }
}
