import type { ChatMessage, Project, Proposal } from "./types";
export function demoAnswer(project: Project, prompt: string): ChatMessage {
  const proposals: Proposal[] = [],
    id = crypto.randomUUID();
  if (
    /파란|파랗|blue/i.test(prompt) &&
    project.files["style.css"]?.kind === "text"
  )
    proposals.push({
      id: crypto.randomUUID(),
      operation: "write",
      path: "style.css",
      content:
        project.files["style.css"].content +
        "\n/* AI 변경 제안 */\nbutton { background: #3b82f6; color: #ffffff; }\n",
      baseRevision: project.revision,
      status: "pending",
    });
  return {
    id,
    role: "assistant",
    text: proposals.length
      ? "버튼을 파란색으로 바꾸는 변경안을 준비했어요. 아래에서 비교하고 적용해보세요."
      : "지금은 외부 모델을 사용하지 않는 데모예요. “버튼 색을 파랗게 바꿔줘”로 파일 읽기 → 변경 제안 → 승인 흐름을 확인할 수 있어요.",
    status: "complete",
    proposals,
    tools: [
      { name: "list_files", input: {}, output: Object.keys(project.files) },
      {
        name: "read_file",
        input: { path: "style.css" },
        output: project.files["style.css"]?.content ?? "파일 없음",
      },
    ],
  };
}
