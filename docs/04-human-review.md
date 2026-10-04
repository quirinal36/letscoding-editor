# 구현 후 사람이 준비·검토할 항목

> 2026-10-04 · 사용자 결정: 추천 기반 구성 채택, AI 예산은 개발 이후 결정, 계정은 사용자가 준비하고 `.env.local`을 채움. 현재 코드 검증에는 외부 계정·유료 모델·라이브 DB를 사용하지 않았다.

## 지금 할 수 있는 검토

`npm ci` → `npm run dev` → `http://localhost:3100`에서 로컬 데모를 연다. 첫 클릭 게임, 파일/폴더 작업, “버튼 색을 파랗게 바꿔줘” → 비교 → 승인, 미리보기, 배포 ZIP 검증을 확인한다. 데모 데이터는 **이 브라우저의 IndexedDB**에 저장된다. 다른 기기/서버로 자동 이전되지 않으므로 중요한 작업은 ZIP으로 보관한다. 데모에서는 실제 모델·라운지 작품·배포 링크를 만들지 않는다.

`.env.local`은 사용자가 채운다. 양식은 [`.env.example`](../.env.example). `npm run check:env`는 값이나 비밀을 출력하지 않고 입력 여부와 활성 상태만 확인한다. 키를 입력해도 AI/이미지/배포는 각각 활성화 플래그와 필수 설정이 갖춰져야 동작한다. 운영 빌드는 로컬 데모를 허용하지 않는다.

## 계정이 준비된 다음 순서

| 순서 | 사용자가 준비/검토할 것 | 준비 뒤 개발자가 검증할 것 | 연결 이슈 |
| --- | --- | --- | --- |
| 1 | 실제 staging Supabase 대상/접근 권한, 테스트용 학생 2명·교사·관리자·휴원 계정 | 소유권, RLS, 활동 역할, 서명 업로드·다운로드·저장 충돌 | #17, #19~21, #30 |
| 2 | 공유 DB 변경 검토와 staging 적용 일정 | [integration](../integration/README.md)의 SQL을 **라운지 새 migration**으로 반영, 로컬/staging 리허설, 백업·rollback | 에디터 #20, 라운지 #217 |
| 3 | Supabase Auth redirect 허용 목록 | `http://localhost:3100/auth/callback`, Preview·운영 callback 추가, PKCE 로그인·세션 만료 검증. 라운지 Site URL은 덮어쓰지 않음 | #19 |
| 4 | Vercel 기존 팀에 별도 `letscoding-editor` 프로젝트 생성 권한, GitHub 앱 접근, DNS 권한 | Dev/Preview=staging, Production=운영 환경 매핑, `editor.letscoding.kr` DNS·HTTPS·함수 수명·빌드 | #11, #18, #52 |
| 5 | 개발 **이후** AI 예산·OpenRouter 전용 계정/키/공급자 한도 결정 | 코드·보조·비전·이미지 모델 도구/strict/ZDR 검증, 토큰/이미지 가격·과금 대사, 호출 중단·장애·예약 정산 | #12, #15, #41~44 |
| 6 | 환경별 HMAC 비밀값, 라운지 변경 검토 담당 | 내부 API·기존 배포 코어 patch 반영, 생성/갱신/권한/리플레이/삭제된 연결/캐시/lease·복구 검증 | 라운지 #214~218, 에디터 #45~47 |
| 7 | Sentry 프로젝트와 정리 작업 실행 주체/주기 | DSN 연결, 민감 데이터 제거 확인, `CRON_SECRET`과 `/api/maintenance` 연결, 첨부·버전·orphan 삭제 staging 검증 | #12, #42, #49, #55 |
| 8 | 개인정보/보호자 동의 검토 담당, 보존 정책, 학생 파일럿 일정 | 실학생 전송 전 정책 반영, 학원 PC·Safari/Edge와 보조기술, 학생 5명·1주 관찰 | #12, #31, #48, #52~53 |

번호는 [등록 결과](./github-planning/registered.md)의 실제 이슈를 참조한다. 비밀값·학생 비밀번호를 이슈나 문서에 적지 않는다.

## 환경 설정 시 확인할 점

- `EDITOR_DEMO_MODE=true`: 개발 데모. 클라우드 검증할 때 `false`로 바꾼다. production에서는 무조건 무시한다.
- `NEXT_PUBLIC_*` 설정 변경은 앱 재빌드/재배포가 필요하다. 로컬 설정을 채운 뒤 개발 서버를 다시 시작한다.
- 서버 저장: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. service role은 서버 전용이다. staging 미확인 상태에서 운영 DB를 개발 기본값으로 넣지 않는다.
- 실제 AI: `EDITOR_AI_ENABLED=true`, 전용 `OPENROUTER_API_KEY`, 허용 모델, 양수인 `EDITOR_AI_DAILY_LIMIT_USD`, `EDITOR_AI_MONTHLY_LIMIT_USD`, `EDITOR_AI_MAX_TURN_USD`. 모델 가격이 확인되지 않거나 예약 예산을 확보하지 못하면 호출을 중단한다.
- 비전 입력: 선택한 비전 모델의 보수적 이미지 입력 비용을 측정한 뒤 `EDITOR_AI_IMAGE_INPUT_RESERVE_USD`를 설정한다. 이미지 생성도 `EDITOR_IMAGE_ENABLED=true`, 출력 모델과 `EDITOR_AI_IMAGE_OUTPUT_RESERVE_USD`를 추가로 요구한다. 이미지 생성 비용·크기 지원은 모델마다 실제로 검증한다.
- 앱 예약 한도는 공급자의 청구 상한을 대신하지 않는다. 중단/응답 유실 때 실제 비용을 모르면 예약 금액을 보수적으로 기록한다. 공급자 key/workspace 한도와 월 알림을 별도로 설정하고 미정산 예약은 공급자 로그와 대사한다. 임의로 0원 처리하지 않는다.
- 배포: `EDITOR_DEPLOY_ENABLED=true`, `LOUNGE_INTERNAL_API_URL`, `LOUNGE_INTERNAL_API_SECRET`. 라운지에는 같은 환경의 `EDITOR_INTERNAL_API_SECRET`. 운영 URL은 HTTPS, ZIP 업로드는 같은 Supabase 호스트만 허용한다.
- 관측: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`. 소스맵 업로드는 아직 설정하지 않았으며 `SENTRY_AUTH_TOKEN`은 설정 전용이다. 사용자 ID 외 이메일·코드·프롬프트·첨부·request payload·breadcrumb를 전송하지 않도록 코드에서 제거한다.
- 정리: `/api/maintenance`에 `Authorization: Bearer <CRON_SECRET>`. 코드 기본값은 삭제 프로젝트·이전 파일 버전·첨부 30일, 참조가 사라진 파일은 30일 이후 삭제 후보가 된다. **보존 기간은 운영 정책으로 승인되지 않았으며 staging에서 먼저 검증해야 한다.** 정리는 배치 제한으로 여러 번 실행해야 할 수 있다.

## 출시 전에 남는 실제 검증

로그인과 두 계정 격리, Postgres/Storage 실제 계약, 모델 4종 및 첫 토큰 시간, 실제 과금·예산 초과, 첫 배포/재배포·썸네일·비공개 작품 열기·Play 오리진, 배포 응답 유실/삭제 경합, 정리 cron, Sentry, 실제 학원 PC 성능, Safari/Edge, 정책·동의와 파일럿은 계정과 사람이 필요한 작업이다. GitHub 마일스톤과 이슈를 일괄 완료 처리하지 않았다.

## 검토할 구현 선택

- 채팅은 승인·예약·프로젝트 CAS를 직접 제어하는 React UI와 NDJSON 전송을 쓴다. 계획의 assistant-ui 대신 이 구현을 채택할지 검토한다.
- 한 AI 턴에는 한 파일 변경안을 만든다. 파일별 승인과 오래된 제안 거절을 명확하게 유지한다. 여러 파일 작업은 다음 턴으로 이어간다.
- 미리보기는 opaque-origin sandbox와 CSP, 텍스트 자산 data URL을 사용한다. 현재 Chromium에서 부모 origin의 Blob 자산 로드가 차단되어 대체했다. 상대 CSS/JS/이미지와 local fetch를 해석하며 외부 fetch/리소스 로드는 차단한다. 순환 모듈, srcset, 임의 런타임 경로 계산, 외부 CDN은 지원 범위에서 제외했다. iframe 자신의 페이지 이동까지 모든 네트워크 사용을 차단하는 별도 실행 서버는 포함하지 않는다.
- 파일 생성/이름 변경은 native dialog 입력으로 구현했다. 파일 트리는 500개 상한과 CSS content-visibility를 사용하며 실제 학원 PC 300파일 성능을 확인한다. 키보드 F2/Delete, 빠른 열기, 명령 팔레트를 제공한다.
- 텍스트 256KB 초과는 읽기 전용이며 최대 5MB까지 비공개 Storage로 저장한다. 프로젝트 전체 100MB/500파일, ZIP 30MB. binary size와 ZIP 디렉터리/실제 스트림 크기를 모두 검증한다.
- 파일 수정 전 원본은 `editor_file_versions`에 보관한다. 사용자용 버전 탐색 화면은 원문에서 2차 후보여서 구현하지 않았다. 복구는 관리자 검토 후 DB 버전으로 수행한다.
- 교사도 자기 프로젝트만 접근한다. 다른 학생 프로젝트 열람/관리 범위는 원문대로 2차다.
