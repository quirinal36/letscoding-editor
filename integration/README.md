# 라운지 연동 검토본

이 폴더는 에디터 앱에서 실행하지 않는다. 공유 DB 적용 및 라운지 코드 반영 전 검토할 완성된 계약·SQL·어댑터·배포 코어 변경안이다. 계정 연결 검증은 아직 하지 않았다.

2026-10-04 사용자 결정: 에디터 테이블·함수·시퀀스와 내부 배포 상태는 **`editor` 스키마**를 사용한다. 라운지 계정과 작품은 `public.profiles`, `public.projects`, Supabase Auth/Storage는 각각 기존 `auth`/`storage` 스키마를 유지한다. 테이블명은 `editor.editor_projects`처럼 기존 이름을 유지한다.

migration 적용 뒤 Supabase Data API의 **Exposed schemas**에 `editor`를 기존 항목과 함께 추가해야 한다. SQL 제안서는 `authenticated`와 `service_role`에 schema USAGE를 부여하되 CREATE는 부여하지 않으며, 학생은 RLS에 따라 자기 자료만 조회하고 저장·RPC는 서버 전용이다. 공식 예제의 광범위한 ALL/기본 권한 부여를 추가하지 않는다. [Supabase custom schemas 안내](https://supabase.com/docs/guides/api/using-custom-schemas)

이 제안서는 아직 적용되지 않은 초기 생성용이다. 이미 `public.editor_*`를 적용한 환경이 있다면 이 파일을 그대로 실행하지 않고, 라운지 migration에서 데이터·함수·정책·권한을 확인해 별도의 스키마 이동 migration을 작성한다. 공유 migration 원장과 실제 적용은 계속 라운지 저장소가 소유한다.

1. `editor-schema.sql`을 라운지의 **새 migration**으로 옮긴다. 로컬 Supabase와 staging에서 SQL/RLS/서비스 RPC를 검증한다.
2. `lounge-integration.sql`을 그 다음 새 migration으로 옮긴다. 기존 `projects` 컬럼·enum과 staging 버킷 정책을 대조한다.
3. `lounge-package/{contract,handler,services,internal-auth}.ts`를 라운지 `src/lib/editor-integration/`에 복사한다.
4. `lounge-package/route.ts`를 라운지 `src/app/api/internal/editor/deploy/route.ts`에 복사한다.
5. `lounge-deploy-core.patch`를 `git apply --check`로 확인하고 검토한다. 현재 쿠키 사용자 경로를 유지하며 내부 HMAC 호출만 검증된 서버 사용자로 같은 lease·ZIP 검증·rollback·캐시 처리 코어를 호출한다. Public POST는 trustedEditor 인자를 전달하지 않는다.
6. 라운지 `EDITOR_INTERNAL_API_SECRET`과 에디터 `LOUNGE_INTERNAL_API_SECRET`을 환경별로 같은 값으로 등록한다. 에디터 `LOUNGE_INTERNAL_API_URL`은 새 내부 경로로 지정한다.
7. 라운지 `PLAY_ORIGIN`/migration 모드에 맞는 실제 Play URL을 확인한다. 비공개 작품은 라운지의 owner launch 경로에서 열어야 할 수 있으므로 별도 인수 검증한다.

반영 전 승인·staging 통합 검증은 [사람 검토 문서](../docs/04-human-review.md)를 따른다. 에디터의 signature/replay/권한 테스트는 fake 서비스로 통과했다. 라운지 코어 patch는 현재 대상 저장소의 `git apply --check`를 통과했다. 실제 적용·대상 앱 컴파일은 하지 않은 검토본이다.

`editor_lounge_uploads`는 ZIP SHA와 idempotency key, 소유권, 기한, 원자적 pending→processing, 완료 receipt를 보존한다. 처리 결과가 불확실하면 `needs_review`로 유지하여 중복 작품·재배포를 자동 실행하지 않는다. 만료 pending·오래된 nonce 정리와 thumbnail 실패 후 orphan 정리는 라운지 운영 cron에 연결해 staging에서 점검한다. 썸네일 실패가 ZIP 배포 이후 발생할 수 있으므로 lease 로그와 실제 Storage 상태를 대사한 뒤 재시도한다.
