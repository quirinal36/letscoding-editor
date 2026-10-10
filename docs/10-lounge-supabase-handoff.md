# 라운지 개발팀께 — 에디터 Supabase DB 연결 반영 요청

작성일: 2026-10-10

대상: 라운지 공유 DB migration, 에디터 배포 연동, Play 작품 서빙

에디터 기준: [PR #70](https://github.com/quirinal36/letscoding-editor/pull/70), 병합 커밋 `1accdcadb283c0d211efab82066459f6b3191acf`

안녕하세요.

에디터에서 학생이 자신의 Supabase 프로젝트를 연결하고, 작품 코드에서 데이터를 읽고 쓰는 기능을 `main`에 병합했습니다. 연결·해제 응답을 기다리다가 다른 작품으로 이동했을 때 결과가 잘못 반영되는 문제도 수정했습니다. 에디터의 check 36개, build, E2E 27개와 병합 전 GitHub CI가 통과했습니다.

학생이 에디터에서 만든 방명록을 라운지에 게시한 뒤에도 같은 DB를 사용할 수 있도록 라운지 쪽 변경을 부탁드립니다. 핵심은 **연결 정보의 DB 저장**과 **배포된 작품의 Play CSP 허용 목록 연결**입니다. 에디터에 연결 정보를 저장하는 것만으로 라운지의 CSP가 자동으로 바뀌지는 않습니다.

아래에 확인한 상태, 변경 제안과 완료 기준을 정리했습니다. 작업 후 migration 이름·적용 환경·검증한 커밋과 인수 결과를 공유해 주세요. 운영 기능 활성화는 이 결과를 확인한 뒤 진행하면 좋겠습니다.

## 1. 확인한 상태와 검토 기준

| 항목                  | 확인한 내용                                                          | 추가 작업                                         |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| 에디터 DB 패널        | 연결 테스트, 연결·해제, `supabase.js` 생성, 비밀키 거부 구현         | 실제 학생 Supabase 계정 인수                      |
| 에디터 저장           | `editor.editor_projects.snapshot.supabase`를 읽고 쓰는 코드 구현     | 라운지 소유 저장 RPC의 snapshot 식 수정           |
| 에디터 미리보기       | 연결한 호스트와 jsDelivr만 추가 허용                                 | 실제 CDN 모듈·DB 요청 확인                        |
| 라운지 원격 Play 서빙 | 검토한 `master`는 `projectConnectSrc`가 빈 배열                      | 작품별 허용 목록 연결                             |
| 라운지 로컬 작업본    | 작품 `.env`의 Supabase URL을 Play CSP에 넣는 변경과 결정 문서가 있음 | 작업본 검토·병합·배포 상태 확인                   |
| 배포 연동             | 기존 내부 API가 에디터 작품 ID와 라운지 작품 ID를 확인               | 연결된 DB 주소를 배포 설정으로 전달하는 흐름 추가 |

라운지 원격 검토 기준은 `master` 커밋 `0f7f7d3a3444a70450004aeb4765902cdc987235`입니다. 별도로 확인한 로컬 작업본에는 미커밋 변경이 있으므로, 문서에 적힌 구현·정책을 운영 적용 완료로 보지는 않았습니다. 실제 운영 DB 함수 정의와 배포 상태는 이번 문서 작성에서 확인하지 않았습니다.

## 2. 필수 변경: 공유 DB에 연결 정보 보존

새 연결 테이블을 만드는 방식이 아니라 기존 프로젝트 snapshot을 사용합니다.

```json
{
  "threads": [],
  "deployments": [],
  "supabase": {
    "url": "https://<학생-project-ref>.supabase.co",
    "anonKey": "<학생의 anon 또는 publishable key>",
    "connectedAt": "<ISO 8601 시각>"
  }
}
```

해제된 작품에는 `supabase` 필드가 없어야 합니다. 기존 작품에 이 필드가 없어도 정상적으로 열려야 합니다.

### migration 작성 방법

에디터의 [integration/supabase-link-schema.sql](https://github.com/quirinal36/letscoding-editor/blob/1accdcadb283c0d211efab82066459f6b3191acf/integration/supabase-link-schema.sql)은 **미적용 제안서**입니다. 라운지의 최신 migration과 실제 함수 정의를 대조한 뒤, 라운지 저장소에 새 migration을 작성해 주세요. 기존 초기 생성 migration을 수정하거나 에디터 SQL을 별도 migration 원장으로 적용하지 않습니다.

변경 대상 함수는 다음과 같습니다.

```text
editor.editor_save_project(uuid,jsonb,jsonb,bigint,boolean,boolean,bigint)
```

현재 snapshot 식의 metadata 갱신 분기를 다음 형태로 바꾸는 것이 제안의 핵심입니다. 아래는 전체 실행 SQL이 아닌 변경할 표현식입니다.

```sql
case
  when not p_metadata and old.id is not null then old.snapshot
  else jsonb_strip_nulls(jsonb_build_object(
    'threads', p_project->'threads',
    'deployments', p_project->'deployments',
    'supabase', p_project->'supabase'
  ))
end
```

`p_metadata=false`인 일반 파일 저장과 기존 작품의 GitHub 동기화는 기존 snapshot을 유지해야 합니다. `p_metadata=true`인 연결·해제에서는 metadata revision을 검사하고 갱신해야 합니다. 파일 revision 검사, advisory lock, 소유권·삭제 상태 검사, 파일 버전 기록과 기존 배포·대화 저장 동작은 유지해 주세요.

RPC는 기존처럼 서버의 `service_role`만 실행하도록 합니다. `public`, `anon`, `authenticated`에 실행 권한을 추가하지 않습니다. 최신 라운지 함수에 제안서 이후 추가된 로직이 있다면 그 로직을 보존한 상태에서 snapshot 식만 반영해 주세요.

## 3. 필수 변경: Play의 작품별 Supabase 허용 목록

라운지에는 `projectSupabaseConnectSrc()`와 `connectSrcCacheTag()`가 이미 있습니다. 로컬 작업본은 작품의 서버 전용 `.env`에서 `SUPABASE_URL` 또는 `*_SUPABASE_URL`을 읽어 **Play 내부 서빙에서만** 허용하는 방식입니다. 이 흐름을 재사용하는 것을 권장합니다.

검토할 파일은 다음과 같습니다.

- `src/lib/project-content-csp.ts`
- `src/app/api/internal/play/serve/[projectId]/[[...path]]/route.ts`
- `src/lib/project-secrets.ts`
- `tests/play-launch-security.test.ts`

적용 기준은 아래와 같습니다.

- 허용된 학생 DB의 `https://<ref>.supabase.co`와 Realtime용 `wss://<ref>.supabase.co`만 작품별로 추가합니다. Supabase 와일드카드나 임의 외부 API를 열지 않습니다.
- 기존 호스트 검증·정렬·중복 제거·개수 상한과 허용 목록의 ETag 반영을 유지합니다.
- 설정 조회·복호화에 실패하면 학생 DB 주소를 추가하지 않는 기본 CSP로 처리합니다.
- Lounge와 같은 오리진의 레거시 `/play`에서 외부 DB 허용을 확대하지 않습니다. DB 작품은 격리된 Play 주소로 열리도록 확인합니다.
- `.env` 전체를 브라우저에 내려보내거나 `runtime-config.js`로 비밀값을 공개하지 않습니다. CSP에 필요한 것은 호스트뿐입니다.

라운지 CSP 생성 함수는 이미 `script-src`에 `https://cdn.jsdelivr.net`을 포함합니다. CDN 허용 정책을 넓히기 전에 에디터가 생성하는 `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm`과 그 종속 모듈이 실제 Play에서 로드되는지 확인해 주세요.

## 4. 권장 변경: 에디터 연결 주소를 배포 설정에 자동 반영

에디터는 연결 정보를 `snapshot.supabase`에 저장하고 URL·공개 키를 `supabase.js`에 넣습니다. ZIP에는 라운지 CSP용 `.env`를 자동으로 넣지 않습니다. 따라서 3번의 `.env` 허용 기능만 적용하면 학생이 라운지에서 주소를 한 번 더 설정해야 합니다.

### 우선 적용할 수 있는 방법

공유 DB migration과 Play 허용 기능부터 검증할 때는, 라운지 작품 수정 화면의 서버 전용 `.env` 설정에 `SUPABASE_URL=https://<학생-project-ref>.supabase.co`를 직접 등록할 수 있습니다. 임시 인수 방법이며, 최종 사용 흐름은 에디터의 DB 연결 한 번으로 끝나는 것이 좋겠습니다.

### 자동화 제안

기존 `src/lib/editor-integration/services.ts`의 `prepare`·`complete` 흐름에서 다음을 처리해 주세요.

1. **배포 준비 시점에 주소를 고정합니다.** 인증된 사용자와 에디터 작품의 소유권을 검사한 뒤 `snapshot.supabase.url`을 읽고 다시 검증합니다. 이 URL 또는 연결 없음 상태를 해당 업로드 기록에 보관합니다. 예를 들어 `editor_lounge_uploads`에 nullable `editor_supabase_url` 컬럼을 추가하고, 준비 RPC에서 서버 측으로 채울 수 있습니다. 구체적인 저장 방식은 최신 배포 계약에 맞춰 결정해 주세요.
2. **배포 완료 시 해당 라운지 작품에만 반영합니다.** 잠금을 획득한 업로드 기록의 에디터 작품 ID·라운지 작품 ID·사용자 ID를 기준으로 기존 소유권 검사를 유지합니다. 학생 작품의 소스나 클라이언트가 보낸 임의 주소를 검색해 허용 목록으로 채택하지 않습니다.
3. **기존 서버 전용 설정을 재사용합니다.** 작품 secrets의 `runtimeEnv`에 자동 관리용 `EDITOR_SUPABASE_URL`을 병합하는 방식을 권장합니다. 이 키는 기존 `*_SUPABASE_URL` 패턴으로 인식할 수 있습니다. 다른 환경변수는 보존하고, 연결 없는 상태로 재배포하면 이 자동 관리 키만 제거합니다. 학생이 직접 등록한 URL을 삭제하거나 덮어쓰지 않습니다.
4. **완료 기록과 설정 반영을 함께 관리합니다.** 작품 배포 성공 후 허용 목록 저장까지 성공했을 때 완료 receipt를 남깁니다. 중간 실패는 기존 `needs_review` 경로로 남겨 자동 재배포를 막고, 이미 게시된 파일과 설정을 대사할 수 있게 합니다. 자동 관리 키를 갱신할 때도 secrets의 동시 수정 보호를 유지합니다.

배포 중 학생이 에디터의 연결을 바꾸더라도 진행 중인 배포의 허용 목록이 뒤늦게 바뀌지 않아야 합니다. 이를 위해 Play 요청 때마다 현재 에디터 snapshot을 그대로 따라가는 방식보다 **배포 준비 때 고정한 주소를 작품 설정으로 저장하는 방식**을 권장합니다. 새 연결은 코드 생성과 재배포를 거쳐 반영합니다.

허용 목록에는 anon key가 필요하지 않습니다. 키를 새 배포 요청 필드나 CSP에 추가하지 말고 URL만 전달해 주세요. 자동 관리 주소와 수동 주소가 합쳐져 기존 호스트 상한을 넘는 경우에는 조용히 주소를 누락시키지 말고 설정 충돌로 안내하는 것이 좋겠습니다.

## 5. 함께 확인할 동작

| 검증                    | 통과 기준                                                                       |
| ----------------------- | ------------------------------------------------------------------------------- |
| 연결 저장·새로고침      | URL·공개 키·연결 시각이 유지되고 다른 학생은 접근할 수 없음                     |
| 일반 저장·GitHub 동기화 | 파일 저장으로 DB 연결·대화·배포 metadata가 사라지지 않음                        |
| 연결 해제               | snapshot의 `supabase`가 제거되고 이후 일반 저장에서 되살아나지 않음             |
| 동시 수정               | 오래된 파일 또는 metadata revision으로 저장하면 충돌로 거부됨                   |
| 최초 게시               | 방명록의 CDN 로드, DB 조회·글쓰기가 실제 Play 브라우저에서 성공함               |
| 호스트 격리             | A 작품에 연결한 주소가 B 작품의 CSP에 들어가지 않음; 미허용 외부 fetch는 차단됨 |
| 주소 변경·재배포        | 새 주소가 반영되고 이전 자동 관리 주소는 제거됨; ETag도 변경됨                  |
| 연결 해제·재배포        | 자동 관리 주소만 제거되고 학생의 다른 설정은 보존됨                             |
| 배포 중 연결 변경       | 진행 중인 업로드에는 준비 시 고정한 주소가 사용됨                               |
| 실패·재시도             | 설정 반영 실패를 완료로 기록하지 않고 중복 작품이나 자동 재배포를 만들지 않음   |
| 기존 작품               | DB 연결이 없는 작품과 수동 `.env` 설정 작품이 기존처럼 동작함                   |
| 공개·비공개 작품        | Play launch와 접근 검사가 유지되고 레거시 경로에서 권한이 확대되지 않음         |

학생 DB에는 RLS가 필요합니다. `service_role` JWT와 `sb_secret_` 키는 작품 코드·배포 ZIP에 포함하면 안 됩니다. 에디터는 이를 차단하며, 라운지의 별도 업로드 경로에서도 같은 차단이 적용되는지 확인해 주세요.

에디터가 생성하는 Supabase 클라이언트는 `persistSession:false`, `autoRefreshToken:false`를 사용합니다. 다른 작품이 기본 설정으로 생성한 클라이언트까지 격리해 주는 것은 아니므로, Play의 작품 간 저장소 공유 문제는 라운지의 기존 결정 문서에 따라 별도로 다룹니다. 이번 연동 작업으로 그 문제가 해결됐다고 안내하지 않습니다.

## 6. 적용 순서와 완료 회신

1. 라운지의 미커밋 Play 허용 변경을 검토하고 최신 원격 코드와 통합합니다.
2. snapshot 보존 migration을 라운지 원장에 추가하고 로컬·staging에서 기존 RPC·GitHub 동기화 회귀 검증을 수행합니다.
3. Play CSP를 검증합니다. 최초 인수는 수동 `SUPABASE_URL` 설정으로 시작할 수 있습니다.
4. 자동 연결을 구현한다면 배포 준비 시 주소 고정, secrets 병합, 실패·재배포 처리를 함께 검증합니다.
5. 실제 학생 시험 계정의 DB로 연결 → 코드 생성 → 게시 → Play 조회·글쓰기 → 주소 변경 → 재배포 → 해제를 확인합니다. 키와 학생 데이터 원문은 검증 기록에 남기지 않습니다.
6. 운영 DB에 migration을 적용하고 라운지를 배포한 뒤 같은 동작을 확인합니다. 결과가 확인되면 에디터 운영 환경의 `EDITOR_SUPABASE_LINK_ENABLED=true`를 설정하고 재배포합니다. 이 플래그는 **에디터 설정**입니다.

회신에는 migration 파일명·적용 환경, 라운지 코드 커밋, 자동 연결 지원 여부, 테스트와 실제 Play 인수 결과, 남은 제약을 적어 주세요. 문제가 생기면 에디터 DB 연결 플래그를 먼저 끄고 기존 연결 metadata를 보존합니다. 이전 snapshot 식으로 단순 복구하면 이후 metadata 저장에서 연결 정보가 사라질 수 있으므로, 함수 rollback은 별도 검토가 필요합니다.

## 참고 자료

- [에디터 SQL 제안서](https://github.com/quirinal36/letscoding-editor/blob/1accdcadb283c0d211efab82066459f6b3191acf/integration/supabase-link-schema.sql)
- [에디터 연결 검증·클라이언트 생성 코드](https://github.com/quirinal36/letscoding-editor/blob/1accdcadb283c0d211efab82066459f6b3191acf/src/lib/supabase-link.ts)
- [라운지 원격 Play 서빙 기준](https://github.com/yudanah/letscoding_lounge/blob/0f7f7d3a3444a70450004aeb4765902cdc987235/src/app/api/internal/play/serve/%5BprojectId%5D/%5B%5B...path%5D%5D/route.ts)
- [라운지 원격 배포 서비스 기준](https://github.com/yudanah/letscoding_lounge/blob/0f7f7d3a3444a70450004aeb4765902cdc987235/src/lib/editor-integration/services.ts)
- 라운지 로컬 작업본의 `docs/23-play-csp-connect-src.md`, `docs/68-play-student-supabase-decision.md`: 작품별 허용 정책과 남은 위험에 관한 검토 자료. 원격 반영 여부는 작업 시 다시 확인합니다.
