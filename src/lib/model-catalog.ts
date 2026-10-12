/** Reviewed candidates, 2026-10-12. Configuration and live ZDR metadata still gate use. */
export const MODEL_CATALOG = [
  {
    id: "openai/gpt-6.1-sol",
    label: "GPT-6.1 Sol",
    provider: "OpenAI",
    vision: true,
  },
  {
    id: "openai/gpt-6-luna",
    label: "GPT-6 Luna",
    provider: "OpenAI",
    vision: true,
  },
  {
    id: "anthropic/claude-sonnet-5.5",
    label: "Claude Sonnet 5.5",
    provider: "Anthropic",
    vision: true,
  },
  {
    id: "anthropic/claude-haiku-5.5",
    label: "Claude Haiku 5.5",
    provider: "Anthropic",
    vision: true,
  },
  { id: "x-ai/grok-4.7", label: "Grok 4.7", provider: "xAI", vision: true },
  {
    id: "google/gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    provider: "Google",
    vision: true,
  },
  {
    id: "google/gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    provider: "Google",
    vision: true,
  },
  {
    id: "qwen/qwen3.8-27b",
    label: "Qwen3.8 27B",
    provider: "Qwen",
    vision: true,
  },
  {
    id: "deepseek/deepseek-v4.1-flash",
    label: "DeepSeek V4.1 Flash",
    provider: "DeepSeek",
    vision: true,
  },
];
