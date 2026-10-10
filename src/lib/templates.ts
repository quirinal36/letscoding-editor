import type { Project } from "./types";
import { textFile } from "./vfs";
import { SUPABASE_CLIENT_FILE, supabasePlaceholderFile } from "./supabase-link";
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
  {
    id: "guestbook",
    title: "방명록",
    description: "Supabase DB에 글을 저장하는 첫 데이터 앱",
  },
];
function guestbook(): Project["files"] {
  const html = `<!doctype html>\n<html lang="ko">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>방명록</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main>\n    <h1>방명록</h1>\n    <p id="status">DB 연결을 확인하는 중…</p>\n    <form id="write" hidden>\n      <input id="name" placeholder="이름" maxlength="20" required>\n      <input id="message" placeholder="한마디" maxlength="200" required>\n      <button type="submit">남기기</button>\n    </form>\n    <ul id="list"></ul>\n  </main>\n  <script type="module" src="script.js"></script>\n</body>\n</html>\n`;
  const css = `* { box-sizing: border-box; }\nbody { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; background: #101827; color: #f4f7ff; }\nmain { max-width: 520px; margin: 0 auto; padding: 40px 20px; }\nh1 { letter-spacing: -1px; }\n#status { color: #b9c7df; }\nform { display: grid; gap: 8px; margin: 16px 0; }\ninput { padding: 12px; border-radius: 8px; border: 1px solid #334; background: #1a2338; color: inherit; }\nbutton { background: #a5f3cf; color: #10251c; border: 0; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer; }\nul { list-style: none; padding: 0; display: grid; gap: 8px; }\nli { background: #1a2338; border-radius: 8px; padding: 12px; }\nli b { color: #a5f3cf; }\n`;
  const js = `import { supabase } from "./supabase.js";\n\nconst status = document.querySelector("#status");\nconst form = document.querySelector("#write");\nconst list = document.querySelector("#list");\n\nif (!supabase) {\n  status.textContent = "상단 DB 버튼에서 Supabase를 연결하고 \\"코드에 넣기\\"를 누르세요.";\n} else {\n  form.hidden = false;\n  status.textContent = "";\n  load();\n}\n\nasync function load() {\n  const { data, error } = await supabase\n    .from("guestbook")\n    .select("name, message, created_at")\n    .order("created_at", { ascending: false })\n    .limit(50);\n  if (error) {\n    status.textContent = "불러오기 실패: " + error.message + " (테이블 만들기 SQL을 실행했는지 확인하세요)";\n    return;\n  }\n  list.innerHTML = "";\n  for (const row of data) {\n    const li = document.createElement("li");\n    const name = document.createElement("b");\n    name.textContent = row.name + " ";\n    li.append(name, document.createTextNode(row.message));\n    list.append(li);\n  }\n}\n\nform.addEventListener("submit", async (event) => {\n  event.preventDefault();\n  const name = document.querySelector("#name").value.trim();\n  const message = document.querySelector("#message").value.trim();\n  const { error } = await supabase.from("guestbook").insert({ name, message });\n  if (error) {\n    status.textContent = "저장 실패: " + error.message;\n    return;\n  }\n  form.reset();\n  load();\n});\n`;
  return {
    "index.html": textFile(html, "text/html"),
    "style.css": textFile(css, "text/css"),
    "script.js": textFile(js, "text/javascript"),
    [SUPABASE_CLIENT_FILE]: textFile(
      supabasePlaceholderFile(),
      "text/javascript",
    ),
  };
}
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
        `# ${title ?? info.title}\n\n## 작품 목적\n${template === "game" ? "버튼을 눌러 점수를 올리는 클릭 게임입니다." : template === "profile" ? "나를 소개하는 페이지입니다." : template === "guestbook" ? "Supabase DB에 글을 저장하고 읽는 방명록입니다." : "아직 구현 전인 빈 프로젝트입니다."}\n\n## 파일 역할\n- index.html: 화면 구조\n- style.css: 디자인\n- script.js: 동작\n${info.id === "guestbook" ? "- supabase.js: 학생 Supabase DB 클라이언트\n" : ""}\n## 실행 방법\n미리보기에서 확인합니다.\n\n## 변경 기록\n- 프로젝트 생성\n`,
        "text/markdown",
      ),
      ...(info.id === "guestbook"
        ? guestbook()
        : {
            "index.html": textFile(
              template === "blank"
                ? '<!doctype html>\n<html lang="ko">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>새 프로젝트</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <script src="script.js"></script>\n</body>\n</html>\n'
                : html,
              "text/html",
            ),
            "style.css": textFile(template === "blank" ? "" : css, "text/css"),
            "script.js": textFile(
              template === "blank" ? "" : js,
              "text/javascript",
            ),
          }),
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
