# 이슈 후보 본문

> 작성 기준: 2026-10-04 · 실제 GitHub 번호/담당자/기한 미지정
> 원문 기능 수용 기준은 Google Sheets를 그대로 연결했다. 추가 구현 기준은 준비 제안이다.
> 의존성은 선행 결과를 기다리는 관계다. 기본 일정과 달라지는 선행 작업은 준비 문서에 설명했다.

## I-001 — 착수 범위·계정·배포·데이터 소유 결정

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-00
- 마일스톤: M0
- 라벨 후보: `type:decision`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: A-01~A-05
- 선행 의존성: 없음

### 목적과 범위

착수 범위·계정·배포·데이터 소유 결정를 제공한다. A-01 원격은 확인됨. A-02~05를 결정 기록으로 남기고 라운지 마이그레이션 담당과 배포 계약 소유자를 지정한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

선택·근거·담당·날짜 및 영향받는 문서/이슈를 결정 기록에 남긴다. 아직 미확정인 값을 구현 완료로 표시하지 않는다.

## I-002 — AI 비용·모델·용량·첨부 보존·템플릿 정책 결정

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-00
- 마일스톤: M0
- 라벨 후보: `type:decision`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: A-06~A-10; E-04
- 선행 의존성: I-001

### 목적과 범위

AI 비용·모델·용량·첨부 보존·템플릿 정책 결정를 제공한다. 예산 단위·초과 동작·월 상한, 모델 4종, 프로젝트/파일 한도, 첨부 보존 및 삭제 시점을 결정한다. 기능명세서의 템플릿 3종을 채택할지 명시한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

선택·근거·담당·날짜 및 영향받는 문서/이슈를 결정 기록에 남긴다. 아직 미확정인 값을 구현 완료로 표시하지 않는다.

## I-003 — 문서 충돌과 MVP 완료 범위 확정

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-00
- 마일스톤: M0
- 라벨 후보: `type:decision`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: 계획 §3·§5·§8; PJ-07; E-10
- 선행 의존성: I-001, I-002

### 목적과 범위

문서 충돌과 MVP 완료 범위 확정를 제공한다. 준비 문서의 열린 결정 Q-01~Q-10에 답을 기록한다. P1·5단계 P2의 출시 포함 여부와 30일 보관 범위를 확정한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

선택·근거·담당·날짜 및 영향받는 문서/이슈를 결정 기록에 남긴다. 아직 미확정인 값을 구현 완료로 표시하지 않는다.

## I-004 — Monaco·언어 워커·채팅 UI·라이선스 검증

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-00
- 마일스톤: M0
- 라벨 후보: `type:spike`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: C-01, C-10, C-12
- 선행 의존성: I-001

### 목적과 범위

Monaco·언어 워커·채팅 UI·라이선스 검증를 제공한다. 학원 PC 사양·네트워크·측정 방법을 기록하고 첫 상호작용 3초 목표를 측정한다. 승인 카드 구현 가능성과 버전·라이선스 검토 결과를 남긴다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

작은 재현 실험과 사용 버전/모델/환경, 측정값, 성공·실패 및 대체안 결론을 남긴다. 실험 결과로 관련 기능 범위를 조정한다.

## I-005 — OpenRouter 도구 스트리밍·비전·이미지·턴 제한 검증

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-00
- 마일스톤: M0
- 라벨 후보: `type:spike`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: C-02~C-05
- 선행 의존성: I-002

### 목적과 범위

OpenRouter 도구 스트리밍·비전·이미지·턴 제한 검증를 제공한다. 선정 모델을 strict·deny·ZDR 옵션으로 검증하고 도구 5회 턴과 중단 동작을 기록한다. 이미지 출력 불가 시 AI-09를 후속으로 이동하는 결정안을 남긴다. 현재 가격·가용성·함수 제한은 실험 시 공식 자료로 재확인한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

작은 재현 실험과 사용 버전/모델/환경, 측정값, 성공·실패 및 대체안 결론을 남긴다. 실험 결과로 관련 기능 범위를 조정한다.

## I-006 — 미리보기 상대 경로·격리·브라우저 검증

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-00
- 마일스톤: M0
- 라벨 후보: `type:spike`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: C-06; PV-07
- 선행 의존성: I-001

### 목적과 범위

미리보기 상대 경로·격리·브라우저 검증를 제공한다. Service Worker와 Blob 방식을 비교하고 Chrome·Edge·Safari에서 자산 로딩과 인증 경계 검증 결과를 남긴다. sandbox만으로 API 접근 차단을 가정하지 않는다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

작은 재현 실험과 사용 버전/모델/환경, 측정값, 성공·실패 및 대체안 결론을 남긴다. 실험 결과로 관련 기능 범위를 조정한다.

## I-007 — 파일 저장·서명 업로드·ZIP 검증 계약 확인

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-00
- 마일스톤: M0
- 라벨 후보: `type:spike`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: C-07~C-09; B-05
- 선행 의존성: I-002

### 목적과 범위

파일 저장·서명 업로드·ZIP 검증 계약 확인를 제공한다. 텍스트 저장/편집/업로드 한도를 분리한다. HTML·이미지·하위 폴더 fixture가 검증을 통과하고 공유 검증기 소유·버전을 결정한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

작은 재현 실험과 사용 버전/모델/환경, 측정값, 성공·실패 및 대체안 결론을 남긴다. 실험 결과로 관련 기능 범위를 조정한다.

## I-008 — 저장소 규약·Next.js·환경변수·CI 뼈대

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-01
- 마일스톤: M0
- 라벨 후보: `type:task`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: D-0
- 선행 의존성: I-001

### 목적과 범위

저장소 규약·Next.js·환경변수·CI 뼈대를 제공한다. AGENTS.md·CLAUDE.md·.env.example과 빌드/검사 CI를 준비한다. 실제 비밀값을 포함하지 않고 서버 전용 키가 클라이언트에 노출되지 않음을 확인한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

산출물 또는 계약 문서를 검토하고 작업 기준의 성공·실패 사례 결과를 기록한다.

## I-009 — 공유 Auth 로그인·역할·비로그인 접근 차단

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-01
- 마일스톤: M0
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: AC-01 AC-02
- 문서 근거: D-0; A-03, A-05
- 선행 의존성: I-001, I-008

### 목적과 범위

공유 Auth 로그인·역할·비로그인 접근 차단를 제공한다. 같은 계정과 별개 오리진의 세션 동작을 구분하여 로그인/로그아웃 경로를 검증한다.

### 완료 기준

- [ ] AC-01 (Supabase Auth 로그인): 라운지 계정으로 바로 로그인된다 — 원문 단계 0, P0, [명세 68행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A68:J68)
- [ ] AC-02 (역할 인식): 비로그인 접근은 로그인 화면으로 간다 — 원문 단계 0, P0, [명세 69행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A69:J69)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-010 — editor 데이터 모델·RLS·비공개 Storage·VFS 저장 계약

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-01
- 마일스톤: M0
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: AC-03 PJ-03
- 문서 근거: D-0; E-04
- 선행 의존성: I-001, I-002, I-007, I-008

### 목적과 범위

editor 데이터 모델·RLS·비공개 Storage·VFS 저장 계약를 제공한다. 6개 editor 테이블과 버킷 정책을 정의한다. 파일·스레드·메시지·사용량·배포 이력의 소유자 경로를 명시한다. service-role 경로에도 JWT와 project/thread 소유권 검증을 적용하고 다른 사용자의 접근을 거절한다.

### 완료 기준

- [ ] AC-03 (RLS): 다른 사용자 ID로 조회하면 0건 — 원문 단계 0, P0, [명세 70행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A70:J70)
- [ ] PJ-03 (서버 저장): 다른 기기에서 열어도 같은 내용 — 원문 단계 0, P0, [명세 54행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A54:J54)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-011 — 프로젝트 목록·생성·이름 변경·삭제 보관

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-01
- 마일스톤: M0
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: PJ-01
- 문서 근거: D-0; Q-03
- 선행 의존성: I-010, I-003

### 목적과 범위

프로젝트 목록·생성·이름 변경·삭제 보관를 제공한다. soft delete 및 30일 정리 작업의 파일·대화·배포 연결 처리 범위를 확정하고 사용자 접근에서 삭제 프로젝트를 숨긴다.

### 완료 기준

- [ ] PJ-01 (프로젝트 목록): 삭제는 확인 후 30일 보관 — 원문 단계 0, P0, [명세 52행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A52:J52)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-012 — 3열 셸·패널 접기·프로젝트 바

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-01
- 마일스톤: M0
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: SH-01 SH-02 SH-04
- 문서 근거: D-0
- 선행 의존성: I-008, I-009

### 목적과 범위

3열 셸·패널 접기·프로젝트 바를 제공한다. 배포 버튼은 배포 구현 전 상태를 구분한다. 저장 상태는 VFS 변경 큐와 연결한다.

### 완료 기준

- [ ] SH-01 (3열 레이아웃): 1280px 이상에서 세 패널이 보이고 경계를 드래그해 폭이 바뀐다 — 원문 단계 0, P0, [명세 2행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A2:J2)
- [ ] SH-02 (패널 접기): 접은 상태가 새로고침 후 유지된다 — 원문 단계 0, P0, [명세 3행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A3:J3)
- [ ] SH-04 (프로젝트 바): 저장 중·저장됨·오류 상태가 구분된다 — 원문 단계 0, P0, [명세 5행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A5:J5)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-013 — 셸·Monaco·트리·채팅 공통 테마

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-01
- 마일스톤: M0
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: SH-03
- 문서 근거: 계획 §3
- 선행 의존성: I-012, I-004

### 목적과 범위

셸·Monaco·트리·채팅 공통 테마를 제공한다. 다크/라이트 토큰 적용과 테마 선택 저장 여부를 명시한다.

### 완료 기준

- [ ] SH-03 (다크·라이트 테마): 편집기·트리·채팅이 같은 테마로 바뀐다 — 원문 단계 0, P1, [명세 4행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A4:J4)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-014 — 파일 트리·생성·이름 변경·삭제·금지 파일 경고

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-02
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: EX-01 EX-02 EX-03 EX-04 EX-09
- 문서 근거: D-1
- 선행 의존성: I-010, I-012

### 목적과 범위

파일 트리·생성·이름 변경·삭제·금지 파일 경고를 제공한다. VFS 경로 정규화와 충돌 검사를 서버에도 적용한다. 이름 변경은 import 경로 안내 범위를 명시하며 자동 import 수정은 별도 결정한다.

### 완료 기준

- [ ] EX-01 (폴더 트리): 깊이 5, 파일 300개에서 스크롤이 끊기지 않는다 — 원문 단계 1, P0, [명세 8행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A8:J8)
- [ ] EX-02 (새 파일·폴더): 이름 충돌·금지 문자를 입력 중에 알려 준다 — 원문 단계 1, P0, [명세 9행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A9:J9)
- [ ] EX-03 (이름 변경): 열린 탭과 import 경로 안내가 함께 갱신된다 — 원문 단계 1, P0, [명세 10행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A10:J10)
- [ ] EX-04 (삭제): 폴더 삭제 시 하위 파일 수를 보여 준다 — 원문 단계 1, P0, [명세 11행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A11:J11)
- [ ] EX-09 (금지 파일 경고): 경고 문구에 라운지 규칙 링크가 있다 — 원문 단계 1, P0, [명세 16행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A16:J16)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-015 — 파일 드래그 이동·이름 검색

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-02
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: EX-05 EX-08
- 문서 근거: D-1
- 선행 의존성: I-014

### 목적과 범위

파일 드래그 이동·이름 검색를 제공한다. 이동 시 열린 탭 경로를 갱신하고 덮어쓰기 승인 전 원본을 보존한다.

### 완료 기준

- [ ] EX-05 (드래그 이동): 같은 이름이 있으면 덮어쓰기 여부를 묻는다 — 원문 단계 1, P1, [명세 12행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A12:J12)
- [ ] EX-08 (파일 이름 검색): 부분 일치, 상위 10개 표시 — 원문 단계 1, P1, [명세 15행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A15:J15)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-016 — 이미지·텍스트 파일 업로드

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-02
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: EX-06
- 문서 근거: C-07; D-1
- 선행 의존성: I-010, I-014, I-007

### 목적과 범위

이미지·텍스트 파일 업로드를 제공한다. 서명 URL은 해당 사용자의 프로젝트 경로로 제한한다. 업로드 취소·실패·용량 초과를 처리한다.

### 완료 기준

- [ ] EX-06 (파일 업로드): 업로드 진행률이 보이고 실패 시 이유가 표시된다 — 원문 단계 1, P0, [명세 13행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A13:J13)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-017 — ZIP 가져오기·용량 표시

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-02
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: EX-07 PJ-04
- 문서 근거: A-08; B-05; C-08
- 선행 의존성: I-007, I-014, I-016

### 목적과 범위

ZIP 가져오기·용량 표시를 제공한다. 가져오기 전에 경로 탈출·압축/해제 크기·파일 수·민감 파일을 검사한다. 원문 배포 한도와 프로젝트 한도의 적용 순서를 기록한다.

### 완료 기준

- [ ] EX-07 (ZIP 가져오기): 라운지 ZIP 규칙(500파일·100MB)으로 먼저 검사한다 — 원문 단계 1, P1, [명세 14행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A14:J14)
- [ ] PJ-04 (용량 표시): 한도 90%에서 경고 — 원문 단계 1, P1, [명세 55행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A55:J55)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-018 — Monaco·탭·되돌리기·찾기 바꾸기

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-03
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: ED-01 ED-02 ED-07
- 문서 근거: D-1; C-01
- 선행 의존성: I-004, I-012, I-014

### 목적과 범위

Monaco·탭·되돌리기·찾기 바꾸기를 제공한다. 언어 샘플과 탭 10개 전환을 검증한다. TS 편집 지원과 TS 실행 지원을 UI에서 구분한다.

### 완료 기준

- [ ] ED-01 (Monaco 코드 편집): 각 언어 샘플 파일이 올바르게 색칠된다 — 원문 단계 1, P0, [명세 18행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A18:J18)
- [ ] ED-02 (여러 파일 탭): 탭 10개에서도 전환이 100ms 안에 된다 — 원문 단계 1, P0, [명세 19행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A19:J19)
- [ ] ED-07 (되돌리기·찾기 바꾸기): Ctrl/Cmd+Z·F·H가 동작한다 — 원문 단계 1, P0, [명세 24행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A24:J24)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-019 — 자동 저장·즉시 저장·단일 편집자 경고

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-03
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: ED-03 PJ-08
- 문서 근거: D-1
- 선행 의존성: I-010, I-018

### 목적과 범위

자동 저장·즉시 저장·단일 편집자 경고를 제공한다. 1초 디바운스, 재시도, 네트워크 복구, 다른 탭 경고를 검증한다. 수동 편집과 AI 적용의 저장 순서를 정하고 오래된 변경안을 감지한다.

### 완료 기준

- [ ] ED-03 (자동 저장): 네트워크 오류 시 재시도하고 상태바에 표시한다 — 원문 단계 1, P0, [명세 20행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A20:J20)
- [ ] PJ-08 (단일 편집자 규칙): 두 탭 동시 편집 시 경고가 뜬다 — 원문 단계 1, P0, [명세 59행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A59:J59)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-020 — 이미지 뷰어·큰 파일 처리

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-03
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: ED-04 ED-09
- 문서 근거: C-09; D-1
- 선행 의존성: I-002, I-007, I-016, I-018

### 목적과 범위

이미지 뷰어·큰 파일 처리를 제공한다. SVG 등 사용자 파일은 에디터 인증 컨텍스트에서 스크립트를 실행하지 않는다. 256KB 초과 텍스트의 저장·열람·AI 도구 정책을 일치시킨다.

### 완료 기준

- [ ] ED-04 (이미지 뷰어): 5MB 이미지가 1초 안에 뜬다 — 원문 단계 1, P0, [명세 21행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A21:J21)
- [ ] ED-09 (큰 파일 처리): 초과 파일을 열면 이유가 표시된다 — 원문 단계 1, P1, [명세 26행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A26:J26)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-021 — 언어 자동완성·오류 표시·첫 로드·브라우저 호환

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-03
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: ED-06 NF-01 NF-06
- 문서 근거: C-01; D-1
- 선행 의존성: I-004, I-018

### 목적과 범위

언어 자동완성·오류 표시·첫 로드·브라우저 호환를 제공한다. 측정 PC와 지원 브라우저 버전을 기록한다. 이슈 구현 중 해당 경로를 검증하고 전체 브라우저 E2E는 M5에서 완료한다.

### 완료 기준

- [ ] ED-06 (자동완성·오류 표시): 타이핑 중 메인 스레드가 멈추지 않는다 — 원문 단계 1, P1, [명세 23행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A23:J23)
- [ ] NF-01 (첫 로드 3초): 학원 PC 기준 3초 이내 — 원문 단계 1, P0, [명세 72행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A72:J72)
- [ ] NF-06 (브라우저 지원): 세 브라우저에서 E2E 통과 — 원문 단계 1, P0, [명세 77행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A77:J77)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-022 — 격리된 iframe 미리보기·상대 경로·자동 갱신

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-04
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: PV-01 PV-02 PV-03 PV-07
- 문서 근거: C-06; D-1
- 선행 의존성: I-006, I-019

### 목적과 범위

격리된 iframe 미리보기·상대 경로·자동 갱신를 제공한다. 쿠키·JWT·Storage 인증정보를 프리뷰로 전달하지 않는다. 에디터 API의 서버 인증/소유권 검증도 포함하여 접근 거절을 검증한다.

### 완료 기준

- [ ] PV-01 (iframe 미리보기): index.html이 없으면 만들기 안내가 뜬다 — 원문 단계 1, P0, [명세 28행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A28:J28)
- [ ] PV-02 (자동 새로고침): 저장 후 1초 안에 반영된다 — 원문 단계 1, P0, [명세 29행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A29:J29)
- [ ] PV-03 (상대 경로 해석): img·link·script 상대 경로가 모두 로드된다 — 원문 단계 1, P0, [명세 30행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A30:J30)
- [ ] PV-07 (샌드박스 격리): 학생 코드에서 에디터 API 호출이 실패한다 — 원문 단계 1, P0, [명세 34행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A34:J34)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-023 — 미리보기 콘솔·오류 위치 이동·새 창

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-04
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: PV-04 PV-06
- 문서 근거: D-1
- 선행 의존성: I-022

### 목적과 범위

미리보기 콘솔·오류 위치 이동·새 창를 제공한다. postMessage 송신원과 payload를 검증하고 새 창에도 같은 격리와 상대 경로 정책을 적용한다.

### 완료 기준

- [ ] PV-04 (콘솔 패널): 오류 줄 번호를 클릭하면 편집기로 이동한다 — 원문 단계 1, P1, [명세 31행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A31:J31)
- [ ] PV-06 (새 창 열기): 새 탭에서도 상대 경로가 동작한다 — 원문 단계 1, P1, [명세 33행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A33:J33)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-024 — 템플릿 3종·프로젝트 복제

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-02
- 마일스톤: M1
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: PJ-02 PJ-05
- 문서 근거: A-10; D-1
- 선행 의존성: I-002, I-011, I-022

### 목적과 범위

템플릿 3종·프로젝트 복제를 제공한다. 복제 프로젝트는 새 소유권/ID를 가지며 lounge_project_id는 비어 있다. 생성 즉시 템플릿 미리보기를 확인한다.

### 완료 기준

- [ ] PJ-02 (템플릿 3종): 템플릿에서 만든 프로젝트가 바로 미리보기된다 — 원문 단계 1, P0, [명세 53행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A53:J53)
- [ ] PJ-05 (프로젝트 복제): 라운지 연결은 복제되지 않는다 — 원문 단계 1, P1, [명세 56행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A56:J56)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-025 — AI 스트리밍·중단·스레드·도구 표시

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-05
- 마일스톤: M2
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: AI-01 AI-02 AI-07 NF-02
- 문서 근거: C-02, C-05, C-10; D-2
- 선행 의존성: I-005, I-010, I-019, I-031

### 목적과 범위

AI 스트리밍·중단·스레드·도구 표시를 제공한다. 부분 응답·오류·중단 상태를 저장한다. 첫 토큰 3초는 측정 조건과 목표로 기록하며 외부 공급자 지연도 구분한다.

### 완료 기준

- [ ] AI-01 (스트리밍 대화): 첫 토큰 3초 이내, 중단 시 부분 응답 저장 — 원문 단계 2, P0, [명세 35행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A35:J35)
- [ ] AI-02 (스레드 저장): 새로고침 후 대화가 그대로 보인다 — 원문 단계 2, P0, [명세 36행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A36:J36)
- [ ] AI-07 (도구 호출 표시): 펼치면 전체 결과가 보인다 — 원문 단계 2, P0, [명세 41행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A41:J41)
- [ ] NF-02 (AI 턴 시간 제한): 도구 5회 포함 턴이 제한 안에 끝난다 — 원문 단계 2, P0, [명세 73행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A73:J73)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-026 — 컨텍스트·읽기 도구·데이터 정책

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-05
- 마일스톤: M2
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: AI-03 AI-04 AI-15
- 문서 근거: D-2; C-02
- 선행 의존성: I-025

### 목적과 범위

컨텍스트·읽기 도구·데이터 정책를 제공한다. 읽기 도구에도 프로젝트 소유권·경로 검증을 적용한다. 큰 파일 트리에도 프롬프트 4천 토큰 목표를 지키는 절단 규칙을 정의한다.

### 완료 기준

- [ ] AI-03 (시스템 프롬프트): 프롬프트 토큰이 4천 이하로 유지된다 — 원문 단계 2, P0, [명세 37행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A37:J37)
- [ ] AI-04 (읽기 도구): 모델이 파일을 요청하면 결과가 접힌 블록으로 표시된다 — 원문 단계 2, P0, [명세 38행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A38:J38)
- [ ] AI-15 (데이터 정책 강제): 모든 요청 body에 provider 옵션이 포함된다 — 원문 단계 2, P0, [명세 49행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A49:J49)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-027 — 쓰기 제안·승인·자동 적용·인젝션 방어

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-05
- 마일스톤: M2
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: AI-05 AI-06 AI-14
- 문서 근거: D-2; 계획 §8; Q-02
- 선행 의존성: I-003, I-026, I-019

### 목적과 범위

쓰기 제안·승인·자동 적용·인젝션 방어를 제공한다. 적용 전 DB/VFS 불변을 확인한다. 삭제·이름 변경은 항상 승인하고 승인 대상·내용·파일 revision을 서버에서 검증한다. 인젝션·권한 우회·오래된 제안 사례를 검증한다.

### 완료 기준

- [ ] AI-05 (쓰기 도구(제안 모드)): 적용 전에는 파일이 바뀌지 않는다 — 원문 단계 2, P0, [명세 39행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A39:J39)
- [ ] AI-06 (자동 적용 모드): 토글 상태가 스레드마다 기억된다 — 원문 단계 2, P1, [명세 40행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A40:J40)
- [ ] AI-14 (프롬프트 인젝션 방어): 파일 안의 삭제 지시가 승인 없이 실행되지 않는다 — 원문 단계 2, P0, [명세 48행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A48:J48)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-028 — Monaco diff·AI 변경 배지

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-05
- 마일스톤: M2
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: ED-10 EX-10
- 문서 근거: D-2
- 선행 의존성: I-027, I-018

### 목적과 범위

Monaco diff·AI 변경 배지를 제공한다. 적용/무시 상태를 diff 카드와 Monaco에서 동일하게 유지한다.

### 완료 기준

- [ ] ED-10 (인라인 diff): 좌우 비교와 적용·무시 버튼이 있다 — 원문 단계 2, P1, [명세 27행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A27:J27)
- [ ] EX-10 (AI 변경 표시): 파일을 열면 배지가 사라진다 — 원문 단계 2, P1, [명세 17행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A17:J17)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-029 — 선택 영역 첨부·응답 코드 파일 저장

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-05
- 마일스톤: M2
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: AI-13 AI-16
- 문서 근거: D-2
- 선행 의존성: I-026, I-027

### 목적과 범위

선택 영역 첨부·응답 코드 파일 저장를 제공한다. 코드 블록 저장에도 경로·충돌·소유권·저장 정책을 적용한다.

### 완료 기준

- [ ] AI-13 (선택 영역 첨부): 첨부된 코드가 메시지 카드에 보인다 — 원문 단계 2, P1, [명세 47행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A47:J47)
- [ ] AI-16 (코드 블록 저장): 경로 입력 후 파일이 생성된다 — 원문 단계 2, P1, [명세 50행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A50:J50)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-030 — 미리보기 오류 AI 도구 연동

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-05
- 마일스톤: M2
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: AI-12
- 문서 근거: D-2
- 선행 의존성: I-023, I-026, I-027

### 목적과 범위

미리보기 오류 AI 도구 연동를 제공한다. 브라우저에서 수집한 오류만 전달하고 수정은 같은 제안/승인 경로를 사용한다.

### 완료 기준

- [ ] AI-12 (미리보기 오류 전달): 오류가 있으면 모델이 수정안을 낸다 — 원문 단계 2, P1, [명세 46행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A46:J46)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-031 — AI 공개 전 최소 사용량 기록·예산 차단

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-06
- 마일스톤: M2
- 라벨 후보: `type:task`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: A-06, A-07; AI-11; E-03
- 선행 의존성: I-002, I-005, I-010

### 목적과 범위

AI 공개 전 최소 사용량 기록·예산 차단를 제공한다. AI 요청 전 잔여 예산을 확인하고 동시 요청에서도 우회를 방지한다. 종료/중단/오류 사용량 처리 기준을 기록한다. M3의 전체 사용량 UI에 앞서 활성화한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

산출물 또는 계약 문서를 검토하고 작업 기준의 성공·실패 사례 결과를 기록한다.

## I-032 — 비전 이미지 첨부·보존 정책

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-06
- 마일스톤: M3
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: AI-08
- 문서 근거: C-04; A-09; D-3; E-04
- 선행 의존성: I-025, I-002, I-005, I-016

### 목적과 범위

비전 이미지 첨부·보존 정책를 제공한다. 최대 3장·각 5MB 제한, 비공개 URL 만료, 스레드 삭제 및 보존 만료 정리 동작을 검증한다.

### 완료 기준

- [ ] AI-08 (이미지 첨부 입력): 스케치 이미지로 레이아웃 코드가 생성된다 — 원문 단계 3, P0, [명세 42행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A42:J42)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-033 — 이미지 생성 도구·프로젝트 파일 반영

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-06
- 마일스톤: M3
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: AI-09
- 문서 근거: C-03; D-3
- 선행 의존성: I-005, I-027, I-032

### 목적과 범위

이미지 생성 도구·프로젝트 파일 반영를 제공한다. 지원 모델과 과금 검증이 통과해야 활성화한다. 생성 파일 저장의 제안 모드 적용 여부는 Q-07 결정에 따른다.

### 완료 기준

- [ ] AI-09 (이미지 생성 도구): 생성 파일이 탐색기에 바로 보인다 — 원문 단계 3, P1, [명세 43행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A43:J43)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-034 — 모델 선택·일일 사용량·잔여 상태바

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-06
- 마일스톤: M3
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: AI-10 AI-11 SH-05
- 문서 근거: A-06, A-07; D-3
- 선행 의존성: I-031, I-032

### 목적과 범위

모델 선택·일일 사용량·잔여 상태바를 제공한다. 서버가 모델 허용 목록을 검증한다. SH-05의 AI 잔여 표시는 명세 1단계보다 늦은 M3에 연결하고 커서/언어 표시는 M1에서 준비 가능하다.

### 완료 기준

- [ ] AI-10 (모델 선택): 허용 목록 밖 모델은 선택할 수 없다 — 원문 단계 3, P1, [명세 44행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A44:J44)
- [ ] AI-11 (사용량·일일 한도): 한도 도달 시 채팅만 멈추고 편집은 계속된다 — 원문 단계 3, P0, [명세 45행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A45:J45)
- [ ] SH-05 (하단 상태바): AI 한도의 80%에서 색이 바뀐다 — 원문 단계 1, P1, [명세 6행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A6:J6)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-035 — 배포 ZIP 생성·검증·다운로드

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-07
- 마일스톤: M4
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: DP-01 DP-02 PJ-06
- 문서 근거: B-05; C-08; D-4
- 선행 의존성: I-007, I-019, I-017

### 목적과 범위

배포 ZIP 생성·검증·다운로드를 제공한다. 배포/다운로드가 같은 정책 버전과 ZIP 경로를 쓴다. 배포 시작 전에 미저장 변경을 반영하고 금지 파일 제외/오류 정책을 결정한다.

### 완료 기준

- [ ] DP-01 (ZIP 생성): 생성 ZIP이 라운지 검증을 통과한다 — 원문 단계 4, P0, [명세 60행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A60:J60)
- [ ] DP-02 (배포 전 정책 검증): 실패 시 파일과 규칙을 한국어로 표시 — 원문 단계 4, P0, [명세 61행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A61:J61)
- [ ] PJ-06 (ZIP 다운로드): 라운지 수동 업로드에 그대로 쓸 수 있다 — 원문 단계 4, P1, [명세 57행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A57:J57)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-036 — 라운지 인증 연동·첫 배포·권한 안내

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-07
- 마일스톤: M4
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: DP-03 DP-06 DP-07
- 문서 근거: B-01, B-02, B-07; D-4
- 선행 의존성: I-001, I-035, L-001, L-002, L-004

### 목적과 범위

라운지 인증 연동·첫 배포·권한 안내를 제공한다. 에디터 서버에서 JWT/소유권을 확인한다. 라운지가 배포 권한을 재검증한다. 같은 요청 재시도에 중복 작품을 만들지 않는 계약을 확인한다.

### 완료 기준

- [ ] DP-03 (첫 배포 폼): 라운지 작품이 생성되고 ID가 저장된다 — 원문 단계 4, P0, [명세 62행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A62:J62)
- [ ] DP-06 (라운지 내부 API 호출): 서명 불일치·시간 초과 요청이 거절된다 — 원문 단계 4, P0, [명세 65행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A65:J65)
- [ ] DP-07 (배포 차단 안내): 라운지 규칙과 같은 문구 — 원문 단계 4, P1, [명세 66행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A66:J66)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-037 — 재배포·결과 링크·이력·삭제 연결 복구

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-07
- 마일스톤: M4
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: DP-04 DP-05
- 문서 근거: D-4
- 선행 의존성: I-036, L-002

### 목적과 범위

재배포·결과 링크·이력·삭제 연결 복구를 제공한다. 같은 작품 ID 갱신과 캐시 무효화, sha256·정책 버전·실패 이력을 확인한다. 삭제된 라운지 작품에 대해 재연결/새 작품 생성 선택을 정의한다.

### 완료 기준

- [ ] DP-04 (재배포): 상세 페이지 캐시가 무효화된다 — 원문 단계 4, P0, [명세 63행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A63:J63)
- [ ] DP-05 (결과 링크·이력): 이력에 sha256·정책 버전·시각이 있다 — 원문 단계 4, P0, [명세 64행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A64:J64)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## L-001 — 라운지 내부 배포 인증·요청 계약

- 저장소: 라운지(원격·규약·기존 이슈 확인 후 등록)
- 부모 에픽: E-08
- 마일스톤: M4
- 라벨 후보: `type:task`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: B-01; B-04; A-04
- 선행 의존성: I-001

### 목적과 범위

라운지 내부 배포 인증·요청 계약를 제공한다. 권장 B 채택 시 timestamp·서명·timing-safe 비교·재전송 방어·사용자 식별 계약을 정의한다. A 채택 시 Bearer JWT와 CORS 계약으로 본문을 수정한다. M2부터 병행한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

산출물 또는 계약 문서를 검토하고 작업 기준의 성공·실패 사례 결과를 기록한다.

## L-002 — 라운지 작품 생성·갱신·캐시·멱등성 계약

- 저장소: 라운지(원격·규약·기존 이슈 확인 후 등록)
- 부모 에픽: E-08
- 마일스톤: M4
- 라벨 후보: `type:task`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: B-02; D-4
- 선행 의존성: L-001

### 목적과 범위

라운지 작품 생성·갱신·캐시·멱등성 계약를 제공한다. 필드·slug 충돌·썸네일·공개/목록 옵션·lease·완료 응답·오류 코드를 문서화하고 생성/갱신 계약을 검증한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

산출물 또는 계약 문서를 검토하고 작업 기준의 성공·실패 사례 결과를 기록한다.

## L-003 — 출처 메타데이터·ZIP 정책 공유

- 저장소: 라운지(원격·규약·기존 이슈 확인 후 등록)
- 부모 에픽: E-08
- 마일스톤: M4
- 라벨 후보: `type:task`, `priority:P1`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: B-03; B-05
- 선행 의존성: I-007, L-001

### 목적과 범위

출처 메타데이터·ZIP 정책 공유를 제공한다. editor 출처 표시 필요 여부와 컬럼/메타데이터 경로, 검증기의 소유 저장소·배포 방식·버전 호환성을 결정한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

산출물 또는 계약 문서를 검토하고 작업 기준의 성공·실패 사례 결과를 기록한다.

## L-004 — 라운지 권한 차단·연동 문서

- 저장소: 라운지(원격·규약·기존 이슈 확인 후 등록)
- 부모 에픽: E-08
- 마일스톤: M4
- 라벨 후보: `type:task`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: B-06, B-07; E-09
- 선행 의존성: L-001, L-002

### 목적과 범위

라운지 권한 차단·연동 문서를 제공한다. 휴원·퇴원 차단을 서버에서 검증하고 에디터 권한 행 및 양방향 문서 링크를 추가한다. UI 차단만으로 완료하지 않는다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

산출물 또는 계약 문서를 검토하고 작업 기준의 성공·실패 사례 결과를 기록한다.

## I-038 — 키보드 접근성·대비

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-09
- 마일스톤: M5
- 라벨 후보: `type:feature`, `priority:P1`
- 기능 ID: NF-03
- 문서 근거: D-5
- 선행 의존성: I-024, I-034, I-037

### 목적과 범위

키보드 접근성·대비를 제공한다. 자동 검사와 키보드 수동 검증을 함께 실시한다.

### 완료 기준

- [ ] NF-03 (키보드·대비): 자동 검사 도구 통과 — 원문 단계 5, P1, [명세 74행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A74:J74)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-039 — 오류 추적·구조화 로그·사용량 대시보드

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-09
- 마일스톤: M5
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: NF-04 NF-07
- 문서 근거: D-5; E-06
- 선행 의존성: I-034, I-037

### 목적과 범위

오류 추적·구조화 로그·사용량 대시보드를 제공한다. 로그에 API 키·JWT·첨부 URL·파일/대화 원문을 남기지 않는다. 청구 차이 5% 목표의 집계 기간과 포함 비용을 명시한다.

### 완료 기준

- [ ] NF-04 (오류 추적): 오류에 프로젝트 ID가 붙어 온다 — 원문 단계 5, P0, [명세 75행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A75:J75)
- [ ] NF-07 (비용 대시보드): 월 합계가 OpenRouter 청구와 5% 안에서 맞는다 — 원문 단계 5, P1, [명세 78행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A78:J78)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-040 — VFS·도구·ZIP 단위 검증·전체 E2E

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-09
- 마일스톤: M5
- 라벨 후보: `type:feature`, `priority:P0`
- 기능 ID: NF-05
- 문서 근거: D-5; NF-06; E-07
- 선행 의존성: I-038, I-039, I-037

### 목적과 범위

VFS·도구·ZIP 단위 검증·전체 E2E를 제공한다. 로그인→템플릿→편집→AI 승인→배포 E2E와 권한·저장 충돌·인젝션·ZIP 실패 테스트를 CI에서 통과시킨다. AI 장애 시 편집/저장/배포를 확인한다.

### 완료 기준

- [ ] NF-05 (자동 테스트): CI에서 모두 통과 — 원문 단계 5, P0, [명세 76행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A76:J76)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-041 — 명령 팔레트·마크다운·포맷·기기 폭

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-09
- 마일스톤: M5
- 라벨 후보: `type:feature`, `priority:P2`
- 기능 ID: SH-06 ED-05 ED-08 PV-05
- 문서 근거: 계획 §7
- 선행 의존성: I-018, I-022, I-037, I-003

### 목적과 범위

명령 팔레트·마크다운·포맷·기기 폭를 제공한다. P2지만 명세 단계 5 항목이다. 기본 출시 후보에 유지하고 제외 시 범위 결정 및 원문 상태 갱신을 별도 실행한다.

### 완료 기준

- [ ] SH-06 (명령 팔레트): 새 파일·저장·배포·테마 전환이 팔레트에서 된다 — 원문 단계 5, P2, [명세 7행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A7:J7)
- [ ] ED-05 (마크다운 미리보기): 제목·목록·코드 블록이 렌더된다 — 원문 단계 5, P2, [명세 22행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A22:J22)
- [ ] ED-08 (코드 포맷): HTML·CSS·JS가 포맷된다 — 원문 단계 5, P2, [명세 25행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A25:J25)
- [ ] PV-05 (기기 폭 전환): 세 폭으로 전환된다 — 원문 단계 5, P2, [명세 32행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A32:J32)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## I-042 — 개인정보·동의·키·월 상한·운영비 출시 점검

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-09
- 마일스톤: M5
- 라벨 후보: `type:task`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: E-01~E-06
- 선행 의존성: I-002, I-032, I-039

### 목적과 범위

개인정보·동의·키·월 상한·운영비 출시 점검를 제공한다. 정책/동의 문구의 검토 담당을 지정하고 검토 근거·날짜를 남긴다. Vercel 환경 3스코프와 문서 변경 빌드 생략, 결제 월 상한/알림, 월 운영비 표를 확인한다. 법적 적합성은 이 준비 문서에서 판단하지 않는다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

산출물 또는 계약 문서를 검토하고 작업 기준의 성공·실패 사례 결과를 기록한다.

## I-043 — 학생 5명 파일럿·교사 안내·명세 상태 대조

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-09
- 마일스톤: M5
- 라벨 후보: `type:task`, `priority:P0`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: D-5; E-08~E-10
- 선행 의존성: I-040, I-042, I-041

### 목적과 범위

학생 5명 파일럿·교사 안내·명세 상태 대조를 제공한다. 1주 파일럿에서 막힌 지점과 수정 결과를 기록하고 출시 차단 결함을 닫는다. 명세 상태는 구현 증거를 대조한 뒤 갱신한다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

산출물 또는 계약 문서를 검토하고 작업 기준의 성공·실패 사례 결과를 기록한다.

## F-001 — 음성 입력

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-10
- 마일스톤: 없음(후속)
- 라벨 후보: `type:feature`, `priority:P2`, `scope:follow-up`
- 기능 ID: AI-17
- 문서 근거: 계획 §3
- 선행 의존성: MVP 완료

### 목적과 범위

음성 입력를 제공한다. 한국어 브라우저 음성 인식 지원 범위와 개인정보 처리를 별도 검토한다.

### 완료 기준

- [ ] AI-17 (음성 입력): 한국어 음성이 텍스트로 들어간다 — 원문 단계 후속, P2, [명세 51행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A51:J51)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## F-002 — 파일 버전 기록·되돌리기

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-10
- 마일스톤: 없음(후속)
- 라벨 후보: `type:feature`, `priority:P2`, `scope:follow-up`
- 기능 ID: PJ-07
- 문서 근거: 계획 §3·§8; Q-02
- 선행 의존성: I-003

### 목적과 범위

파일 버전 기록·되돌리기를 제공한다. 30일 보관·정리 및 되돌리기 충돌 규칙을 정의한다. MVP 안전 백업 포함 여부와 별개로 후속 UI 범위를 관리한다.

### 완료 기준

- [ ] PJ-07 (파일 변경 이력): 특정 시점으로 파일을 되돌릴 수 있다 — 원문 단계 후속, P2, [명세 58행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A58:J58)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## F-003 — 미리보기 기반 자동 썸네일

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-10
- 마일스톤: 없음(후속)
- 라벨 후보: `type:feature`, `priority:P2`, `scope:follow-up`
- 기능 ID: DP-08
- 문서 근거: 계획 §3
- 선행 의존성: I-037

### 목적과 범위

미리보기 기반 자동 썸네일를 제공한다. 격리된 캡처의 이미지 로딩과 실패 시 수동 업로드 대체를 확인한다.

### 완료 기준

- [ ] DP-08 (썸네일 자동 생성): 캡처 이미지가 폼에 미리 채워진다 — 원문 단계 후속, P2, [명세 67행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A67:J67)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## F-004 — 기관 범위 선생님 읽기 전용 열람

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-10
- 마일스톤: 없음(후속)
- 라벨 후보: `type:feature`, `priority:P2`, `scope:follow-up`
- 기능 ID: AC-04
- 문서 근거: A-05; 계획 §3
- 선행 의존성: I-001, I-010

### 목적과 범위

기관 범위 선생님 읽기 전용 열람를 제공한다. 기관 membership 기반 읽기 권한과 학생 쓰기 권한 경계를 검증한다.

### 완료 기준

- [ ] AC-04 (선생님 열람 모드): organization_memberships 범위만 보인다 — 원문 단계 후속, P2, [명세 71행](https://docs.google.com/spreadsheets/d/1YiZ43SXkOaPQ8nJgEzPv7vECM1IcWwDL0QYyQMRmVBs/edit#gid=747329351&range=A71:J71)
- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

원문 수용 기준을 해당 사용자 흐름에서 검증한다. 권한·저장·도구·ZIP·격리는 필요한 자동 테스트를 포함하고 UI 표시/조작은 재현 절차와 결과를 남긴다.

## F-005 — React·TS 번들링 및 WebContainers 라이선스 검토

- 저장소: quirinal36/letscoding-editor
- 부모 에픽: E-10
- 마일스톤: 없음(후속)
- 라벨 후보: `type:spike`, `priority:P2`, `scope:follow-up`
- 기능 ID: 별도 기능 ID 없음(결정·검증·운영/계약 작업)
- 문서 근거: C-11; 계획 §3·§9
- 선행 의존성: MVP 완료

### 목적과 범위

React·TS 번들링 및 WebContainers 라이선스 검토를 제공한다. esbuild-wasm·Sandpack·WebContainers를 비교한다. 서버 빌드·터미널·공동 편집·모바일은 별도 범위 결정 전 추가하지 않는다.

### 완료 기준

- [ ] 위 추가 구현/결정 기준의 결과와 검증 증거를 본문에 기록한다.
- [ ] 의존성 결정 내용을 반영하고 이슈 범위의 실패·권한·복구 경로를 확인한다.

### 검증 방법

작은 재현 실험과 사용 버전/모델/환경, 측정값, 성공·실패 및 대체안 결론을 남긴다. 실험 결과로 관련 기능 범위를 조정한다.


