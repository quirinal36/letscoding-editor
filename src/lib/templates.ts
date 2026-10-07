import type { Project } from "./types";
import { textFile } from "./vfs";
export const TEMPLATES = [
  {
    id: "blank",
    title: "빈 HTML",
    description: "아이디어를 자유롭게 시작하세요.",
  },
  {
    id: "game",
    title: "클릭 게임",
    description: "HTML · CSS · JS로 첫 게임 만들기",
  },
  {
    id: "profile",
    title: "나의 소개 페이지",
    description: "나만의 이야기와 작품을 담아보세요.",
  },
];
export function createProject(template = "game", title?: string): Project {
  const info = TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0];
  const css = `:root { color-scheme: dark; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #101827; color: #f4f7ff; }\nmain { text-align: center; padding: 40px; }\nh1 { font-size: 44px; letter-spacing: -2px; }\np { color: #b9c7df; line-height: 1.8; }\nbutton { background: #a5f3cf; color: #10251c; border: 0; border-radius: 12px; padding: 16px 28px; font-size: 18px; font-weight: 700; cursor: pointer; }\n#score { font-size: 64px; font-weight: 800; margin: 28px; color: #a5f3cf; }\n`;
  const html = `<!doctype html>\n<html lang="ko">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${info.title}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main>\n    <p>나의 첫 번째 웹 프로젝트</p>\n    <h1>${template === "game" ? "클릭! 나의 첫 게임" : template === "profile" ? "안녕하세요, 저는 코딩하는 학생입니다." : "Hello, world!"}</h1>\n    <p>${template === "game" ? "버튼을 눌러 점수를 올려보세요." : template === "profile" ? "좋아하는 것과 만들고 싶은 작품을 소개합니다." : "여기에 나만의 이야기를 만들어보세요."}</p>\n    ${template === "game" ? '<div id="score">0</div>\n    <button id="click-button">클릭해서 +1</button>' : '<button id="click-button">시작하기</button>'}\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n`;
  const js =
    template === "game"
      ? `let score = 0;\ndocument.querySelector('#click-button').addEventListener('click', () => {\n  score += 1;\n  document.querySelector('#score').textContent = score;\n});\n`
      : `document.querySelector('#click-button').addEventListener('click', () => {\n  console.log('첫 프로젝트에 오신 것을 환영합니다!');\n});\n`;
  return {
    id: crypto.randomUUID(),
    title: title ?? info.title,
    template: info.id,
    revision: 0,
    updatedAt: new Date().toISOString(),
    files: {
      "PROJECT.md": textFile(
        `# ${title ?? info.title}\n\n## 작품 목적\n${template === "game" ? "버튼을 눌러 점수를 올리는 클릭 게임입니다." : template === "profile" ? "나를 소개하는 페이지입니다." : "아직 구현 전인 빈 프로젝트입니다."}\n\n## 파일 역할\n- index.html: 화면 구조\n- style.css: 디자인\n- script.js: 동작\n\n## 실행 방법\n미리보기에서 확인합니다.\n\n## 변경 기록\n- 프로젝트 생성\n`,
        "text/markdown",
      ),
      "index.html": textFile(
        template === "blank"
          ? '<!doctype html>\n<html lang="ko">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>새 프로젝트</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <script src="script.js"></script>\n</body>\n</html>\n'
          : html,
        "text/html",
      ),
      "style.css": textFile(template === "blank" ? "" : css, "text/css"),
      "script.js": textFile(template === "blank" ? "" : js, "text/javascript"),
    },
    threads: [
      {
        id: crypto.randomUUID(),
        title: "새 대화",
        autoApply: true,
        messages: [],
      },
    ],
    deployments: [],
  };
}
