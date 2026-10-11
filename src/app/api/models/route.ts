import { appConfig } from "@/lib/server/config";
import { modelMetadata, zdrModels } from "@/lib/server/models";
export async function GET() {
  const configured = appConfig().models.filter((m) => !m.image);
  let data: Awaited<ReturnType<typeof zdrModels>> = [];
  try {
    if (configured.length) data = await zdrModels();
  } catch {
    /* Fail closed per model. */
  }
  return Response.json(
    configured.map((model) => {
      try {
        const info = modelMetadata(data.find((m) => m.id === model.id));
        return {
          ...model,
          label: info.label,
          vision: model.vision && info.vision,
          available: true,
          inputPrice: info.input * 1e6,
          outputPrice: info.output * 1e6,
        };
      } catch {
        return {
          ...model,
          available: false,
          reason: "ZDR·도구·가격 확인 불가",
          inputPrice: null,
          outputPrice: null,
        };
      }
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
