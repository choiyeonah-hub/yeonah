import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 퍼스널컬러 · 체형 스타일링",
  description:
    "얼굴 사진으로 12타입 퍼스널컬러를 진단하고, 얼굴·다리·팔 비율을 계산해 옷·구두·가방을 색값(HEX)과 cm 수치까지 추천합니다.",
};

export default function StyleLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-50 text-neutral-900">{children}</div>;
}
