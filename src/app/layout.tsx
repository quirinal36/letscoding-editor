import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "렛츠코딩 에디터",
  description: "아이디어를 코드로, 나만의 작품을 세상으로.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
