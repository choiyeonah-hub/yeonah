import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개미집 탐험대 - 작아진 내가 땅속으로",
  description:
    "손톱만큼 작아진 탐험가가 되어 땅속 개미집을 파고 내려가 먹이를 모으고 여왕개미를 만나는 2D 탐험 게임",
};

export default function AntLayout({ children }: { children: React.ReactNode }) {
  return children;
}
