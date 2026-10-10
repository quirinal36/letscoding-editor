// User-facing requests; server guidance lives in server/lounge.ts.
export const loungePrompts = [
  "렛츠코딩 라운지 랭킹 시스템 구현해줘.",
  "렛츠코딩 라운지 배포 전용 압축 파일 만들어줘.",
  "라운지 로그인 사용자 이름을 게임 화면에 표시하도록 연동해줘.",
  "이 프로젝트가 렛츠코딩 라운지 정적 배포 정책에 맞는지 검사해줘.",
];
export function loungeIntent(text: string) {
  const lounge = /라운지|\blounge\b/i.test(text);
  const ranking =
    lounge && /랭킹|점수\s*(?:등록|제출)|\branking\b|leaderboard/i.test(text);
  const displayName =
    lounge &&
    /(?:사용자|로그인|플레이어).*(?:이름|닉네임)|display.?name/i.test(text);
  const question =
    /설명|어떻게|무엇|알려|가능한지|인가요|되나요|\b(?:explain|how|what)\b/i.test(
      text,
    );
  const zip = /ZIP|압축\s*파일/i.test(text);
  const action =
    /만들|생성|준비|검사|검증|점검|확인|\b(?:create|make|check|validate)\b/i.test(
      text,
    );
  const artifact =
    lounge && !question && action
      ? zip
        ? ("zip" as const)
        : /정적\s*배포|배포\s*정책/.test(text)
          ? ("check" as const)
          : null
      : null;
  return { ranking, displayName, artifact };
}
