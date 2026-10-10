import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Let's Coding Studio",
  description: "아이디어를 코드로, 나만의 작품을 세상으로.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
