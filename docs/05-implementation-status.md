# M0–M5 코드 구현 결과

> 2026-10-04 · 외부 리소스 없이 개발 가능한 코드와 로컬 검증을 진행했다. 이슈별 완료 기준과 검증 범위를 대조해 GitHub 상태를 동기화했다. [이슈별 기록](./github-planning/status-sync-2026-10-04.md)을 참조한다.

## 단계별 결과

| 단계 | 작성한 코드 | 검증 상태 | 사람·계정이 필요한 다음 단계 |
| --- | --- | --- | --- |
| M0 기반 | Next.js 16.3.8/React 19, Monaco 로컬 로더, 3열 resize 셸, 테마/접기, PKCE 로그인, 사용자 역할, 공유 DB/RLS/service RPC, 환경 활성화 게이트 | 타입·린트·빌드, 로컬 셸·키보드·테마, PGlite migration/RLS | Vercel/DNS·Auth callback·운영 DB 적용 완료; staging·실제 계정 로그인은 남음 |
| M1 편집·실행 | VFS CRUD·폴더 이동·검색·업로드·ZIP 가져오기, 탭, Monaco/언어 worker, 디바운스 저장·CAS·다중 탭 경고, 큰 텍스트 Storage, 이미지/SVG·Markdown, 격리 미리보기/콘솔/폭/새 창 | 파일 경로·용량·ZIP·실제 해제 한도, 로컬 저장·복원, 미리보기 실행·격리 | Supabase Storage·서버 저장, 학원 PC 성능·브라우저 호환 |
| M2 AI 승인 | NDJSON 스트림·중단·스레드·선택 코드, 읽기/검색/쓰기/생성/이름변경/삭제/콘솔 도구, 한 턴 한 변경안, diff·승인/거절·자동 적용, 오래된 제안 차단·원본 버전 | 데모 승인·중단·복원, 파일 원본 불변·stale 거절, SQL 버전/CAS | 실제 모델의 tool/strict/ZDR·첫 토큰·중단 과금 |
| M3 멀티모달·비용 | 이미지 3장 서명 업로드·소유권/형식 검증, 비전 입력, generate_image 도구와 직접 생성, 모델 허용 목록·가격, 일/최근 7일/31일 사용량, 일/월 원자적 예약·정산 | 예산 미설정 게이트, Postgres 동시 예약·한도·중복 정산 | 모델·일/월/턴 예산 등록 및 AI 활성화 완료; 이미지 비용·모델 실제 호출·청구 대사 남음 |
| M4 라운지 배포 | 정적 ZIP·SHA·정책 검증, 배포 form/썸네일·갱신·연결 해제·이력, HMAC prepare/upload/complete 클라이언트, nonce/소유권/기한/receipt 어댑터와 라운지 코어 patch | ZIP 3템플릿 roundtrip, HMAC 변조·시각·재사용·권한, SQL 첫 생성 idempotency | 공유 migration 운영 적용 완료; 라운지 앱 코드 반영·Play URL·lease/rollback/캐시/비공개 작품 |
| M5 안정화 | Playwright·axe, CI, Sentry 민감값 제거, ID 구조화 로그, 정리 endpoint/RPC, 명령 팔레트·포맷·기기 폭·Markdown, 교사 안내·검토 문서 | 아래 자동 검사 결과 | Sentry/cron 연결, 실제 성능·보조기술·학생 5명/1주, 정책·동의 |

## 실행과 검사

최종 결과: 타입·린트 통과, 단위/계약/Postgres 테스트 **12개 통과**, Playwright **5개 통과**, 운영 빌드 통과.

- `npm run check`: TypeScript, ESLint, 단위/계약/PostgreSQL 검사. 테스트용 PGlite에서 두 SQL을 실제로 실행하여 소유권 RLS, 파일/metadata 충돌, 파일 버전, 사용량 예약/한도/정산, 첫 라운지 작품 생성 idempotency를 확인한다. 이 자동 검사는 Supabase 운영 DB에 연결하지 않는다. 별도 운영 transaction에서 저장/CAS/버전/예산/RLS/RPC 권한을 검증하고 시험 데이터를 모두 rollback했다.
- `npm run build`: webpack 운영 빌드. 현재 실행 환경의 Turbopack build worker 포트 제한을 피해 명시적으로 webpack을 선택했다.
- `npm run test:e2e`: Chromium 개발 데모에서 편집→승인→실행→ZIP→복원, 키보드·테마·axe, 두 탭·악성 HTML 격리, 프로젝트 생성/복제/삭제·금지 업로드, AI 응답 중단/복원을 검사한다. axe 검사는 Monaco 내부를 제외한 앱 셸의 WCAG A/AA 태그 범위다.
- `npm run check:env`: 설정 존재 여부만 출력한다. Production은 cloud=true, ai=true, image=false, deploy=false다. 사용자 지시로 AI 턴 최대 예산은 10 USD다.

운영 DB 테이블 10개/RLS 10개/RPC 5개와 private 버킷 2개, Data API editor 노출을 완료했다. 서버 REST 200·익명 401을 확인했다. 실제 로그인·두 기기 재열기·Storage 업로드, OpenRouter 응답·청구, 라운지 서버, Sentry ingest 인수는 남는다. 설치된 Monaco 로더와 언어 자산은 `predev/prebuild`가 `public/monaco`로 복사하며 Git에 넣지 않는다. 버전은 lockfile로 고정한다.

## 구현 구조

- `src/components/`: 편집기 셸, Monaco와 diff, native dialog, sandbox preview.
- `src/lib/`: 타입·VFS·템플릿·IndexedDB·클라우드 클라이언트·ZIP·미리보기·명시적 데모 AI.
- `src/lib/server/`: 인증/권한·저장·예산, 실제 AI/이미지, 라운지 HMAC 클라이언트. 학생 코드를 서버에서 실행하지 않는다.
- `src/app/api/editor`: 인증된 JSON action 라우터. 대화/배포/승인 기록은 서버가 소유하며 클라이언트 snapshot으로 위조할 수 없다. 큰 원본은 private signed upload로 전송한다.
- `integration/`: 공유 DB schema/RPC와 라운지 내부 API·어댑터·코어 patch 검토본. `lounge-package`는 대상 저장소 imports를 포함한 이식 자료라 에디터 TypeScript 대상에서 제외한다. 일반 어댑터는 타입 검사·계약 검사 대상이다.
- `tests/`, `.github/workflows/`: 외부 계정 없는 회귀 검사와 CI.

## 검토·연결 전 남는 범위

[사람 검토 문서](./04-human-review.md)에 환경 준비 순서, 유료 호출 활성 조건, 보존 정책, 라운지 patch 반영, 정책·파일럿, 계획과 달라진 구현 선택을 기록했다. 인라인 파일명 UI 대신 dialog, assistant-ui 대신 자체 UI, Blob 대신 data URL, 가상 트리 라이브러리 대신 content-visibility는 실제 검토할 선택이다. 버전 복구 UI와 담당 학생 열람은 원문 2차 후보다.

## 기능명세 추적

원본 77개 기능의 문구·우선순위·수용 기준은 [기존 추적표](./github-planning/traceability.md)를 유지한다. 아래는 **코드 위치**와 검증 구분이며 원문 상태를 자동 변경하지 않는다.

| ID | 기능 | 코드 | 확인 구분 |
| --- | --- | --- | --- |
| SH-01 | 3열 레이아웃 | `src/components/editor-app.tsx` | 로컬 셸 검사 |
| SH-02 | 패널 접기 | `src/components/editor-app.tsx` | 로컬 셸 검사 |
| SH-03 | 다크·라이트 테마 | `src/components/editor-app.tsx` | 로컬 셸 검사 |
| SH-04 | 프로젝트 바 | `src/components/editor-app.tsx` | 로컬 셸 검사 |
| SH-05 | 하단 상태바 | `src/components/editor-app.tsx` | 로컬 셸 검사 |
| SH-06 | 명령 팔레트 | `src/components/editor-app.tsx` | 로컬 셸 검사 |
| EX-01 | 폴더 트리 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 접기/계층/content-visibility; 학원 PC 300파일 검사 별도 |
| EX-02 | 새 파일·폴더 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| EX-03 | 이름 변경 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| EX-04 | 삭제 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| EX-05 | 드래그 이동 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| EX-06 | 파일 업로드 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| EX-07 | ZIP 가져오기 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| EX-08 | 파일 이름 검색 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| EX-09 | 금지 파일 경고 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| EX-10 | AI 변경 표시 | `editor-app.tsx`, `vfs.ts`, `client.ts` | 로컬 파일 흐름; 서버 업로드 연결 대기 |
| ED-01 | Monaco 코드 편집 | `code-editor.tsx`, `editor-app.tsx` | Monaco·편집/복원; 성능 인수 별도 |
| ED-02 | 여러 파일 탭 | `code-editor.tsx`, `editor-app.tsx` | Monaco·편집/복원; 성능 인수 별도 |
| ED-03 | 자동 저장 | `code-editor.tsx`, `editor-app.tsx`, `config.ts` | 첫 변경 후 60초 간격(입력 중에도 연기하지 않음)·탭 숨김 시 즉시·Ctrl/⌘+S; `EDITOR_AUTOSAVE_MS` 1초~10분, E2E는 1초 |
| ED-04 | 이미지 뷰어 | `code-editor.tsx`, `editor-app.tsx` | PNG/JPG/GIF/WebP 이미지 및 SVG 코드+미리보기; 5MB PC 성능 별도 |
| ED-05 | 마크다운 미리보기 | `code-editor.tsx`, `editor-app.tsx` | Monaco·편집/복원; 성능 인수 별도 |
| ED-06 | 자동완성·오류 표시 | `code-editor.tsx`, `editor-app.tsx` | Monaco·편집/복원; 성능 인수 별도 |
| ED-07 | 되돌리기·찾기 바꾸기 | `code-editor.tsx`, `editor-app.tsx` | Monaco·편집/복원; 성능 인수 별도 |
| ED-08 | 코드 포맷 | `code-editor.tsx`, `editor-app.tsx` | Monaco·편집/복원; 성능 인수 별도 |
| ED-09 | 큰 파일 처리 | `code-editor.tsx`, `editor-app.tsx` | Monaco·편집/복원; 성능 인수 별도 |
| ED-10 | 인라인 diff | `code-editor.tsx`, `editor-app.tsx` | Monaco·편집/복원; 성능 인수 별도 |
| PV-01 | iframe 미리보기 | `preview.ts`, `components/preview.tsx` | Chromium 실행/격리; Safari/Edge 별도 |
| PV-02 | 자동 새로고침 | `preview.ts`, `components/preview.tsx` | Chromium 실행/격리; Safari/Edge 별도 |
| PV-03 | 상대 경로 해석 | `preview.ts`, `components/preview.tsx` | Chromium 실행/격리; Safari/Edge 별도 |
| PV-04 | 콘솔 패널 | `preview.ts`, `components/preview.tsx` | Chromium 실행/격리; Safari/Edge 별도 |
| PV-05 | 기기 폭 전환 | `preview.ts`, `components/preview.tsx` | Chromium 실행/격리; Safari/Edge 별도 |
| PV-06 | 새 창 열기 | `preview.ts`, `components/preview.tsx` | Chromium 실행/격리; Safari/Edge 별도 |
| PV-07 | 샌드박스 격리 | `preview.ts`, `components/preview.tsx` | Chromium 실행/격리; Safari/Edge 별도 |
| AI-01 | 스트리밍 대화 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-02 | 스레드 저장 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-03 | 시스템 프롬프트 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 열린 파일/트리/정책·문맥 길이 제한; 모델별 토큰 측정 별도 |
| AI-04 | 읽기 도구 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-05 | 쓰기 도구(제안 모드) | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-06 | 자동 적용 모드 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-07 | 도구 호출 표시 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-08 | 이미지 첨부 입력 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-09 | 이미지 생성 도구 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | generate_image 승인 제안/직접 생성 코드; 실제 출력·size 지원 검증 대기 |
| AI-10 | 모델 선택 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-11 | 사용량·일일 한도 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-12 | 미리보기 오류 전달 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-13 | 선택 영역 첨부 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-14 | 프롬프트 인젝션 방어 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-15 | 데이터 정책 강제 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-16 | 코드 블록 저장 | `server/ai.ts`, `server/image.ts`, `editor-app.tsx` | 데모 승인·중단; 실제 모델/청구 검증 대기 |
| AI-17 | 음성 입력 | 후속 범위 | 원문 후속: M0–M5에 포함하지 않음 |
| PJ-01 | 프로젝트 목록 | `server/repository.ts`, `local-store.ts`, `templates.ts` | 로컬 CRUD와 SQL; 실제 Auth/Storage 별도 |
| PJ-02 | 템플릿 3종 | `server/repository.ts`, `local-store.ts`, `templates.ts` | 로컬 CRUD와 SQL; 실제 Auth/Storage 별도 |
| PJ-03 | 서버 저장 | `server/repository.ts`, `local-store.ts`, `templates.ts` | 로컬 CRUD와 SQL; 실제 Auth/Storage 별도 |
| PJ-04 | 용량 표시 | `server/repository.ts`, `local-store.ts`, `templates.ts` | 로컬 CRUD와 SQL; 실제 Auth/Storage 별도 |
| PJ-05 | 프로젝트 복제 | `server/repository.ts`, `local-store.ts`, `templates.ts` | 로컬 CRUD와 SQL; 실제 Auth/Storage 별도 |
| PJ-06 | ZIP 다운로드 | `artifact.ts`, `editor-app.tsx` | 라운지 정책 ZIP roundtrip; 실제 수동 업로드 인수 별도 |
| PJ-07 | 파일 변경 이력 | `editor_file_versions` | 백업·30일 정리 코드; 사용자 시점 복구 UI는 원문 후속 |
| PJ-08 | 단일 편집자 규칙 | `server/repository.ts`, `local-store.ts`, `templates.ts` | 로컬 CRUD와 SQL; 실제 Auth/Storage 별도 |
| DP-01 | ZIP 생성 | `artifact.ts`, `server/deploy.ts`, `integration/` | ZIP·서명·SQL 계약; 라운지 이식/실배포 대기 |
| DP-02 | 배포 전 정책 검증 | `artifact.ts`, `server/deploy.ts`, `integration/` | ZIP·서명·SQL 계약; 라운지 이식/실배포 대기 |
| DP-03 | 첫 배포 폼 | `artifact.ts`, `server/deploy.ts`, `integration/` | ZIP·서명·SQL 계약; 라운지 이식/실배포 대기 |
| DP-04 | 재배포 | `artifact.ts`, `server/deploy.ts`, `integration/` | ZIP·서명·SQL 계약; 라운지 이식/실배포 대기 |
| DP-05 | 결과 링크·이력 | `artifact.ts`, `server/deploy.ts`, `integration/` | ZIP·서명·SQL 계약; 라운지 이식/실배포 대기 |
| DP-06 | 라운지 내부 API 호출 | `artifact.ts`, `server/deploy.ts`, `integration/` | ZIP·서명·SQL 계약; 라운지 이식/실배포 대기 |
| DP-07 | 배포 차단 안내 | `artifact.ts`, `server/deploy.ts`, `integration/` | ZIP·서명·SQL 계약; 라운지 이식/실배포 대기 |
| DP-08 | 썸네일 자동 생성 | 후속 범위 | 원문 후속: M0–M5 범위에 포함하지 않음 |
| NF-01 | 첫 로드 3초 | `tests/`, `observability.ts`, `maintenance/` | 자동 검사; 성능/운영/파일럿 별도 |
| NF-02 | AI 턴 시간 제한 | `tests/`, `observability.ts`, `maintenance/` | 자동 검사; 성능/운영/파일럿 별도 |
| NF-03 | 키보드·대비 | `tests/`, `observability.ts`, `maintenance/` | 자동 검사; 성능/운영/파일럿 별도 |
| NF-04 | 오류 추적 | `tests/`, `observability.ts`, `maintenance/` | 자동 검사; 성능/운영/파일럿 별도 |
| NF-05 | 자동 테스트 | `tests/`, `observability.ts`, `maintenance/` | 자동 검사; 성능/운영/파일럿 별도 |
| NF-06 | 브라우저 지원 | `tests/`, `observability.ts`, `maintenance/` | 자동 검사; 성능/운영/파일럿 별도 |
| NF-07 | 비용 대시보드 | `tests/`, `observability.ts`, `maintenance/` | 자동 검사; 성능/운영/파일럿 별도 |
| AC-01 | Supabase Auth 로그인 | `server/repository.ts`, `auth/callback`, `editor-schema.sql` | 이메일/카카오 Auth 코드·역할·SQL RLS; 실제 계정 로그인 대기 |
| AC-02 | 역할 인식 | `server/repository.ts`, `auth/callback`, `editor-schema.sql` | 이메일/카카오 Auth 코드·역할·SQL RLS; 실제 계정 로그인 대기 |
| AC-03 | RLS | `server/repository.ts`, `auth/callback`, `editor-schema.sql` | 이메일/카카오 Auth 코드·역할·SQL RLS; 실제 계정 로그인 대기 |
| AC-04 | 선생님 열람 모드 | 후속 범위 | 원문 2차: 기관 학생 열람 미구현 |

## 의존성 검토

`npm audit`에서 발견한 Next.js critical 항목은 16.3.8로, 앱의 DOMPurify는 3.4.16으로 수정했다. Monaco는 0.57.0이다. 감사 결과 런타임 high/critical은 0개이며 Monaco에 포함된 DOMPurify의 hook 관련 low 항목 2개가 남는다. 앱은 해당 custom hook/IN_PLACE 경로를 사용하지 않는다. 개발 ESLint glob 의존성의 braces stack exhaustion high 항목 5개는 upstream 수정 버전이 없어 남는다. trusted repository 파일 패턴만 사용하며 출시 시 버전을 다시 대조한다. 라이브러리를 큰 버전으로 무조건 downgrade하는 audit fix --force는 실행하지 않았다.
