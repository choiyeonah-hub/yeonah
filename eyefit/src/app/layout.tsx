import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "렌즈값 계산기 - 내 도수에 정말 그 렌즈가 필요한가",
  description:
    "도수와 테 치수로 굴절률별 안경 렌즈 두께를 계산해, 더 비싼 렌즈가 값을 하는지 mm 단위로 보여주는 도구",
};

const NAV = [
  { href: "/check", label: "계산하기" },
  { href: "/quotes", label: "가격 제보" },
  { href: "/how-it-works", label: "계산 방식" },
  { href: "/landscape", label: "경쟁 서비스" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <header className="border-b border-ink-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-ink-900">
              렌즈값 계산기
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
            이 도구는 의료기기가 아니며 진단·처방을 하지 않습니다. 렌즈 두께는 광학 공식으로 낸
            참고용 추정이고, 최종 판단은 검안한 안경사의 몫입니다.
          </p>
          <p className="mt-1">
            안경을 팔지 않습니다. 도수 렌즈의 조제·판매는 「의료기사 등에 관한 법률」에 따라
            안경사만 할 수 있습니다. 여기서는 계산과 비교만 합니다.
          </p>
        </footer>
      </body>
    </html>
  );
}
