import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "아이핏 - 얼굴에 맞는 안경 찾기",
  description:
    "얼굴 비율과 도수를 함께 보고 안경테와 렌즈를 추천하고, 맞춤 제작이나 안경원 가격 비교로 이어주는 앱",
};

const NAV = [
  { href: "/fit", label: "안경 찾기" },
  { href: "/factories", label: "제휴 공장" },
  { href: "/how-it-works", label: "구조와 법" },
  { href: "/landscape", label: "경쟁 서비스" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <header className="border-b border-ink-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-ink-900">
              아이핏 <span className="text-sm font-normal text-ink-600">EyeFit</span>
            </Link>
            <nav className="flex gap-3 text-sm text-ink-700">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-ink-900 hover:underline">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 pt-4 text-xs leading-relaxed text-ink-600">
          <p>
            아이핏은 의료기기가 아니며 진단·처방을 하지 않습니다. 시력 교정에 관한 판단은 안과 의사와
            안경사의 검사 결과를 따르세요.
          </p>
          <p className="mt-1">
            도수 렌즈의 조제·판매는 「의료기사 등에 관한 법률」에 따라 안경사만 할 수 있고
            전자상거래로는 판매할 수 없습니다. 아이핏은 테 제작·판매와 안경원 연결까지만 맡습니다.
          </p>
        </footer>
      </body>
    </html>
  );
}
