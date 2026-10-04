# 렛츠코딩 에디터 — 프로젝트 구현 계획

> 작성일: 2026-10-04
> 상태: 초안 (착수 전 검토용)
> 짝 문서: [02-checklist.md](./02-checklist.md) (체크할 사항), Google Sheets 기능 명세서 (제목: `렛츠코딩 에디터 기능 명세서`)

## 1. 한 줄 요약

브라우저에서 열리는 VS Code 모양의 에디터. 왼쪽은 파일 탐색기, 가운데는 텍스트·이미지 편집기, 오른쪽은 파일을 직접 고칠 수 있는 AI 채팅. 모델은 OpenRouter를 거쳐 호출하고, 결과물은 렛츠코딩 라운지 작품으로 배포한다.

## 2. 왜 만드는가

- 라운지는 완성된 정적 ZIP을 받아서 서빙만 한다. 학생이 코드를 **만드는 자리**는 아직 라운지 밖(로컬 VS Code, Codex 등)에 있다.
- 학원 컴퓨터는 공용이다. 로컬에 저장된 작업물은 자리를 옮기면 사라진다. 서버에 저장되는 작업 공간이 필요하다.
- 현재 라운지는 `@openrouter/ai-sdk-provider`, `ai`(Vercel AI SDK), `@assistant-ui/react`로 메뉴 추천 챗봇을 이미 운영한다. 같은 스택으로 "파일을 고치는 채팅"까지 확장할 수 있다.
- 에이전트 플랫폼(`letscoding-agent-platform`)은 Codex 사용자용 ZIP 검증 MCP다. 이 프로젝트는 반대편, 즉 Codex가 없는 학생이 브라우저만으로 같은 결과에 도달하게 한다.

## 3. 범위

### 1차(MVP) — 정적 웹 작품 하나를 처음부터 배포까지

| 영역 | 포함 |
| --- | --- |
| 셸 | VS Code식 3열 레이아웃, 드래그로 폭 조절, 패널 접기, 다크/라이트 테마 |
| 탐색기(왼쪽) | 폴더 트리, 새 파일·폴더, 이름 변경, 삭제, 드래그 이동, 이미지·ZIP 업로드 |
| 편집기(가운데) | 탭, Monaco 기반 코드 편집(HTML·CSS·JS·TS·JSON·MD), 이미지 뷰어, 저장 상태 표시, 미리보기 탭(iframe) |
| AI 채팅(오른쪽) | 스트리밍 대화, 파일 읽기·쓰기·생성·삭제·검색 도구, 변경 diff 미리보기와 승인, 이미지 첨부 입력, 이미지 생성 출력 |
| 프로젝트 | 서버 저장(Supabase), 자동 저장, 프로젝트 목록·복제·템플릿 |
| 배포 | 정적 ZIP 생성 → 라운지 정책 검증 → 라운지 작품으로 등록/갱신, 배포 결과 링크 |
| 계정 | 라운지와 같은 Supabase Auth로 로그인, 학생·선생님 역할 인식 |

### 1차 비범위

- 서버에서 Node.js 빌드 실행(Vite·Next.js 빌드). 1차는 "브라우저에서 바로 실행되는 HTML/CSS/JS"만 다룬다.
- 터미널, 디버거, 확장 기능 마켓.
- 실시간 공동 편집.
- 모바일 레이아웃(태블릿 가로까지만 보장).

### 2차 이후 후보

- 브라우저 내 번들링(esbuild-wasm 또는 Sandpack)으로 React·TypeScript 작품 지원
- 선생님 모드: 학생 프로젝트 열람·코멘트, 과제와 연결
- 버전 기록(스냅샷)과 되돌리기
- 음성 입력, 화면 캡처 첨부

## 4. 레이아웃 선택: VS Code를 포크하지 않는다

### 결론

**VS Code 저장소를 포크하지 않고, VS Code의 편집기 엔진인 Monaco Editor만 가져와서 React 셸을 직접 만든다.** 이유는 아래와 같다.

| 선택지 | 장점 | 문제 | 판정 |
| --- | --- | --- | --- |
| **VS Code(code-oss) 포크 → 웹 빌드** | 진짜 VS Code, 확장 생태계 | 코드 100만 줄 이상, gulp 빌드 체인, 워크벤치 구조에 맞춰 오른쪽 AI 패널을 끼워 넣어야 함. 마켓플레이스·브랜딩은 MS 전용이라 Open VSX로 갈아야 함. 초등·중등 학생에게 과한 UI | 제외 |
| **code-server / openvscode-server** | 설치만 하면 완전한 VS Code | 사용자마다 Node 백엔드 컨테이너가 필요. Vercel·Supabase 구조와 맞지 않고 운영비가 사용자 수에 비례 | 제외 |
| **Eclipse Theia** | VS Code 호환 IDE 프레임워크 | 역시 백엔드 프로세스 필요, 학습 곡선 큼 | 제외 |
| **Monaco Editor + 자체 React 셸** | VS Code와 같은 편집 경험(단축키, 테마, 자동완성), MIT, 필요한 UI만 만듦. 라운지와 같은 Next.js·Tailwind 스택 | 탐색기·탭·패널은 직접 구현 | **채택** |
| CodeMirror 6 + 자체 셸 | 가볍고 모바일에 강함 | VS Code와 생김새·단축키가 다름. TS 자동완성은 별도 작업 | 2차 모바일 대응 시 재검토 |

### 셸을 구성하는 부품

- **편집기**: `monaco-editor` (`@monaco-editor/react`). TypeScript·JSON 언어 서비스는 Web Worker로 분리해 메인 스레드를 막지 않는다. Next.js에서는 `dynamic(..., { ssr: false })`로 클라이언트 전용 로드.
- **패널 레이아웃**: `react-resizable-panels`(3열 고정이면 충분). VS Code처럼 탭을 떼서 옮기는 도킹이 필요해지면 `dockview`로 교체.
- **파일 트리**: 가상 스크롤 트리 컴포넌트(`react-arborist` 등) 위에 드래그 이동, 인라인 이름 변경, 컨텍스트 메뉴.
- **미리보기**: `iframe` + `srcdoc` 또는 Blob URL. 프로젝트 안의 상대 경로를 Service Worker로 가로채 가상 파일 시스템에서 응답하면 `<img src="images/a.png">`가 그대로 동작한다. 라운지가 `<base href>`를 삽입하는 것과 같은 전제라서, 미리보기에서 되면 배포 후에도 된다.
- **AI 채팅 UI**: `@assistant-ui/react` + `@assistant-ui/react-ai-sdk`. 라운지에서 이미 쓰는 조합이라 메시지 스트리밍·첨부·도구 호출 표시를 다시 만들 필요가 없다.
- **스타일**: Tailwind v4, 라운지 `src/components/ui`와 토큰을 맞춘다. VS Code의 색상 토큰(`--vscode-*`)을 흉내 내는 테마 두 벌(dark/light)만 둔다.

### 웹 앱이라서 다른 점

- **파일 시스템이 없다.** 프로젝트는 Supabase에 저장된 "가상 파일 시스템"이다. 탐색기·편집기·AI 도구·미리보기·ZIP 생성이 전부 같은 VFS 인터페이스(`list/read/write/move/delete`)를 본다.
- **코드 실행은 브라우저 안에서만.** 서버는 파일을 저장하고 모델을 호출할 뿐 사용자의 코드를 실행하지 않는다. 학생 코드가 서버에서 돌지 않으므로 샌드박스 문제가 애초에 없다.
- **긴 작업은 스트리밍.** Vercel 함수 수명 안에서 끝내야 하므로 AI 턴은 작게, 도구 호출은 한 턴에 몇 개로 제한한다.

## 5. 아키텍처

```text
브라우저 (Next.js 클라이언트)
├─ 탐색기 ──┐
├─ Monaco ──┼─ VFS 스토어 (메모리 캐시, 변경 큐, 자동 저장)
├─ 미리보기 ┘      │
└─ AI 채팅 ────────┼─ POST /api/ai/chat  (스트리밍, 도구 호출)
                   │
Next.js 서버 (Vercel, 별도 프로젝트 letscoding-editor)
├─ /api/projects/*          프로젝트·파일 CRUD  → Supabase Postgres + Storage
├─ /api/ai/chat             OpenRouter 호출, 도구 execute가 VFS를 수정
├─ /api/ai/image            이미지 생성 (OpenRouter image 출력 모델)
└─ /api/deploy              ZIP 생성·정책 검증 → 라운지 배포 API 호출
                                                      │
렛츠코딩 라운지 (lounge.letscoding.kr)                 ▼
└─ 작품 등록/갱신 파이프라인 (기존 deploy 검증·lease·캐시 무효화 재사용)
```

### 5.1 데이터 모델 (초안)

| 테이블 | 열 | 비고 |
| --- | --- | --- |
| `editor_projects` | id, owner_id, title, template, lounge_project_id(null 가능), created_at, updated_at | 라운지 `projects.id`와 1:1 연결 |
| `editor_files` | id, project_id, path, kind(text/binary), text_content, storage_path, size_bytes, updated_at | 텍스트는 Postgres 컬럼(수십 KB 이하), 이미지·바이너리는 Storage 버킷 `editor-files` |
| `editor_ai_threads` | id, project_id, user_id, title, created_at | 라운지 `chat_threads`와 구조를 맞춘다 |
| `editor_ai_messages` | id, thread_id, role, parts(jsonb), model, prompt_tokens, completion_tokens, status | 도구 호출 결과·diff도 parts에 기록 |
| `editor_ai_usage_daily` | user_id, date, prompt_tokens, completion_tokens, cost_usd | 하루 예산 집행용 |
| `editor_deployments` | id, project_id, lounge_project_id, zip_sha256, policy_version, status, result_url, created_at | 배포 이력 |

RLS: 모든 테이블은 `owner_id = auth.uid()` 기본. 선생님 열람은 라운지의 `organization_memberships` 범위를 재사용하는 함수로 2차에 추가.

### 5.2 AI 채팅 — "파일을 고칠 권한"의 설계

- 모델 호출은 서버 전용. 키는 `OPENROUTER_API_KEY`, 모델은 `OPENROUTER_MODEL_*` 환경변수. 라운지 `src/lib/openrouter-ai.ts`와 같이 `compatibility: "strict"`, `provider: { data_collection: "deny", zdr: true }`를 강제한다(학생 데이터가 모델 학습에 쓰이지 않게).
- 도구(Vercel AI SDK `tool()`):
  - `list_files(path?)`, `read_file(path)`, `search_in_files(query)` — 읽기, 즉시 실행
  - `write_file(path, content)`, `create_file`, `rename`, `delete_file` — 쓰기. 기본값은 **제안 모드**: 서버는 변경안을 diff로 돌려주고, 사용자가 채팅창에서 "적용"을 눌러야 VFS에 반영된다. 사용자가 "자동 적용"을 켜면 쓰기도 즉시 실행하되, 삭제·이름 변경은 항상 확인.
  - `run_preview_check()` — 미리보기 iframe에서 수집한 콘솔 오류를 모델에게 돌려준다(브라우저가 실행, 서버는 결과만 전달).
- 멀티모달:
  - 입력: 이미지 첨부(PNG/JPG/WebP, 5MB 이하)를 Storage에 올린 뒤 URL을 메시지 part로 전달. 비전 지원 모델만 선택 가능하게 모델 목록을 필터링.
  - 출력: 이미지 생성은 별도 도구 `generate_image(prompt, size)`로 분리. 결과를 프로젝트 `images/` 폴더에 파일로 저장하고 탐색기에 바로 보이게 한다. OpenRouter의 이미지 출력 모델 가용성·과금은 착수 전에 확인한다(체크리스트 C-03).
- 컨텍스트: 시스템 프롬프트에 현재 파일 트리, 열린 파일, 라운지 배포 규칙(index.html 최상위, 상대 경로, .env 금지, 30MB)을 넣는다. 전체 파일 내용은 넣지 않고 모델이 `read_file`로 가져오게 한다.
- 비용 통제: 사용자별 일일 토큰 예산, 초과 시 저가 모델로 자동 전환 또는 중단. 모델 가격은 OpenRouter `/api/v1/models`에서 읽어 사용량 테이블에 USD로 기록.

### 5.3 배포 — 라운지와 연결하는 방법

라운지의 배포 API(`/api/projects/deploy/upload-url` → 서명 URL로 ZIP 업로드 → `/api/projects/deploy/complete`)는 **라운지 호스트 전용 쿠키 세션**을 요구한다. 에디터가 다른 오리진(`editor.letscoding.kr`)에서 돌면 이 쿠키를 보낼 수 없다. 선택지:

| 방식 | 라운지 변경 | 장단점 |
| --- | --- | --- |
| A. 라운지 배포 API가 `Authorization: Bearer <Supabase JWT>`도 받게 확장 | 작음(`createClient` 분기 추가) | 에디터 브라우저가 라운지 API를 직접 호출. 두 앱이 같은 Supabase 프로젝트를 쓰므로 토큰은 그대로 유효. CORS 허용 목록 필요 |
| B. 에디터 서버 → 라운지 내부 API를 HMAC 서명으로 호출 (ADR-025의 Play 방식) | 중간(내부 엔드포인트 신설) | 브라우저가 라운지와 직접 통신하지 않음. 에디터 서버가 사용자 JWT를 검증한 뒤 `user_id`를 서명 요청에 담음. 감사 로그가 한곳에 모임 | 
| C. 에디터를 라운지 모노레포 `apps/editor`로 두고 같은 호스트의 경로(`/editor`)로 마운트 | 없음(쿠키 공유) | 가장 쉬움. 하지만 "다른 디렉터리에서 구현"이라는 전제와 어긋나고 라운지 빌드 비용에 합산됨 |

**권장: B.** Play 오리진 분리에서 이미 검증된 신뢰 경계를 그대로 쓴다. 에디터 서버는 Supabase service-role을 갖되 라운지 테이블은 건드리지 않고, 작품 등록·갱신은 라운지 내부 API 한 곳만 호출한다. A는 B가 늦어질 때의 임시안으로 남긴다.

배포 순서:

1. 에디터 서버가 VFS에서 ZIP을 만든다(최상위에 `index.html`, 슬래시 경로, `.env*`·`node_modules` 제외).
2. 에이전트 플랫폼의 `artifact-validator` 패키지(또는 라운지 `deploy-validation.ts`와 같은 규칙)로 검사: 압축 30MB, 해제 100MB, 500파일, 루트 절대 경로 참조 금지.
3. 처음 배포면 라운지에 작품을 만들고(`title`, `description`, `category`, `slug`, 썸네일), 이후에는 같은 `lounge_project_id`로 갱신한다.
4. 결과 URL(`https://play.letscoding.kr/play/{id}`)과 정책 버전을 `editor_deployments`에 기록하고 채팅·상태바에 표시한다.

## 6. 기술 스택

| 층 | 선택 | 근거 |
| --- | --- | --- |
| 프레임워크 | Next.js(라운지와 같은 메이저), React 19, TypeScript | 라운지 코드·규약 재사용, Vercel 배포 |
| 스타일 | Tailwind v4 | 라운지 동일 |
| 편집기 | monaco-editor, @monaco-editor/react | VS Code와 같은 편집 경험 |
| 레이아웃 | react-resizable-panels | 3열 리사이즈 |
| AI | ai(Vercel AI SDK), @ai-sdk/react, @openrouter/ai-sdk-provider, @assistant-ui/react | 라운지 동일 |
| 데이터 | Supabase(Postgres, Storage, Auth) — 라운지와 **같은 프로젝트** | 로그인·역할 공유 |
| ZIP | jszip(서버) | 라운지 동일 |
| 테스트 | node:test(단위), Playwright(E2E) | 라운지 동일 |
| 배포 | Vercel 별도 프로젝트, 도메인 `editor.letscoding.kr` | 라운지 빌드 비용과 분리 |

## 7. 단계별 일정 (주 단위, 1인 기준)

| 단계 | 기간 | 산출물 | 완료 기준 |
| --- | --- | --- | --- |
| 0. 준비 | 1주 | 저장소, Supabase 스키마·RLS, 로그인, 빈 3열 셸 | 로그인 후 빈 에디터가 뜬다 |
| 1. 편집 | 2주 | 탐색기, Monaco, 이미지 뷰어, 자동 저장, 미리보기 | 새 프로젝트 → HTML 작성 → 미리보기까지 서버 저장으로 왕복 |
| 2. AI 읽기·쓰기 | 2주 | 채팅 스트리밍, 읽기 도구, 제안 모드 쓰기 도구, diff 승인 | "버튼 색을 파랗게 바꿔줘"가 diff → 적용 → 미리보기 반영 |
| 3. 멀티모달 | 1주 | 이미지 첨부 입력, 이미지 생성 도구, 사용량·예산 | 스케치 이미지를 올리면 레이아웃 코드가 나오고, 생성 이미지가 탐색기에 저장된다 |
| 4. 배포 | 2주 | ZIP 생성·검증, 라운지 내부 API(라운지 측 작업 포함), 배포 이력 | 에디터에서 버튼 하나로 `play.letscoding.kr` 링크가 나온다 |
| 5. 안정화 | 1주 | E2E, 접근성, 오류 추적(Sentry), 학생 5명 파일럿 | 체크리스트 "출시 전" 항목 전부 통과 |

총 9주. 4단계는 라운지 저장소 변경이 끼므로 2단계와 병행해 라운지 쪽 PR을 먼저 올린다.

## 8. 위험과 대응

| 위험 | 영향 | 대응 |
| --- | --- | --- |
| Monaco 번들(수 MB)로 첫 로드가 느림 | 학원 저사양 PC에서 체감 | 언어 워커를 필요한 것만 로드, 편집기 영역 지연 로드, CDN 캐시 |
| AI가 파일을 잘못 지움 | 학생 작업 손실 | 기본 제안 모드, 삭제는 항상 확인, 파일 쓰기마다 이전 버전을 `editor_file_versions`에 보관(2차 스냅샷의 선행) |
| OpenRouter 비용 폭증 | 운영비 | 일일 예산, 모델 화이트리스트, 교실 단위 집계 대시보드 |
| 라운지 배포 API 인증 경계 | 보안 사고 | 방식 B(HMAC 내부 API), 에디터는 라운지 쿠키·service-role에 접근하지 않음 |
| 미성년자 데이터 | 법·신뢰 | ZDR·수집 거부 강제, 첨부 이미지 보존 기간 제한, 라운지 개인정보 처리 구조(docs/17) 문구에 에디터 추가 |
| 프롬프트 인젝션(파일 내용이 지시로 작동) | 의도치 않은 쓰기 | 도구 결과를 데이터로 표시, 쓰기 도구는 승인 게이트 |

## 9. 열어 둔 결정

- 모델 기본값: 코드 작성용 1종, 저가 보조용 1종, 비전 1종, 이미지 생성 1종을 어떤 것으로 할지(가격·한국어 품질 비교 후)
- AI 사용량을 루캣(라운지 화폐)으로 과금할지, 단순 일일 한도로 둘지
- 에디터 프로젝트와 라운지 작품의 관계: 1:1 고정인지, 한 프로젝트를 여러 작품으로 배포할 수 있게 할지
- 2차 번들링 도구: esbuild-wasm(가벼움) vs Sandpack(React 템플릿 완성도) vs WebContainers(상용 라이선스)
