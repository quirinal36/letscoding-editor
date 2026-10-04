# 학생 개인 GitHub 연동

2026-10-04 구현 상태: DB migration 적용 완료(384건 일치, 미적용 0건). App 등록은 GitHub의 Confirm access 재인증을 기다리고 있으며 아직 클라이언트 비밀값을 발급하거나 기능을 활성화하지 않았다.

App 소유 계정은 사용자 결정에 따라 `quirinal36`이다. 라운지 로그인과 GitHub 연결은 별개이며, 각 학생이 자신의 GitHub 계정으로 승인한다.

## 사용 흐름

1. 에디터에서 라운지 계정으로 로그인하고 상단 **GitHub**를 연다.
2. **GitHub에서 허용할 저장소 선택**에서 본인 개인 계정에 App을 설치하고 필요한 저장소만 선택한다.
3. 에디터의 **내 GitHub 연결**에서 본인 GitHub 계정으로 승인한다.
4. 저장소와 기존 브랜치를 선택해 **새 프로젝트로 가져오기** 또는 **현재 프로젝트 연결**을 누른다. 현재 프로젝트 연결은 파일을 즉시 변경하지 않는다. 이후 변경 목록에는 선택한 저장소 기준의 추가·수정·삭제가 나타나므로 커밋 전에 확인한다.
5. 수정 후 **변경사항 새로 확인**, 커밋 메시지 입력, **변경사항 커밋** 순서로 저장한다. 연결만으로 자동 푸시하지 않는다.
6. 원격에만 변경이 있으면 **최신 내용 가져오기**를 사용한다. 양쪽이 모두 변경되면 덮어쓰기를 차단한다. ZIP으로 보관하거나 새 프로젝트로 가져와 비교한다.
7. 라운지 배포는 기존 배포 버튼을 계속 사용한다.

GitHub API 요청은 GitHub App의 사용자 토큰으로 수행한다. 학생이 가진 권한과 앱 설치에서 허용한 저장소 범위의 교집합만 접근하며, MVP에서는 연결한 GitHub 계정이 소유한 개인 저장소만 표시한다. 조직·다른 학생 저장소, 저장소/브랜치 생성, PR·병합은 포함하지 않는다.

## 지원 파일

루트 `index.html`이 있는 정적 HTML/CSS/JS 프로젝트를 지원한다. 가져오기는 파일 500개, 파일당 5MB, 합계 30MB 이내이며 전체 Git 트리 항목은 1,500개까지 조회한다. 지원하는 정적 자산 확장자는 `src/lib/server/github/git.ts`의 목록을 따른다. 소스 빌드나 사용자 코드의 서버 실행은 하지 않는다.

숨김 경로·지원하지 않는 확장자는 가져오지 않고 원격에 보존한다. 푸시는 기존 Git tree를 바탕으로 관리 대상 파일만 변경한다. 심볼릭 링크, 서브모듈, Git LFS 포인터를 일반 파일로 변환하지 않는다. 빈 저장소는 GitHub에서 먼저 브랜치와 첫 커밋을 만든 뒤 사용한다. 보호 브랜치의 직접 커밋 제한은 우회하지 않는다.

## App 설정과 환경변수

GitHub → `quirinal36` Settings → Developer settings → GitHub Apps에서 등록한다.

| 항목 | 설정 |
| --- | --- |
| 이름 / slug | LetsCoding Editor / 사용 가능한 slug |
| Homepage | `https://editor.letscoding.kr` |
| Callback | `https://editor.letscoding.kr/api/github/callback` |
| Expire user authorization tokens | 켬 |
| Request user authorization during installation | 끔 — 에디터가 시작한 state/PKCE 흐름으로 별도 승인 |
| Webhook | 끔 |
| Repository Contents | Read and write |
| Repository Metadata | Read-only (기본) |
| 다른 권한 | 요청하지 않음 |
| 설치 가능 계정 | Any account |

서버 환경변수:

- `GITHUB_APP_SLUG`: 등록한 App URL의 slug.
- `GITHUB_APP_CLIENT_ID`: App 설정에 표시된 Client ID.
- `GITHUB_APP_CLIENT_SECRET`: App 설정에서 Generate a new client secret으로 발급한다.
- `GITHUB_COOKIE_KEY`: `openssl rand -hex 32`로 생성하는 64자리 hex 키. 서버에만 보관한다. 교체하면 기존 브라우저 연결은 재승인해야 한다.
- `EDITOR_GITHUB_ENABLED=true`: App과 DB 준비 후 명시적으로 활성화한다. 기본값은 false이며 설정이 부족해도 API는 차단된다.
- `NEXT_PUBLIC_APP_URL`: 해당 환경의 정식 origin. 로컬 검증에는 로컬 origin과 해당 App의 별도 callback 등록이 필요하다. 운영 비밀값을 Preview에 복제하지 않는다.

이 방식에서는 App private key나 installation token을 생성할 필요가 없다. 클라이언트 비밀값과 쿠키 암호화 키는 `.env.local` 및 에디터 프로젝트 서버 환경에만 두고 출력·커밋하지 않는다.

## 토큰·계정·충돌 처리

- OAuth state/PKCE 검증 후 사용자 토큰을 AES-256-GCM으로 암호화한 HttpOnly 쿠키에 저장한다. 운영에서는 Secure·SameSite=Lax이며 `/api/github` 경로에서만 전송한다.
- 쿠키는 라운지/Supabase 사용자 ID에 귀속된다. 다른 학생 로그인으로 재사용하지 못한다. 브라우저 JS·프로젝트 파일·DB에는 토큰 원문을 넣지 않는다.
- 토큰 최대 8시간 후 다시 연결한다. refresh token은 보관하지 않는다. **이 브라우저 연결 해제**는 해당 브라우저 쿠키만 지운다. GitHub 자체 승인 철회·App 제거는 GitHub Settings → Applications에서 수행한다.
- 검토 당시 에디터 revision, 연결 version, 원격 HEAD를 서버에서 다시 확인한다. GitHub ref 업데이트는 `force:false`로 실행한다. 원격이 변경됐거나 브랜치 보호 규칙이 거부하면 중단한다.
- 원격 커밋은 성공했으나 DB 응답이 유실된 경우, 새로 확인한 원격과 로컬 파일이 같으면 최신 내용 가져오기로 기준을 복구할 수 있다. 다르면 자동 병합하지 않는다.
- GitHub 다운로드의 Storage 업로드 후 DB 저장이 실패한 경우, 참조 여부가 불확실한 업로드를 즉시 삭제하지 않는다. 기존 보존 정책의 orphan 정리 대상으로 남는다. 정리 cron 활성화는 별도 운영 검토 사항이다.

## DB 소유권과 검증

원본은 라운지 `supabase/migrations/20261004131218_editor_github_links.sql`이다. 에디터 `integration/github-schema.sql`은 검토용 사본이며 독립 migration 원장이 아니다.

`editor.editor_github_links`에는 저장소/브랜치/기준 커밋/파일 해시만 저장한다. RLS로 소유자 조회를 제한한다. 학생은 직접 쓰기나 RPC 실행 권한이 없으며 서버 전용 `editor_github_sync`가 파일과 Git 기준을 하나의 transaction으로 갱신한다. 기존 대화·배포 메타데이터는 유지한다.

자동 검증: 쿠키 변조·만료·다른 학생 차단, PKCE, 소유 저장소 필터, 경로/크기 제한, blob SHA, 지원 외 파일 보존, 강제 푸시 금지와 원격 경합, DB RLS 및 revision/version 충돌을 검사한다. 브라우저 검증은 가짜 GitHub API로 가져오기·변경 목록·커밋·충돌 버튼 차단을 검사한다. 자동 테스트는 실제 학생 저장소에 커밋하지 않는다.

## 사람이 확인할 사항

- GitHub가 App 등록 시 요청하는 `quirinal36` 보안 재인증(패스키/인증 앱 등).
- 학생 본인의 GitHub App 설치와 OAuth 승인. 타인의 계정으로 대신 승인하지 않는다.
- 시험용 정적 저장소에서 실제 가져오기 → 수정·커밋 → GitHub에서 변경 확인 → 원격 수정·최신 가져오기 인수.
- 두 GitHub 계정, 설치 해제, 토큰 만료, 보호 브랜치, 큰 파일, 네트워크 응답 유실의 실제 인수.
- 학생 계정 사용 조건과 GitHub로 전송되는 파일 범위의 운영 안내.

참고: [GitHub App 사용자 토큰·PKCE](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), [Git ref 업데이트](https://docs.github.com/en/rest/git/refs).

검증 결과: `npm run check` 19개 통과, `npm run build` 통과, `npm run test:e2e` 10개 통과. DB 원본 적용 기록은 [라운지 문서](https://github.com/yudanah/letscoding_lounge/blob/master/docs/2026-10-04-editor-github-migration.md)에 남겼다. 실제 GitHub OAuth·저장소 커밋은 아직 수행하지 않았다.
