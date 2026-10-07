import type { Project } from "./types";

// ponytail: keywords catch direct requests; the model also checks meaning before tools.
export function requestRefusal(text: string): string | null {
  const normalized = text.normalize("NFKC").toLowerCase();
  if (
    /(사행성|도박|카지노|베팅|불법\s*토토|슬롯\s*(머신|게임)|정치|정당|선거|대통령|국회의원|종교|기독교|불교|이슬람|전도|포교|외설|음란|포르노|성인물|야동|누드|\b(?:gambling|casino|betting|porn|political|religious)\b)/i.test(
      normalized,
    )
  )
    return "사행성·정치·종교·외설적 콘텐츠를 만드는 작업은 지원하지 않습니다. 파일은 변경하지 않았습니다. 다른 주제의 게임이나 웹사이트를 요청해주세요.";
  return null;
}

export function replaceExact(
  project: Project,
  edits: { path: string; before: string; after: string }[],
) {
  const files = new Map<string, string>();
  for (const { path, before, after } of edits) {
    const original = files.get(path) ?? project.files[path]?.content;
    if (project.files[path]?.kind !== "text" || original === undefined)
      throw new Error("부분 수정할 텍스트 파일이 없습니다.");
    const offset = original.indexOf(before);
    if (!before || offset < 0 || original.indexOf(before, offset + 1) >= 0)
      throw new Error(
        "수정할 원문이 정확히 한 번 나타나야 합니다. 파일을 읽고 고유한 원문을 지정해주세요.",
      );
    files.set(
      path,
      original.slice(0, offset) +
        after +
        original.slice(offset + before.length),
    );
  }
  return [...files].map(([path, content]) => ({ path, content }));
}

export function rewriteNeedsReview(
  project: Project,
  path: string,
  request: string,
  partial = false,
) {
  const original = project.files[path];
  const blank =
    !project.files["script.js"]?.content &&
    !project.files["style.css"]?.content &&
    /<body>\s*<script src="script.js"><\/script>\s*<\/body>/.test(
      project.files["index.html"]?.content ?? "",
    );
  const explicit =
    /(초기화|처음부터|전체.{0,15}(교체|다시|새로)|다시\s*만들|새로\s*만들)/.test(
      request,
    ) && !/((초기화|교체|새로|처음부터|다시).{0,15}(말|않|금지))/.test(request);
  return (
    !partial &&
    !blank &&
    original?.kind === "text" &&
    !!original.content.trim() &&
    !/\.md$/i.test(path) &&
    !explicit
  );
}
