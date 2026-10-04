# 에디터 작업 규약

- `docs/README.md`와 `docs/04-human-review.md`를 먼저 확인한다.
- Next.js API 변경은 설치된 `node_modules/next/dist/docs/`를 확인한다.
- 공유 DB migration 원본과 적용은 라운지 저장소가 소유한다. 이 저장소의 `integration/` SQL은 미적용 제안이며 독립 migration 원장이 아니다.
- `.env.local` 값을 출력하거나 커밋하지 않는다. 설정이 없으면 개발 데모를 사용하고 운영 API는 차단한다.
- 유료 호출은 예산·모델·기능 활성화가 모두 설정되어야 한다. 비밀키를 채운 것만으로 AI를 활성화하지 않는다.
- 사용자 코드를 서버에서 실행하지 않는다. 미리보기는 opaque-origin sandbox에서만 실행한다.
- `npm run check`, `npm run build`, `npm run test:e2e`로 변경 범위를 검증한다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
