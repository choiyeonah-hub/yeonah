import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아이핏 - 얼굴에 맞는 안경 찾기",
  description:
    "얼굴 비율과 도수를 함께 보고 안경테와 렌즈를 추천하고, 동네·전국 안경원 가격을 비교해 방문 예약까지 하는 앱",
};

export default function GlassesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffaf2]">
      <header className="border-b border-havruta-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/glasses" className="text-lg font-bold text-havruta-900">
            아이핏 <span className="text-sm font-normal text-havruta-600">EyeFit</span>
          </Link>
          <Link href="/" className="text-xs text-havruta-600 underline">
            하브루타 톡으로
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-4 text-xs leading-relaxed text-havruta-600">
        <p>
          아이핏은 의료기기가 아니며 진단·처방을 하지 않습니다. 시력 교정에 관한 판단은 안과 의사와
          안경사의 검사 결과를 따르세요.
        </p>
        <p className="mt-1">
          도수 안경·콘택트렌즈는 「의료기사 등에 관한 법률」에 따라 안경사만 판매할 수 있고
          전자상거래로는 판매할 수 없습니다. 이 앱은 추천과 방문 예약까지만 제공합니다.
        </p>
      </footer>
    </div>
  );
}
