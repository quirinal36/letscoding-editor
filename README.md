# letscoding-editor

Monaco 코드 편집기, 프로젝트 VFS, 승인 방식 AI 도우미, 격리 미리보기, 라운지 ZIP 배포 연동을 구현한 Next.js 앱입니다.

```sh
npm ci
npm run dev
```

[http://localhost:3100](http://localhost:3100)에서 외부 계정 없이 로컬 데모를 사용할 수 있습니다. 파일·대화는 브라우저 IndexedDB에 저장됩니다. 데모 AI는 예시 변경안을 만들며 실제 배포 대신 ZIP을 검증합니다.

실제 저장·AI·배포는 [`.env.example`](./.env.example)을 참고해 `.env.local`을 채우고 기능을 활성화한 뒤 연결을 검증해야 합니다. AI 예산은 개발 이후 결정하며 초기 유료 호출은 비활성입니다. production에서는 데모를 사용할 수 없습니다.

```sh
npm run check          # 타입, 린트, VFS/ZIP/HMAC/Postgres 테스트
npm run build          # 운영 빌드
npm run test:e2e       # 외부 서비스 없는 Chromium 흐름 검사
npm run check:env      # 비밀값 없이 설정 상태 확인
```

- [구현 결과와 마일스톤별 검증](./docs/05-implementation-status.md)
- [사용자 준비·사람 검토 항목](./docs/04-human-review.md)
- [라운지 코드·공유 DB 반영 검토본](./integration/README.md)
- [선생님 안내](./docs/06-teacher-guide.md)
- [문서 목록과 GitHub 등록 결과](./docs/README.md)

공유 DB migration 원본은 라운지 저장소가 소유합니다. `integration/` SQL과 patch는 미적용 검토본이며, 운영 배포·유료 모델 검증·학생 파일럿을 완료로 간주하지 않습니다.
