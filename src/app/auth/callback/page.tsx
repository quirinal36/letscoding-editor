"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/client";
export default function Callback() {
  const [message, setMessage] = useState("로그인 확인 중…");
  useEffect(() => {
    const code = new URLSearchParams(location.search).get("code");
    if (!code) {
      queueMicrotask(() =>
        setMessage(
          "로그인 코드가 없습니다. 로그인 화면에서 다시 시도해주세요.",
        ),
      );
      return;
    }
    browserSupabase()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error)
          setMessage("로그인 링크가 만료되었습니다. 새 링크를 요청해주세요.");
        else location.replace("/");
      });
  }, []);
  return (
    <main className="login-screen">
      <p>{message}</p>
      <Link href="/">에디터로 돌아가기</Link>
    </main>
  );
}
