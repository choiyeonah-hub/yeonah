import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "왕벌의 비행 - 여왕벌이 되는 길",
  description:
    "공주벌이 되어 벌집의 방마다 놓인 퀘스트를 해내고, 마지막엔 혼인비행에서 수벌들의 구애춤을 받는 2D 비행 탐험 게임",
};

export default function BeeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
