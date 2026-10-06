# 학생 Supabase 데이터베이스 연결 — 계획

> 작성일: 2026-10-06 (Asia/Seoul) · 상태: GitHub 등록 완료, 결정·구현 대기
> 대상: `quirinal36/letscoding-editor` · 마일스톤 [M6](https://github.com/quirinal36/letscoding-editor/milestone/7) · 에픽 [#60](https://github.com/quirinal36/letscoding-editor/issues/60)

학생이 본인 Supabase 프로젝트를 [GitHub 연동](./08-github-integration.md)과 같은 모양의 패널에서 연결하고, 작품 코드에서 데이터베이스를 읽고 쓰게 한다. 이 문서는 계획이며 등록이 구현 완료를 뜻하지 않는다.

## 배경과 현재 구조

- 에디터의 `NEXT_PUBLIC_SUPABASE_URL` 등은 라운지 계정 로그인과 프로젝트 저장용이다. 관리자가 한 번 설정하며 학생에게 노출하지 않는다. 이 계획의 연결은 그와 별개인 **학생 본인 소유 Supabase 프로젝트**다.
- Project URL과 anon(publishable) key는 브라우저에 공개되는 값이다. GitHub 사용자 토큰처럼 암호화 쿠키에 두지 않고 프로젝트 연결 메타데이터로 저장한다. service_role·secret 키는 입력·저장·전송을 모두 차단한다.
- 미리보기 sandbox의 CSP는 `connect-src data: blob:`으로 외부 요청을 모두 막는다(`src/lib/preview.ts`). 연결된 프로젝트에 한해 **해당 Supabase 호스트 하나만** 허용하는 것이 핵심 구조 변경이다. AGENTS.md의 "미리보기는 opaque-origin sandbox에서만 실행" 규약은 유지한다.
- 사용자 코드의 서버 실행, 에디터가 제공하는 공용 DB, 학생 계정 대리 생성은 범위 밖이다. 공용 DB 제공안은 라운지 DB 스키마·RLS 작업이 필요하므로 후속 후보로 둔다.

## 사용 흐름(목표)

1. 학생이 Supabase 대시보드에서 프로젝트를 만들고 Project URL과 anon key를 복사한다.
2. 에디터 상단 **DB**를 열어 두 값을 붙여넣고 **연결 테스트** → **연결**을 누른다.
3. **코드에 넣기**로 `supabase.js`가 생성되고 `index.html`에서 모듈로 불러온다. 또는 "방명록" 템플릿으로 시작한다.
4. 미리보기에서 연결 호스트 요청만 허용되어 글쓰기·목록 표시가 동작한다. 다른 외부 호스트는 계속 차단된다.
5. 라운지 배포는 기존 배포 버튼을 사용한다. ZIP 검증은 service_role 키 패턴을 검출하면 차단한다.
6. **연결 해제**하면 미리보기는 기존 차단 상태로 돌아간다. 파일은 유지된다.

## 등록 결과

| 키 | GitHub | 제목 | 유형 · 우선순위 | 선행 |
| --- | --- | --- | --- | --- |
| M6 | [milestone/7](https://github.com/quirinal36/letscoding-editor/milestone/7) | M6 — 학생 Supabase 데이터베이스 연결 | 마일스톤 | — |
| E-11 | [#60](https://github.com/quirinal36/letscoding-editor/issues/60) | [EPIC] E-11 — 학생 Supabase 데이터베이스 연결 | epic | — |
| I-044 | [#61](https://github.com/quirinal36/letscoding-editor/issues/61) | 학생 Supabase 연결 정책·범위·개인정보 결정 | decision · P0 | — |
| I-045 | [#62](https://github.com/quirinal36/letscoding-editor/issues/62) | Supabase REST·anon key·sandbox 호환 기술 검증 | spike · P0 | I-044 |
| I-046 | [#63](https://github.com/quirinal36/letscoding-editor/issues/63) | 연결 데이터 모델·API·키 검증(서버) | feature · P0 | I-044, I-045 |
| I-047 | [#64](https://github.com/quirinal36/letscoding-editor/issues/64) | DB 연결 패널 UI(연결·테스트·상태·해제) | feature · P0 | I-046 |
| I-048 | [#65](https://github.com/quirinal36/letscoding-editor/issues/65) | 미리보기 CSP 호스트 허용·배포 ZIP 정책 반영 | feature · P0 | I-045, I-046 |
| I-049 | [#66](https://github.com/quirinal36/letscoding-editor/issues/66) | supabase.js 코드 생성·방명록 템플릿·AI 컨텍스트 | feature · P0 | I-047, I-048 |
| I-050 | [#67](https://github.com/quirinal36/letscoding-editor/issues/67) | 테이블 데이터 보기·테이블 생성 SQL 복사(RLS 기본) | feature · P1 | I-047 |
| I-051 | [#68](https://github.com/quirinal36/letscoding-editor/issues/68) | 자동 검증·문서·선생님 안내 | task · P0 | I-046~I-049 |
| I-052 | [#69](https://github.com/quirinal36/letscoding-editor/issues/69) | 실제 학생 Supabase 계정 연결·미리보기·배포 인수 | task · P0 | I-051 |

마감일·담당자는 미지정이다. 라벨은 기존 `type:*`, `priority:*`를 사용했다. 순서는 결정(I-044) → 기술 검증(I-045) → 서버·UI·미리보기(I-046~I-048) → 코드 생성·보조 기능(I-049, I-050) → 검증·문서(I-051) → 실제 인수(I-052)다.

## 설계 요약

| 항목 | 계획 |
| --- | --- |
| 저장 | 운영: `editor.editor_supabase_links`(project_id·user_id·url·anon_key·version, 소유자 RLS). 제안 SQL은 `integration/`에 두고 원본 migration은 라운지 저장소가 소유한다. 데모: IndexedDB 프로젝트 메타데이터 |
| API | `/api/supabase` — `status`, `connect`, `test`, `disconnect`. 로그인·프로젝트 소유권 검사 후 처리 |
| 키 검증 | URL `https://<ref>.supabase.co` 형식. anon 형식(JWT `role=anon` 또는 `sb_publishable_`)만 허용, service_role·secret 형식 거부. 키를 로그·오류·AI 프롬프트에 출력하지 않음 |
| 활성화 | `EDITOR_SUPABASE_LINK_ENABLED=true`로 명시 활성화. 기본 false |
| 미리보기 | 연결 시 `connect-src`에 연결 호스트(`https://<ref>.supabase.co`, 필요 시 `wss://`)만 추가. supabase-js CDN 채택 여부는 I-045 결과를 따름 |
| UI | 상단 `DB` 버튼 → 모달 패널. 입력·테스트·연결·해제·상태·코드에 넣기. 데모 모드는 로컬 저장 안내, 비활성 시 관리자 안내 |
| 보조 | 읽기 전용 테이블 보기(50행), RLS 포함 테이블 생성 SQL 복사 |

## 결정 기록

2026-10-06 소유자(`quirinal36`)가 결정했다. 기록: [#61](https://github.com/quirinal36/letscoding-editor/issues/61).

| 키 | 내용 | 결정 | 연결 |
| --- | --- | --- | --- |
| S-01 | 학생 대상 연령·Supabase 가입 조건·보호자 동의 문구 | **전 연령, 선생님 안내만.** 학생 본인이 계정을 만들며 보호자 동의 문구는 바꾸지 않는다. 선생님 안내에 계정 생성·데이터 전송 주의를 적는다 | I-044, I-051 |
| S-02 | 자체 호스팅 Supabase 도메인 허용 여부 | **`https://<ref>.supabase.co`만 허용.** 자체 호스팅은 후속 후보 | I-046, I-048 |
| S-03 | sandbox에서 supabase-js CDN 로드 vs REST fetch 직접 호출 | **supabase-js CDN ESM 모듈.** 미리보기 CSP `script-src`에 CDN 호스트 하나를 추가한다. CDN 선택과 `persistSession:false` 등 옵션은 I-045에서 확인 | I-045, I-048, I-049 |
| S-05 | 배포 ZIP에서 service_role 키 패턴 검출 시 | **배포 차단.** 키를 지우기 전에는 배포할 수 없다 | I-048 |

S-04(라운지 호스팅 CSP가 외부 호스트 요청을 허용하는지)는 결정이 아니라 확인 항목이며 I-045에서 라운지 저장소를 확인하고 I-052에서 실제 인수한다.

## 사람이 확인할 사항

- 학생 본인의 Supabase 계정 생성과 키 복사. 타인의 계정으로 대신 연결하지 않는다.
- RLS가 꺼진 테이블은 누구나 읽고 쓸 수 있다는 점을 선생님 안내에 반영한다.
- 실제 인수(I-052)는 재현 단계·프로젝트 ID·시각만 기록하고 키·학생 데이터는 붙이지 않는다.
