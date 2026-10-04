import { appConfig } from "@/lib/server/config";
export async function GET() {
  const models = appConfig().models;
  if (!models.length) return Response.json([]);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("metadata");
    const result = await response.json();
    return Response.json(
      models.map((model) => {
        const metadata = result.data?.find(
            (m: { id: string }) => m.id === model.id,
          ),
          input = Number(metadata?.pricing?.prompt),
          output = Number(metadata?.pricing?.completion);
        return {
          ...model,
          inputPrice: Number.isFinite(input) ? input * 1e6 : null,
          outputPrice: Number.isFinite(output) ? output * 1e6 : null,
        };
      }),
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch {
    return Response.json(
      models.map((m) => ({ ...m, inputPrice: null, outputPrice: null })),
    );
  }
}
