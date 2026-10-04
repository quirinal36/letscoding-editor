"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="ko">
      <body>
        <main>
          <h1>작업 공간을 다시 열어주세요.</h1>
          <p>최근 저장된 작업은 프로젝트를 다시 열면 확인할 수 있습니다.</p>
          <button onClick={reset}>다시 시도</button>
        </main>
      </body>
    </html>
  );
}
