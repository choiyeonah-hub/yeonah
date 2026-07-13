import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "하브루타 톡 - 가족 질문 대화",
  description: "오늘 있었던 일을 가족과 눈 마주치며 나누는 하브루타 질문 대화 앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
