# AI 모델 선택과 교사 프롬프트 조회 GitHub 개발 계획

> 기준일: 2026-10-11 (Asia/Seoul) · 상태: GitHub 등록 완료 · 구현 전
> 대상: `quirinal36/letscoding-editor`, `yudanah/letscoding_lounge`
> 준비 키는 GitHub 이슈 번호가 아니다. 담당자·마감일은 미지정이다.

학생이 AI 모델을 선택하고 전송한 프롬프트를 담당 선생님이 라운지 관리자 화면에서 조회한다. 하나의 기능 묶음을 **저장소별 마일스톤 2개, 에픽 3개, 하위 이슈 10개**로 추적한다. 공유 DB migration 원본과 적용은 라운지 저장소가 소유한다.

## 확정 범위와 열린 결정

| 항목 | 상태 | 내용 |
| --- | --- | --- |
| 모델 선택 범위 | 사용자 확정 | OpenAI·Anthropic·Grok·Gemini·Qwen·DeepSeek별 대표 모델 1~2개, 총 6~12개 |
| 교사 조회 범위 | 사용자 확정 | 현재 담당 학생만 조회, 관리자만 전체 조회 |
| 관리자 권한 적용 | 기존 라운지 권한 재사용 | 플랫폼 관리자는 전체, 기관 관리자는 자기 기관. 교사는 현재 담당 학생의 해당 기관 기록 |
| 기록 대상 | 계획 | 전송한 프롬프트. 작성 중 입력·시스템 프롬프트·프로젝트 전체·첨부 원문 수집은 제외 |
| 보존 기간 | 미확정 제안 | 180일 제안. L-005에서 기간·삭제·기관 이동·안내 정책 확정 후 운영 적용 |
| 초기 모델 | 검증 후보 | 아래 9개. 기본 모델·호출 예산·활성화 목록은 I-053/I-055 결과로 확정 |
| 수집 시작점 | 계획 | 활성화 이후 새 요청. 과거 대화 소급 수집은 별도 결정 없이는 수행하지 않음 |
| 범위 밖 | 후속 | AI 자동 평가·학생 점수화·CSV 일괄 다운로드·교사의 학생 작품 수정·이미지 생성 모델 선택 UI |

## 초기 모델 후보

2026-10-11 조사 결과를 바탕으로 한 후보이며 구현 시 공식 목록과 실제 API 호환성을 다시 확인한다. 공급자별 직접 API를 추가하지 않고 기존 OpenRouter 연동을 재사용한다.

| 제조사 | 모델 | OpenRouter ID |
| --- | --- | --- |
| OpenAI | GPT-6.1 Sol | `openai/gpt-6.1-sol` |
| OpenAI | GPT-6 Luna | `openai/gpt-6-luna` |
| Anthropic | Claude Sonnet 5.5 | `anthropic/claude-sonnet-5.5` |
| Anthropic | Claude Haiku 5.5 | `anthropic/claude-haiku-5.5` |
| Grok | Grok 4.7 | `x-ai/grok-4.7` |
| Google | Gemini 3.8 Flash | `google/gemini-3.8-flash` |
| Google | Gemini 3.5 Flash-Lite | `google/gemini-3.5-flash-lite` |
| Qwen | Qwen 3.8-27B | `qwen/qwen3.8-27b` |
| DeepSeek | DeepSeek V4.1 Flash | `deepseek/deepseek-v4.1-flash` |

Qwen 3.8 Max Prime·Flash는 일반 목록에 있지만 조사 당시 OpenRouter의 ZDR(데이터 미보관) 목록에서 확인되지 않았다. ZDR 목록에 있는 Qwen 3.8-27B를 대안 후보로 두며 최신 모델 선택 요구의 제약을 명시한다. 기존 `data_collection: deny`, `zdr: true` 정책을 자동 완화하지 않는다. 모델 목록에 존재하는 것과 파일 수정 도구를 실제로 사용할 수 있는 것은 별도 검증한다.

근거: [OpenRouter 모델 목록](https://openrouter.ai/api/v1/models), [ZDR 모델 조회 조건](https://openrouter.ai/docs/api/api-reference/models/get-models), [OpenAI](https://developers.openai.com/api/docs/models), [Anthropic](https://platform.claude.com/docs/en/models/overview), [Grok 4.7](https://openrouter.ai/x-ai/grok-4.7), [Gemini](https://ai.google.dev/gemini-api/docs/models), [Qwen 최신 후보](https://openrouter.ai/qwen/qwen3.8-max-prime), [DeepSeek 발표](https://api-docs.deepseek.com/news/news260910/).

## 기존 구현과 연결

- 에디터 `src/components/editor-app.tsx`는 등록 모델 중 첫 번째 호환 모델을 자동 선택한다. `src/lib/server/config.ts`, `src/app/api/models/route.ts`, `src/lib/server/ai.ts`의 목록·가격·호출 계약을 확장한다.
- `editor_ai_messages`와 작품 snapshot은 대화를 저장하지만 대화 삭제 시 메시지도 삭제된다. 교사용 요청 기록은 보존 기간과 요청별 모델·처리 상태를 독립적으로 관리한다.
- `src/lib/observability.ts`의 서버 로그·Sentry는 ID 중심으로 유지한다. 학습 기록은 접근이 제한된 공유 DB에 저장한다.
- 라운지 `src/lib/management-scope.ts`의 활성 기관 멤버십·담당 반·학생 접근 검사를 재사용한다. `admin-menus.ts`와 `admin-access.ts`의 메뉴 및 경로 권한도 함께 반영한다.
- 기존 [I-034 / #44](https://github.com/quirinal36/letscoding-editor/issues/44)의 사용량·잔여 표시와 서버 허용 목록은 유지하며 6개 제조사 선택·호환성 확장은 E-12에서 추적한다.
- 기존 [F-004 / #57](https://github.com/quirinal36/letscoding-editor/issues/57)은 학생 **프로젝트** 읽기 전용 열람이다. 이번 E-14의 프롬프트 기록 조회 완료로 해당 이슈를 닫지 않는다.

## 마일스톤

### M7

**M7 — AI 모델 선택·프롬프트 학습 기록**

- 저장소: `quirinal36/letscoding-editor`
- 목표 및 완료 기준: 6개 제조사의 대표 모델 1~2개(총 6~12개)를 선택하고, 전송된 프롬프트·선택/실제 모델·처리 결과를 기록해 라운지 담당 교사 조회까지 통합 검증한다. E-12·E-13 및 라운지 E-14에 의존한다. 예산·ZDR·소유권 검사 유지, 로그 180일은 제안으로 운영 전 확정. 담당자·마감일 미지정.
- 에픽: [E-12](https://github.com/quirinal36/letscoding-editor/issues/73), [E-13](https://github.com/quirinal36/letscoding-editor/issues/74)

### LOUNGE-M7

**Editor M7 — AI 학습 기록·담당 교사 조회**

- 저장소: `yudanah/letscoding_lounge`
- 목표 및 완료 기준: E-14에서 프롬프트 기록 보존/삭제 정책, 공유 DB migration과 조회 API, 관리자 AI 학습 기록 화면을 구현한다. 선생님은 현재 담당 학생의 해당 기관 기록, 기관 관리자는 자기 기관, 플랫폼 관리자는 전체 조회. 에디터 M7과 계약·통합 인수를 연결한다. 180일 보존은 미확정 제안. 담당자·마감일 미지정.
- 에픽: [E-14](https://github.com/yudanah/letscoding_lounge/issues/219)

## 에픽과 하위 이슈 개요

| 에픽 | 저장소 | 하위 이슈 | 목표 |
| --- | --- | --- | --- |
| [E-12](https://github.com/quirinal36/letscoding-editor/issues/73) — 최신 AI 모델 선택·호환성·예산 통제 | letscoding-editor | [I-053](https://github.com/quirinal36/letscoding-editor/issues/75), [I-054](https://github.com/quirinal36/letscoding-editor/issues/76), [I-055](https://github.com/quirinal36/letscoding-editor/issues/77) | 학생이 6개 제조사의 대표 모델을 선택하고 서버가 호환성·데이터 정책·예산을 검증한다. |
| [E-13](https://github.com/quirinal36/letscoding-editor/issues/74) — 프롬프트 요청 기록·학생 안내·통합 인수 | letscoding-editor | [I-056](https://github.com/quirinal36/letscoding-editor/issues/78), [I-057](https://github.com/quirinal36/letscoding-editor/issues/79), [I-058](https://github.com/quirinal36/letscoding-editor/issues/80) | 전송한 프롬프트와 요청 결과를 누락·중복 없이 기록하고 교사 조회까지 검증한다. |
| [E-14](https://github.com/yudanah/letscoding_lounge/issues/219) — 라운지 AI 학습 기록 DB·담당 교사 조회 | letscoding_lounge | [L-005](https://github.com/yudanah/letscoding_lounge/issues/220), [L-006](https://github.com/yudanah/letscoding_lounge/issues/221), [L-007](https://github.com/yudanah/letscoding_lounge/issues/222), [L-008](https://github.com/yudanah/letscoding_lounge/issues/223) | 라운지가 공유 DB migration을 소유하고 관리자 화면에서 권한 범위에 맞는 학생 프롬프트 조회를 제공한다. |

| 키 | 작업 | 에픽 | 선행 |
| --- | --- | --- | --- |
| [I-053](https://github.com/quirinal36/letscoding-editor/issues/75) | 6개 제조사 모델 카탈로그·최신 후보·ZDR 호환성 검증 | [E-12](https://github.com/quirinal36/letscoding-editor/issues/73) | 없음 |
| [I-054](https://github.com/quirinal36/letscoding-editor/issues/76) | 사용자별 AI 모델 선택 드롭다운 | [E-12](https://github.com/quirinal36/letscoding-editor/issues/73) | [I-053](https://github.com/quirinal36/letscoding-editor/issues/75) |
| [I-055](https://github.com/quirinal36/letscoding-editor/issues/77) | 선택 모델 서버 검증·도구 호환·예산 정산 | [E-12](https://github.com/quirinal36/letscoding-editor/issues/73) | [I-053](https://github.com/quirinal36/letscoding-editor/issues/75) |
| [L-005](https://github.com/yudanah/letscoding_lounge/issues/220) | AI 학습 기록 보존·삭제·열람 안내 정책 확정 | [E-14](https://github.com/yudanah/letscoding_lounge/issues/219) | 없음 |
| [L-006](https://github.com/yudanah/letscoding_lounge/issues/221) | AI 요청 기록 공유 DB·권한·보존 정리 계약 | [E-14](https://github.com/yudanah/letscoding_lounge/issues/219) | [L-005](https://github.com/yudanah/letscoding_lounge/issues/220) |
| [I-056](https://github.com/quirinal36/letscoding-editor/issues/78) | 프롬프트 서버 기록·요청 상태·재시도 연결 | [E-13](https://github.com/quirinal36/letscoding-editor/issues/74) | [L-006](https://github.com/yudanah/letscoding_lounge/issues/221), [I-055](https://github.com/quirinal36/letscoding-editor/issues/77) |
| [I-057](https://github.com/quirinal36/letscoding-editor/issues/79) | 프롬프트 기록 안내·비밀값 마스킹·삭제 UX | [E-13](https://github.com/quirinal36/letscoding-editor/issues/74) | [L-005](https://github.com/yudanah/letscoding_lounge/issues/220), [I-056](https://github.com/quirinal36/letscoding-editor/issues/78) |
| [L-007](https://github.com/yudanah/letscoding_lounge/issues/222) | 담당 학생 AI 기록 조회 API·기관 격리 | [E-14](https://github.com/yudanah/letscoding_lounge/issues/219) | [L-006](https://github.com/yudanah/letscoding_lounge/issues/221) |
| [L-008](https://github.com/yudanah/letscoding_lounge/issues/223) | 라운지 관리자 AI 학습 기록 목록·상세 화면 | [E-14](https://github.com/yudanah/letscoding_lounge/issues/219) | [L-007](https://github.com/yudanah/letscoding_lounge/issues/222) |
| [I-058](https://github.com/quirinal36/letscoding-editor/issues/80) | 모델 선택·교사 학습 기록 통합 인수·운영 전환 | [E-13](https://github.com/quirinal36/letscoding-editor/issues/74) | [I-054](https://github.com/quirinal36/letscoding-editor/issues/76), [I-055](https://github.com/quirinal36/letscoding-editor/issues/77), [I-057](https://github.com/quirinal36/letscoding-editor/issues/79), [L-008](https://github.com/yudanah/letscoding_lounge/issues/223) |

## 진행 순서

1. I-053 모델 검증과 L-005 보존·열람 정책 결정을 시작한다.
2. 모델 경로: I-053 → I-054 드롭다운 및 I-055 서버 호환·예산 검사.
3. 기록 경로: L-005 → L-006 공유 DB → I-056 기록 및 L-007 조회 API.
4. I-056 → I-057 학생 안내·비밀값 처리, L-007 → L-008 관리자 화면.
5. I-054·I-055·I-057·L-008 → I-058 양쪽 통합 인수·운영 전환.

L-006의 DB/API 계약을 확정한 뒤 에디터 기록과 라운지 조회 구현을 진행한다. 소속 정보가 없거나 불명확한 기록을 다른 기관에 노출하지 않으며 정책 미확정 상태에서 운영 로그 수집을 켜지 않는다.

## E-12

**[EPIC] E-12 — 최신 AI 모델 선택·호환성·예산 통제**

- 저장소: `quirinal36/letscoding-editor`
- 마일스톤: [M7](https://github.com/quirinal36/letscoding-editor/milestone/8)
- 라벨: `type:epic`, `priority:P0`
- 목표: 학생이 6개 제조사의 대표 모델을 선택하고 서버가 호환성·데이터 정책·예산을 검증한다.

### 자식 이슈

- [ ] [I-053](https://github.com/quirinal36/letscoding-editor/issues/75) — 6개 제조사 모델 카탈로그·최신 후보·ZDR 호환성 검증
- [ ] [I-054](https://github.com/quirinal36/letscoding-editor/issues/76) — 사용자별 AI 모델 선택 드롭다운
- [ ] [I-055](https://github.com/quirinal36/letscoding-editor/issues/77) — 선택 모델 서버 검증·도구 호환·예산 정산

### 완료 기준

- [ ] 제조사별 1~2개·총 6~12개 허용 목록과 사용자별 선택이 동작한다.
- [ ] 활성 후보별 파일 도구·스트리밍·첨부·예약/정산 검증을 마친다.
- [ ] 모델 ID 변조·폐기·정책 미지원·예산 초과를 서버가 차단한다.

## E-13

**[EPIC] E-13 — 프롬프트 요청 기록·학생 안내·통합 인수**

- 저장소: `quirinal36/letscoding-editor`
- 마일스톤: [M7](https://github.com/quirinal36/letscoding-editor/milestone/8)
- 라벨: `type:epic`, `priority:P0`
- 목표: 전송한 프롬프트와 요청 결과를 누락·중복 없이 기록하고 교사 조회까지 검증한다.

### 자식 이슈

- [ ] [I-056](https://github.com/quirinal36/letscoding-editor/issues/78) — 프롬프트 서버 기록·요청 상태·재시도 연결
- [ ] [I-057](https://github.com/quirinal36/letscoding-editor/issues/79) — 프롬프트 기록 안내·비밀값 마스킹·삭제 UX
- [ ] [I-058](https://github.com/quirinal36/letscoding-editor/issues/80) — 모델 선택·교사 학습 기록 통합 인수·운영 전환

### 완료 기준

- [ ] 유료 호출 전에 기록하며 모든 정상 전송 경로와 성공·거절·오류·중단을 구분한다.
- [ ] 학생 안내·마스킹·보존 정책이 반영되고 일반 운영 로그에는 원문이 노출되지 않는다.
- [ ] E-12·E-14 결과를 연결한 통합 인수와 운영 전환 기준이 충족된다.

## E-14

**[EPIC] E-14 — 라운지 AI 학습 기록 DB·담당 교사 조회**

- 저장소: `yudanah/letscoding_lounge`
- 마일스톤: [LOUNGE-M7](https://github.com/yudanah/letscoding_lounge/milestone/7)
- 라벨: `type:epic`, `priority:P0`
- 목표: 라운지가 공유 DB migration을 소유하고 관리자 화면에서 권한 범위에 맞는 학생 프롬프트 조회를 제공한다.

### 자식 이슈

- [ ] [L-005](https://github.com/yudanah/letscoding_lounge/issues/220) — AI 학습 기록 보존·삭제·열람 안내 정책 확정
- [ ] [L-006](https://github.com/yudanah/letscoding_lounge/issues/221) — AI 요청 기록 공유 DB·권한·보존 정리 계약
- [ ] [L-007](https://github.com/yudanah/letscoding_lounge/issues/222) — 담당 학생 AI 기록 조회 API·기관 격리
- [ ] [L-008](https://github.com/yudanah/letscoding_lounge/issues/223) — 라운지 관리자 AI 학습 기록 목록·상세 화면

### 완료 기준

- [ ] 보존/삭제 정책과 라운지 소유 DB 계약이 확정되고 구현된다.
- [ ] 담당 교사·기관 관리자·플랫폼 관리자의 범위를 목록·상세·직접 API에서 동일하게 검사한다.
- [ ] 다른 기관/비담당 학생 접근, 기관 이동, 권한 회수와 대화 삭제의 보존 동작을 검증한다.

## 하위 이슈 상세

### I-053

**I-053 — 6개 제조사 모델 카탈로그·최신 후보·ZDR 호환성 검증**

- 저장소: `quirinal36/letscoding-editor`
- 부모 에픽: [E-12](https://github.com/quirinal36/letscoding-editor/issues/73)
- 마일스톤: [M7](https://github.com/quirinal36/letscoding-editor/milestone/8)
- 라벨: `type:spike`, `priority:P0`
- 선행: 없음
- 관련 위치: `src/lib/server/config.ts`, `src/app/api/models/route.ts`, `src/lib/types.ts`
- 기존 이슈: [letscoding-editor/issues/44](https://github.com/quirinal36/letscoding-editor/issues/44)

기존 config.models, /api/models와 OpenRouter 연동을 재사용해 제조사별 대표 모델 1~2개, 전체 6~12개의 서버 허용 목록을 정의한다. 2026-10-11 조사 후보 9개는 아래 모델 표를 기준으로 하되 활성화 전에 재확인한다.

**완료 기준**

- [ ] OpenAI·Anthropic·Grok·Gemini·Qwen·DeepSeek마다 후보와 정확한 OpenRouter ID, 확인일, 이미지 입력·도구 호출 지원 및 ZDR 가용성을 기록한다.
- [ ] 최신 Qwen 3.8 Max Prime·Flash의 ZDR 미확인을 숨기지 않고, Qwen 3.8-27B를 정책 충족 대안으로 검증한다. 최신 후보 지원 시 교체 조건을 명시한다.
- [ ] 새 모델은 자동 활성화하지 않는다. 최신 목록·가격 갱신 주기, 허용 목록 갱신 담당 절차, 폐기 모델·메타데이터 장애 처리와 기본 모델 선택을 정의한다.
- [ ] 초기 9개는 후보이며 모델별 유료 검증 예산·기본 모델·기능 활성화는 별도 확정한다. 비밀키만 설정해 AI를 활성화하지 않는다.

**검증 방법:** 공개 메타데이터 fixture로 누락·폐기·ZDR 미지원·가격 오류·도구 미지원 모델을 검사한다. 외부 모델 호출 전 예산·모델·기능 설정을 확인한다.

### I-054

**I-054 — 사용자별 AI 모델 선택 드롭다운**

- 저장소: `quirinal36/letscoding-editor`
- 부모 에픽: [E-12](https://github.com/quirinal36/letscoding-editor/issues/73)
- 마일스톤: [M7](https://github.com/quirinal36/letscoding-editor/milestone/8)
- 라벨: `type:feature`, `priority:P1`
- 선행: [I-053](https://github.com/quirinal36/letscoding-editor/issues/75)
- 관련 위치: `src/components/editor-app.tsx`, `src/lib/client.ts`, `src/lib/types.ts`, `tests/e2e`
- 기존 이슈: [letscoding-editor/issues/44](https://github.com/quirinal36/letscoding-editor/issues/44)

프롬프트 입력창 주변에 제조사별 모델 드롭다운을 추가하고 첫 번째 모델 자동 선택을 사용자의 명시적 선택으로 바꾼다.

**완료 기준**

- [ ] 서버 허용 목록에서 6개 제조사별 대표 모델 1~2개, 총 6~12개를 표시하고 모델명·이미지 지원·비용 수준을 확인할 수 있다.
- [ ] 선택 모델 ID가 chat 요청에 전달되며 진행 중 요청의 모델은 바뀌지 않는다. 요청 중 선택 조작은 비활성화한다.
- [ ] 마지막 선택은 사용자별로 기억하고 다른 계정으로 넘어가지 않는다. 선택했던 모델이 없어지면 사용 가능한 기본값과 변경 안내를 표시한다.
- [ ] 이미지 첨부와 호환되지 않는 모델은 전송 전 안내한다. 데모·AI 비활성·목록 로딩/실패·키보드 선택을 처리한다.

**검증 방법:** E2E에서 모델 변경 후 실제 요청 ID, 새로고침 선택 유지, 계정 전환, 폐기 모델, 첨부 충돌, 요청 중 잠금 및 접근성을 검증한다.

### I-055

**I-055 — 선택 모델 서버 검증·도구 호환·예산 정산**

- 저장소: `quirinal36/letscoding-editor`
- 부모 에픽: [E-12](https://github.com/quirinal36/letscoding-editor/issues/73)
- 마일스톤: [M7](https://github.com/quirinal36/letscoding-editor/milestone/8)
- 라벨: `type:feature`, `priority:P0`
- 선행: [I-053](https://github.com/quirinal36/letscoding-editor/issues/75)
- 관련 위치: `src/lib/server/ai.ts`, `src/lib/server/config.ts`, `src/lib/server/repository.ts`, `tests/core.test.ts`
- 기존 이슈: [letscoding-editor/issues/41](https://github.com/quirinal36/letscoding-editor/issues/41), [letscoding-editor/issues/44](https://github.com/quirinal36/letscoding-editor/issues/44)

공통 AI 호출부에서 허용 모델, 도구 스트리밍, 이미지 입력, 추론 옵션 및 모델별 비용 계산을 검증한다. 기존 예산 예약·정산을 재사용한다.

**완료 기준**

- [ ] 클라이언트 모델 ID 변조·비허용·폐기·ZDR 미지원·가격 확인 실패를 서버가 거부한다.
- [ ] 활성 후보마다 파일 읽기·부분 수정·변경안 승인·스트리밍 중단이 동일한 계약으로 동작한다. 기존 Luna 등 모델별 옵션과 오류 처리를 보존한다.
- [ ] 모델별 입력·출력·추론·구간별 가격을 반영해 예약·정산을 검증하고 일일·월간·턴 한도를 우회하지 못한다. 불확실한 비용을 0원으로 확정하지 않는다.
- [ ] 실제 사용 모델을 식별할 수 있게 요청 기록에 연결하고 다른 모델로 조용히 전환하지 않는다. 모델 장애 중 편집·저장 기능은 사용할 수 있다.

**검증 방법:** 변조 요청, 과금 예약 경쟁, 가격 변경, 중단·타임아웃·정산 실패를 모의 검사한다. 승인된 후보와 예산으로 모델별 실제 도구 호출을 소규모 검증한다.

### L-005

**L-005 — AI 학습 기록 보존·삭제·열람 안내 정책 확정**

- 저장소: `yudanah/letscoding_lounge`
- 부모 에픽: [E-14](https://github.com/yudanah/letscoding_lounge/issues/219)
- 마일스톤: [LOUNGE-M7](https://github.com/yudanah/letscoding_lounge/milestone/7)
- 라벨: `type:task`, `priority:P0`
- 선행: 없음
- 관련 위치: `docs/17-privacy-and-consent.md`, `docs/08-user-permissions.md`
- 기존 이슈: [letscoding-editor/issues/52](https://github.com/quirinal36/letscoding-editor/issues/52), [letscoding-editor/issues/57](https://github.com/quirinal36/letscoding-editor/issues/57)

사용자가 전송한 프롬프트의 학습 기록 정책을 확정한다. 제조사별 1~2개·총 6~12개와 담당 교사만 열람은 사용자 확정사항이며 다시 결정하지 않는다.

**완료 기준**

- [ ] 로그 보존 180일은 제안값임을 명시하고 운영 적용 전 보존 기간·기산점·정리 담당·탈퇴/삭제 처리 기준을 확정한다.
- [ ] 전송된 프롬프트가 기록 대상이며 작성 중 입력은 수집하지 않는다. 기존 대화·작품 삭제와 별도 학습 기록의 보존 관계를 학생 안내에 명시한다.
- [ ] 선생님은 현재 담당 학생의 해당 기관 기록, 기관 관리자는 자기 기관 기록, 플랫폼 관리자는 전체 기록이라는 역할별 범위를 확정 문구로 남긴다.
- [ ] 반 이동·기관 이동·담당 교사 변경·비활성 기관/멤버십·소속 미확인 처리와 과거 기록 소급 수집 여부를 정의한다. 기본안은 기능 활성화 이후 기록만 수집한다.
- [ ] 필요한 학생/보호자 안내·동의 절차를 기존 라운지 체계와 대조한다. 보존 기간이 확정되기 전 운영 수집·정리 작업을 활성화하지 않는다.

**검증 방법:** 정책 결정자·일자·선택값·적용 범위와 화면 안내 문구를 이슈에 기록하고 권한/삭제 시나리오 표로 대조한다.

### L-006

**L-006 — AI 요청 기록 공유 DB·권한·보존 정리 계약**

- 저장소: `yudanah/letscoding_lounge`
- 부모 에픽: [E-14](https://github.com/yudanah/letscoding_lounge/issues/219)
- 마일스톤: [LOUNGE-M7](https://github.com/yudanah/letscoding_lounge/milestone/7)
- 라벨: `type:task`, `database`, `security`, `priority:P0`
- 선행: [L-005](https://github.com/yudanah/letscoding_lounge/issues/220)
- 관련 위치: `supabase/migrations/`, `src/lib/management-scope.ts`

라운지 소유 migration으로 editor.editor_ai_requests(가칭)와 서버 전용 기록·조회 계약을 추가한다. 학생이 삭제할 수 있는 대화 메시지와 별도로 요청 이력을 보존한다.

**완료 기준**

- [ ] 요청 ID, 사용자·전송 당시 기관/반·작품·대화 ID, 마스킹된 프롬프트, 요청 종류, 선택/실제 모델, 서버 시각, 상태·종료 시각을 정의한다. 비용·토큰은 확인 가능한 기존 정산 기록에 연결한다.
- [ ] 사용자·소유권·기관 관계는 인증된 서버에서 결정한다. 요청 ID의 사용자별 유일성과 내용 일치를 검증해 중복 요청·기록·과금을 방지한다.
- [ ] 학생이 기록을 임의 생성·수정·삭제하거나 다른 학생 기록을 직접 읽을 수 없다. RLS/GRANT와 서비스 역할을 사용하는 서버의 범위 검사를 함께 검증한다.
- [ ] 대화·작품 삭제로 보존 대상이 자동 cascade 삭제되지 않도록 FK/식별자 정책을 정의하고, 계정 탈퇴 및 만료 기록은 확정한 정책에 따라 정리한다.
- [ ] 기관·학생·시각 인덱스와 커서 페이지 조회를 준비한다. migration은 라운지 원장에만 적용하고 에디터 integration SQL은 계약 검토 자료로만 취급한다.

**검증 방법:** 라운지 DB 검사에서 중복·위조·삭제·기간 만료·다른 기관/학생 격리를 검증한다. migration 적용/롤백 및 반복 정리의 결과를 기록한다.

### I-056

**I-056 — 프롬프트 서버 기록·요청 상태·재시도 연결**

- 저장소: `quirinal36/letscoding-editor`
- 부모 에픽: [E-13](https://github.com/quirinal36/letscoding-editor/issues/74)
- 마일스톤: [M7](https://github.com/quirinal36/letscoding-editor/milestone/8)
- 라벨: `type:feature`, `priority:P0`
- 선행: [L-006](https://github.com/yudanah/letscoding_lounge/issues/221), [I-055](https://github.com/quirinal36/letscoding-editor/issues/77)
- 관련 위치: `src/app/api/editor/route.ts`, `src/lib/server/ai.ts`, `src/lib/server/image.ts`, `src/lib/server/repository.ts`, `src/lib/client.ts`, `tests/core.test.ts`
- 기존 이슈: [letscoding-editor/issues/35](https://github.com/quirinal36/letscoding-editor/issues/35)

인증·입력 형식·작품/대화 소유권 확인 뒤 유료 호출 전에 요청 기록을 만들고 완료·거절·오류·중단 결과를 연결한다.

**완료 기준**

- [ ] 일반 chat, 직접 이미지 생성 prompt, 채팅의 무료 ZIP/정책 작업 등 사용자가 전송한 프롬프트 경로를 빠짐없이 구분한다. 모델 미호출이면 실제 모델·비용은 미호출로 표시한다.
- [ ] 정상 입력의 예산 초과·정책 거절·모델 실패도 기록한다. 인증/소유권 실패나 비정상 크기의 요청 본문을 학습 기록에 저장하지 않는다.
- [ ] 초기 기록 저장 실패 시 유료 호출을 시작하지 않고 재시도를 안내한다. 동일 요청 ID/내용의 재전송은 유료 호출을 중복 실행하지 않는다.
- [ ] 스트리밍 종료·사용자 중단·타임아웃·프로세스 종료 후 결과 미확정 상태와 복구 기준을 정의한다. 결과 저장 실패를 완료로 표시하거나 과금을 임의 취소하지 않는다.
- [ ] 선택 모델·실제 모델·대화 메시지·예산 예약을 요청 ID로 연결한다. 계정/기관 정보는 클라이언트 입력을 신뢰하지 않는다.

**검증 방법:** 로그 저장 실패, 거절/예산 초과, 스트리밍 중단, 중복 재전송, 결과 저장 유실, 직접 이미지 요청과 무료 요청의 기록을 모의 API로 검증한다.

### I-057

**I-057 — 프롬프트 기록 안내·비밀값 마스킹·삭제 UX**

- 저장소: `quirinal36/letscoding-editor`
- 부모 에픽: [E-13](https://github.com/quirinal36/letscoding-editor/issues/74)
- 마일스톤: [M7](https://github.com/quirinal36/letscoding-editor/milestone/8)
- 라벨: `type:feature`, `priority:P0`
- 선행: [L-005](https://github.com/yudanah/letscoding_lounge/issues/220), [I-056](https://github.com/quirinal36/letscoding-editor/issues/78)
- 관련 위치: `src/components/editor-app.tsx`, `src/lib/observability.ts`, `docs/06-teacher-guide.md`, `tests/e2e`

학생에게 담당 교사가 전송한 프롬프트를 조회한다는 점과 확정된 보존 기간을 안내하고, 기록에 불필요한 비밀정보를 포함하지 않는다.

**완료 기준**

- [ ] 프롬프트 전송 화면과 대화/작품 삭제 화면에 조회 대상·보존 기간·삭제의 실제 효과를 일관되게 안내한다.
- [ ] 식별 가능한 API 키·관리자 키·인증 토큰을 기록 전에 마스킹한다. 시스템 프롬프트·자동 첨부 프로젝트 전체·첨부파일 원문은 학습 로그에 복사하지 않는다.
- [ ] 기존 Sentry/콘솔 ID 중심 로그를 유지하며 새 학습 로그 원문·키·이메일을 일반 로그나 오류 응답에 노출하지 않는다.
- [ ] 데모에서는 운영 기록으로 오인시키지 않고, 기록 실패 안내 후 사용자가 입력을 잃지 않고 다시 전송할 수 있다.

**검증 방법:** 비밀값 fixture의 DB/로그/오류 비노출, 학생 안내, 대화 삭제 이후 보존 정책, 데모·저장 실패 화면을 단위 검사와 E2E로 확인한다.

### L-007

**L-007 — 담당 학생 AI 기록 조회 API·기관 격리**

- 저장소: `yudanah/letscoding_lounge`
- 부모 에픽: [E-14](https://github.com/yudanah/letscoding_lounge/issues/219)
- 마일스톤: [LOUNGE-M7](https://github.com/yudanah/letscoding_lounge/milestone/7)
- 라벨: `type:task`, `security`, `priority:P0`
- 선행: [L-006](https://github.com/yudanah/letscoding_lounge/issues/221)
- 관련 위치: `src/lib/management-scope.ts`, `src/lib/admin-org-context.ts`, `src/app/api/admin/`
- 기존 이슈: [letscoding-editor/issues/57](https://github.com/quirinal36/letscoding-editor/issues/57)

기존 getManagementScope·getAccessibleStudentIds·canAccessStudent 및 기관 컨텍스트를 재사용해 AI 학습 기록의 목록·상세 조회 API를 구현한다.

**완료 기준**

- [ ] 선생님은 현재 담당 학생의 해당 기관 기록만, 기관 관리자는 자기 기관만, 플랫폼 관리자는 전체를 조회한다. 역할 이름만으로 전체 열람을 허용하지 않는다.
- [ ] 전송 당시 기관 ID와 현재 조회 권한을 함께 검사해 학생의 기관 이동으로 이전 기관 기록이 새 기관에 노출되지 않는다. 담당 변경과 멤버십 종료를 즉시 반영한다.
- [ ] 목록과 상세 모두 같은 권한 조건을 사용한다. 기관·학생·반·요청 ID를 바꾸는 직접 요청, 빈 담당 목록, 기관 미확인 기록은 허용 범위가 넓어지지 않는다.
- [ ] 기간·반·학생·모델·상태 필터와 제한된 페이지 크기/커서를 제공한다. 응답은 필요한 필드만 반환하고 공유 캐시에 저장하지 않는다.

**검증 방법:** 플랫폼 관리자·기관 관리자·담당 교사·비담당 교사·학생·비로그인 계정의 허용/거부 매트릭스와 ID 변조, 기관/반 이동, 권한 회수, 페이지 경계를 검사한다.

### L-008

**L-008 — 라운지 관리자 AI 학습 기록 목록·상세 화면**

- 저장소: `yudanah/letscoding_lounge`
- 부모 에픽: [E-14](https://github.com/yudanah/letscoding_lounge/issues/219)
- 마일스톤: [LOUNGE-M7](https://github.com/yudanah/letscoding_lounge/milestone/7)
- 라벨: `type:task`, `priority:P1`
- 선행: [L-007](https://github.com/yudanah/letscoding_lounge/issues/222)
- 관련 위치: `src/lib/admin-menus.ts`, `src/lib/admin-access.ts`, `src/app/admin/`, `src/components/admin/`

라운지 관리자 화면에 AI 학습 기록 메뉴와 조회 화면을 추가한다. 선생님은 기존 관리자 영역에서 자기 담당 학생의 기록을 읽는다.

**완료 기준**

- [ ] admin-menus와 교사 접근 경로 허용 목록을 함께 연결해 메뉴 진입과 직접 URL 접근이 일치한다.
- [ ] 목록에 시간·학생·작품·모델·프롬프트 일부·처리 상태를 표시하고 기간·반·학생·모델·상태 필터와 페이지 이동을 제공한다.
- [ ] 상세에서 마스킹된 프롬프트 전체, 선택/실제 모델, 처리 결과를 확인한다. 프롬프트의 HTML/스크립트는 실행하지 않는다.
- [ ] 로딩·빈 결과·권한 없음·조회 실패·재시도·키보드 접근을 처리한다. 기관 전환 시 이전 기관 기록을 화면에 남기지 않는다.
- [ ] 라운지 .design/에 해당 화면의 목업이 있는지 확인하고 기존 관리자 UI 컴포넌트와 표시 규칙을 재사용한다.

**검증 방법:** 역할별 메뉴/직접 진입, 필터·페이지·상세, 기관 전환, 긴 프롬프트·XSS fixture, 빈 결과와 장애를 브라우저 검사한다.

### I-058

**I-058 — 모델 선택·교사 학습 기록 통합 인수·운영 전환**

- 저장소: `quirinal36/letscoding-editor`
- 부모 에픽: [E-13](https://github.com/quirinal36/letscoding-editor/issues/74)
- 마일스톤: [M7](https://github.com/quirinal36/letscoding-editor/milestone/8)
- 라벨: `type:task`, `priority:P0`
- 선행: [I-054](https://github.com/quirinal36/letscoding-editor/issues/76), [I-055](https://github.com/quirinal36/letscoding-editor/issues/77), [I-057](https://github.com/quirinal36/letscoding-editor/issues/79), [L-008](https://github.com/yudanah/letscoding_lounge/issues/223)
- 관련 위치: `tests/`, `docs/04-human-review.md`, `docs/06-teacher-guide.md`, `docs/07-live-verification.md`

모델 선택부터 요청 기록, 담당 선생님의 라운지 조회까지 두 저장소의 기능을 함께 인수한다.

**완료 기준**

- [ ] 학생이 선택 모델로 전송한 기록이 정확히 한 건 생성되고 담당 선생님의 목록·상세에 올바르게 표시된다.
- [ ] 정상·거절·오류·중단·재시도·기록 장애·정산 미확정·대화 삭제·담당/기관 변경을 통합 검증한다.
- [ ] 에디터 npm run check, npm run build, npm run test:e2e 및 라운지 해당 DB·권한·UI 필수 검사가 통과하고 테스트 fixture를 새 API 계약과 맞춘다.
- [ ] 활성화할 각 모델을 확정 예산 내 실제 호출로 검사하고 모델 ID·사용량·결과만 증거로 남긴다. 학생 프롬프트 원문과 비밀값은 이슈에 붙이지 않는다.
- [ ] 라운지 migration/조회 API → 에디터 기록/선택 기능 → 관리자 메뉴 순으로 배포 계약을 맞춘다. 초기화·정리·롤백에서 기존 기록을 잃지 않는 절차와 교사 안내를 남긴다.
- [ ] 180일 보존 제안, 기본 모델·비용 한도 등 미확정 항목을 구현 완료로 간주하지 않고 운영 활성화 전 결정 기록을 확인한다.

**검증 방법:** 격리된 시험 학생 2명·담당/비담당 교사·기관 관리자·플랫폼 관리자와 시험 기관을 사용해 종단 시나리오와 회귀 검사를 수행한다.

## 등록 및 검증 기준

- 위 준비 키를 실제 GitHub 번호로 바꾸어 에픽의 자식 체크리스트와 하위 이슈의 부모·선행 의존성을 상호 연결한다.
- 기존 이슈의 완료 상태는 변경하지 않는다. #44·#57에는 새 추적 범위와 참고 링크를 추가한다.
- 등록 후 제목·본문·라벨·마일스톤·열림 상태와 상호 링크를 다시 읽어 확인한다. 실제 번호는 [등록 결과](registered.md)와 [JSON 대응표](github-registration.json)에 기록한다.
- 구현 검증: 에디터 `npm run check`, `npm run build`, `npm run test:e2e`와 라운지의 해당 DB·권한·UI 검사. 실제 모델 검증은 확정된 모델·예산·활성화 설정 안에서 수행한다.


## 실제 GitHub 등록

| 준비 키 | 실제 GitHub | 제목 |
| --- | --- | --- |
| M7 | [quirinal36/letscoding-editor milestone/8](https://github.com/quirinal36/letscoding-editor/milestone/8) | M7 — AI 모델 선택·프롬프트 학습 기록 |
| LOUNGE-M7 | [yudanah/letscoding_lounge milestone/7](https://github.com/yudanah/letscoding_lounge/milestone/7) | Editor M7 — AI 학습 기록·담당 교사 조회 |
| E-12 | [quirinal36/letscoding-editor #73](https://github.com/quirinal36/letscoding-editor/issues/73) | [EPIC] E-12 — 최신 AI 모델 선택·호환성·예산 통제 |
| E-13 | [quirinal36/letscoding-editor #74](https://github.com/quirinal36/letscoding-editor/issues/74) | [EPIC] E-13 — 프롬프트 요청 기록·학생 안내·통합 인수 |
| E-14 | [yudanah/letscoding_lounge #219](https://github.com/yudanah/letscoding_lounge/issues/219) | [EPIC] E-14 — 라운지 AI 학습 기록 DB·담당 교사 조회 |
| I-053 | [quirinal36/letscoding-editor #75](https://github.com/quirinal36/letscoding-editor/issues/75) | I-053 — 6개 제조사 모델 카탈로그·최신 후보·ZDR 호환성 검증 |
| I-054 | [quirinal36/letscoding-editor #76](https://github.com/quirinal36/letscoding-editor/issues/76) | I-054 — 사용자별 AI 모델 선택 드롭다운 |
| I-055 | [quirinal36/letscoding-editor #77](https://github.com/quirinal36/letscoding-editor/issues/77) | I-055 — 선택 모델 서버 검증·도구 호환·예산 정산 |
| L-005 | [yudanah/letscoding_lounge #220](https://github.com/yudanah/letscoding_lounge/issues/220) | L-005 — AI 학습 기록 보존·삭제·열람 안내 정책 확정 |
| L-006 | [yudanah/letscoding_lounge #221](https://github.com/yudanah/letscoding_lounge/issues/221) | L-006 — AI 요청 기록 공유 DB·권한·보존 정리 계약 |
| I-056 | [quirinal36/letscoding-editor #78](https://github.com/quirinal36/letscoding-editor/issues/78) | I-056 — 프롬프트 서버 기록·요청 상태·재시도 연결 |
| I-057 | [quirinal36/letscoding-editor #79](https://github.com/quirinal36/letscoding-editor/issues/79) | I-057 — 프롬프트 기록 안내·비밀값 마스킹·삭제 UX |
| L-007 | [yudanah/letscoding_lounge #222](https://github.com/yudanah/letscoding_lounge/issues/222) | L-007 — 담당 학생 AI 기록 조회 API·기관 격리 |
| L-008 | [yudanah/letscoding_lounge #223](https://github.com/yudanah/letscoding_lounge/issues/223) | L-008 — 라운지 관리자 AI 학습 기록 목록·상세 화면 |
| I-058 | [quirinal36/letscoding-editor #80](https://github.com/quirinal36/letscoding-editor/issues/80) | I-058 — 모델 선택·교사 학습 기록 통합 인수·운영 전환 |

## 2026-10-12 구현 연결

에디터 #73·#74 및 라운지 DB/조회 연동 코드를 구현했다. [구현 결과·검증·2026-10-13 오전 인수](../11-ai-models-learning-logs-handoff.md)를 참조한다. 보존 기간·실모델/실계정 인수·운영 전환은 별도이며, 초기 계획의 미확정 항목을 승인한 것으로 처리하지 않았다.
