# 구현 착수 — 사용자 준비와 결정

> 확인일: 2026-10-04 (Asia/Seoul) · 상태: 추천 기반 구성 채택, 예산은 개발 이후 결정, 계정은 사용자 준비
> 연결: [착수 결정 #11](https://github.com/quirinal36/letscoding-editor/issues/11), [운영 정책 #12](https://github.com/quirinal36/letscoding-editor/issues/12), [범위 충돌 #13](https://github.com/quirinal36/letscoding-editor/issues/13)

먼저 기반 구성·AI 예산·계정 준비 상태를 정한다. 라이브러리 선택, RLS 설계, HMAC 구현, 모델 벤치마크는 에이전트가 수행할 개발 작업이다. 사용자에게 기술 세부사항을 모두 결정해 달라고 요청하지 않는다.

## 이미 확인한 것

| 항목 | 확인 결과 | 남은 준비 |
| --- | --- | --- |
| GitHub | 에디터·라운지 저장소 접근, 마일스톤·이슈 등록 완료 | 새 계정/저장소 불필요 |
| Vercel 로그인 | CLI `turboguy36-9404`로 조회 가능 | 에디터 프로젝트 생성/연결은 아직 안 함 |
| 기존 Vercel 팀 | 라운지는 `Nana's projects`, slug `nanas-projects-c600db2d` | 에디터도 이 팀을 사용할지 결정 |
| 에디터 Vercel 프로젝트 | 해당 팀 목록에 `letscoding-editor` 없음, 로컬 `.vercel/project.json` 없음 | GitHub 앱 접근·프로젝트 생성·환경 등록 |
| 라운지 Supabase | `zuynxiriimaimjmjnntc`, 조회 시 ACTIVE_HEALTHY | 공유 여부 결정, editor 테이블은 미생성 |
| 개발용 staging | 접근 가능한 프로젝트 목록에 라운지 staging으로 식별할 수 있는 프로젝트가 없음. 로컬 staging URL도 유효한 호스트로 확인되지 않음 | 실제 staging 존재/접근권한 확인. 없으면 환경 마련 방안과 비용 결정 |
| OpenRouter | 라운지 `.env.staging.local`에 비어 있지 않은 키 존재 | 키 유효성·소유 계정·잔액·한도는 미확인. 에디터 전용 키 권장 |
| 도메인 | `editor.letscoding.kr` 계획안 | DNS 관리 서비스/수정 권한 및 새 레코드 확인 |
| 로컬 환경 양식 | [.env.example](../.env.example) 준비, `.env*`/`.vercel` Git 제외 | 사용자가 `.env.local`을 채움; 값 출력 없이 입력 여부만 확인 |

환경 파일은 관련 변수의 이름과 값 존재 여부만 확인했다. 기존 앱의 비밀값을 에디터에 복사하거나 유료 모델을 호출하지 않았다. 로컬 production Supabase link는 staging 확인 근거로 사용하지 않는다.

## 1. 지금 답변받을 항목

### 기반 구성 — A-02~05

2026-10-04 사용자 답변으로 다음 추천안을 채택했다. 리소스 생성·접근 검증은 별도다.

- 별도 Vercel 앱 `letscoding-editor`, 기존 라운지 팀 사용.
- 운영 도메인 `editor.letscoding.kr`. 개발용 고정 주소는 staging 구성 확인 후 정한다.
- 운영에서는 기존 라운지 Supabase 공유, 개발/검증에서는 별도 staging 환경의 라운지 Supabase 공유.
- 마이그레이션 원본은 라운지 저장소에서 관리. 에디터 저장소에서 독립 migration 원장을 만들지 않는다.
- 에디터 서버→라운지 내부 API의 HMAC 연동. 환경별 전용 secret을 만들고 기존 Play/Village secret과 분리한다.
- 첫 공개 범위는 학생 편집/배포. 교사·관리자 역할 인식은 포함하고 교사의 학생 프로젝트 열람 UI는 후속이다.

결정 기록: **미답변**. staging이 없다면 생성 비용과 유지 방식부터 정하고, 확인 없이 production을 개발 DB로 사용하지 않는다.

### 예산과 파일럿 — A-06~07

사용자가 정할 값:

| 값 | 답변 |
| --- | --- |
| 첫 파일럿 학생 수 | 미정 |
| 월 수업/사용일 | 미정 |
| 월 AI 지출 상한(원 또는 USD) | 미정 |
| 개발 모델 검증에 사용 가능한 총 예산 | 미정 |

추천 운영안: 초기에는 루캣 결제 없이 USD 기준 일일 한도를 적용하고, 한도 초과 시 채팅을 중단한다. 편집·저장·배포는 계속 제공한다. 공급자 측 앱 전체 한도와 에디터 서버의 학생별 한도를 함께 둔다.

예산 산정은 `학생 수 × 월 사용일 × 학생 일일 한도 + 개발/이미지 예비비`로 시작한다. 원화 상한을 USD로 바꿀 때 환율·수수료·여유분을 별도 기록한다. 예산 예시를 실제 설정값이나 결제 승인으로 취급하지 않는다. 모델 4종은 사용자가 이름을 고르는 대신 에이전트가 한국어·도구 호출·비전·이미지·ZDR 가용성·가격을 실험한 뒤 제안한다.

### 계정/권한 — A-02, E-03~04

사용자는 DNS 서비스 이름·관리 가능 여부, Vercel 팀 선택, OpenRouter 결제/키 준비 여부만 알려주면 된다. 비밀키는 채팅이나 문서에 적지 않고 확정된 에디터 로컬 환경 또는 Vercel 환경변수에 등록한다.

- [ ] DNS 관리 서비스와 `letscoding.kr` 수정 권한 확인.
- [ ] Vercel 팀 선택 및 GitHub `quirinal36/letscoding-editor` import 가능 여부 확인.
- [ ] OpenRouter 결제 계정/잔액·전용 개발 키·지출 한도 확인.
- [ ] staging Supabase 프로젝트 또는 접근 경로 확인.

계정 구매·크레딧 충전·요금제 변경은 사용자의 금액 결정을 받은 뒤 진행한다.

## 2. 기반 결정 후 사용자와 정할 운영 항목

| 항목 | 추천 초안 | 사용자 결정 시점 | 관련 |
| --- | --- | --- | --- |
| 프로젝트 한도 | 배포 정책의 500파일/해제 100MB/압축 30MB 안에서 설정, 바이너리 파일당 5MB | VFS/업로드 구현 전 | A-08, #12 |
| 큰 텍스트 | 256KB 초과는 읽기 전용, 저장/가져오기 허용 여부는 검증 결과로 제안 | 파일 저장 계약 전 | C-09, #17, #30 |
| 첨부 이미지 | 비공개 저장, 30일 보관 후보, 만료/대화 삭제 시 정리 범위 명시 | 실제 학생 첨부 사용 전 | A-09, #42 |
| 프로젝트 삭제 | 명세의 삭제 후 30일 보관 채택 후보, 그 후 원본/대화 정리 | 프로젝트 삭제 구현 전 | PJ-01, #21 |
| 안전 복구 | AI 적용 전 최소 백업 포함, 사용자용 버전 탐색 UI는 후속 후보 | 쓰기 승인 구현 전 | Q-02, #13, #37, #55 |
| 템플릿 | 빈 HTML·HTML/CSS/JS 게임·소개 페이지 3종 | 템플릿 구현 전 | A-10, #34 |
| 출시 범위 | 명세 P0/P1 유지. 단계 5 P2는 파일럿 결과와 일정에 따라 결정 | 일정 확정 전 | #13, #51 |
| 파일럿 | 학생 5명·1주가 원문 안. 담당 교사/학년/학원 PC·브라우저 확인 | 학생 테스트 전 | #53 |
| 정책·동의 | 기존 개인정보/보호자 동의에 AI·첨부 항목을 검토할 담당 지정 | 실제 학생 데이터 전송 전 | E-01~02, #52 |

30일 보관이나 예산은 권장 후보일 뿐 확정된 정책이 아니다. 법적 적합성을 이 문서에서 판단하지 않는다. 검토 담당과 근거는 출시 이슈에 기록한다.

## 3. 사용자 답변 후 에이전트가 처리할 준비

1. 선택 결과·날짜를 이 문서와 #11~13의 결정 기록에 반영한다. 확인한 항목만 원본 체크리스트를 닫는다.
2. Vercel 프로젝트 연결과 환경 매핑을 준비한다. Dev/Preview는 확인된 staging, Production은 운영 환경으로 연결한다. 아직 실행할 앱이 없으므로 프로젝트 연결과 배포 성공은 구분한다.
3. Supabase Auth의 에디터 callback을 기존 허용 목록에 추가하고 로그인 경로를 구현/검증한다. 라운지의 공용 Site URL을 에디터 주소로 덮어쓰지 않는다.
4. [.env.example](../.env.example)을 확정된 환경으로 채운다. 개발/운영 OpenRouter 키와 HMAC secret을 분리한다. 서비스 키를 public 변수에 넣지 않는다.
5. 라운지 #214~218의 인증·생성/갱신 계약과 공유 migration 게이트를 확인한다. 기존 라운지 기능의 상태를 별도 검증하며 계약 초안을 완료로 간주하지 않는다.
6. 예산 범위 안에서 #14~17 기술 실험을 진행해 모델·프리뷰·파일/ZIP 계약을 확정한다.

계정·도메인 생성이나 live DB 적용은 이번 점검에서 실행하지 않았다. 초기 환경의 결정이 필요한 동안 로컬 문서/양식과 기술 검증 계획부터 준비한다.

## 준비 완료 기준

- [x] GitHub 대상과 착수 이슈 확인.
- [x] 기존 Vercel·Supabase 조회 및 로컬 환경 양식 준비.
- [x] 기반 구성과 Vercel 팀 확정 (추천안 채택).
- [ ] 개발 staging 대상/접근 확인.
- [ ] AI 월 상한·개발 실험 예산·일일 정책 확정.
- [ ] DNS/OpenRouter 계정 준비 상태 확인.
- [ ] 개발용 학생 2계정(소유권 격리 검증)·교사/관리자 테스트 계정 준비. 실제 학생 연락처/비밀번호를 이 문서에 기록하지 않는다.

외부 리소스 없이 가능한 M0–M5 코드를 먼저 구현한다. 연결과 유료 실험은 계정·예산 준비 후 진행한다. 도메인 운영 전환·실제 학생 파일럿은 각 단계의 준비가 끝난 뒤 진행한다.

## 설정 근거

- [Vercel 환경별 변수](https://vercel.com/docs/environment-variables): Development/Preview/Production의 값을 분리한다. [민감 변수](https://vercel.com/docs/environment-variables/sensitive-environment-variables)는 Preview/Production에서 지원된다.
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls): 로그인 callback과 redirectTo는 허용 목록과 일치시킨다.
- [OpenRouter Spend Controls](https://openrouter.ai/docs/guides/best-practices/spend-controls): workspace 및 key/member 한도가 있으며 공유 키가 에디터 학생별 한도를 대신하지 않는다.
- [OpenRouter ZDR](https://openrouter.ai/docs/guides/features/zdr): provider.zdr 요청 정책에 맞는 endpoint만 허용한다. 사용 가능한 모델은 실제 실험 시 확인한다.
- 로컬 라운지 docs/41-shared-migration-ledger.md: 공유 DB migration 소유는 라운지이며 config push는 실행하지 않는다.

최신 구현 결과는 [05-implementation-status](./05-implementation-status.md), 이후 사람 개입은 [04-human-review](./04-human-review.md)에 기록한다.
