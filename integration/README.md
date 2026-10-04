# 라운지 연동 검토본

이 폴더는 에디터 앱에서 실행하지 않는다. 공유 DB 적용 및 라운지 코드 반영 전 검토할 완성된 계약·SQL·어댑터·배포 코어 변경안이다. 계정 연결 검증은 아직 하지 않았다.

1. `editor-schema.sql`을 라운지의 **새 migration**으로 옮긴다. 로컬 Supabase와 staging에서 SQL/RLS/서비스 RPC를 검증한다.
2. `lounge-integration.sql`을 그 다음 새 migration으로 옮긴다. 기존 `projects` 컬럼·enum과 staging 버킷 정책을 대조한다.
3. `lounge-package/{contract,handler,services,internal-auth}.ts`를 라운지 `src/lib/editor-integration/`에 복사한다.
4. `lounge-package/route.ts`를 라운지 `src/app/api/internal/editor/deploy/route.ts`에 복사한다.
5. `lounge-deploy-core.patch`를 `git apply --check`로 확인하고 검토한다. 현재 쿠키 사용자 경로를 유지하며 내부 HMAC 호출만 검증된 서버 사용자로 같은 lease·ZIP 검증·rollback·캐시 처리 코어를 호출한다. Public POST는 trustedEditor 인자를 전달하지 않는다.
6. 라운지 `EDITOR_INTERNAL_API_SECRET`과 에디터 `LOUNGE_INTERNAL_API_SECRET`을 환경별로 같은 값으로 등록한다. 에디터 `LOUNGE_INTERNAL_API_URL`은 새 내부 경로로 지정한다.
7. 라운지 `PLAY_ORIGIN`/migration 모드에 맞는 실제 Play URL을 확인한다. 비공개 작품은 라운지의 owner launch 경로에서 열어야 할 수 있으므로 별도 인수 검증한다.

반영 전 승인·staging 통합 검증은 [사람 검토 문서](../docs/04-human-review.md)를 따른다. 에디터의 signature/replay/권한 테스트는 fake 서비스로 통과했다. 라운지 코어 patch는 현재 대상 저장소의 `git apply --check`를 통과했다. 실제 적용·대상 앱 컴파일은 하지 않은 검토본이다.

`editor_lounge_uploads`는 ZIP SHA와 idempotency key, 소유권, 기한, 원자적 pending→processing, 완료 receipt를 보존한다. 처리 결과가 불확실하면 `needs_review`로 유지하여 중복 작품·재배포를 자동 실행하지 않는다. 만료 pending·오래된 nonce 정리와 thumbnail 실패 후 orphan 정리는 라운지 운영 cron에 연결해 staging에서 점검한다. 썸네일 실패가 ZIP 배포 이후 발생할 수 있으므로 lease 로그와 실제 Storage 상태를 대사한 뒤 재시도한다.
