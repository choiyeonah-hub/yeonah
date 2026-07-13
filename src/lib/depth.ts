// 하브루타 질문 층위(깊이) 정의 및 나이대별 목표 깊이 로직.
// 레벨이 올라갈수록 "사실 -> 감정 -> 이유 -> 상상/적용 -> 가치판단"으로 깊어진다.

export type DepthLevel = 1 | 2 | 3 | 4 | 5;

export const DEPTH_LADDER: Record<DepthLevel, { label: string; description: string }> = {
  1: { label: "사실 확인", description: "무슨 일이 있었는지 있는 그대로 묻는 질문" },
  2: { label: "감정 탐색", description: "그때 기분이 어땠는지, 왜 그런 감정이 들었는지 묻는 질문" },
  3: { label: "이유 탐구", description: "왜 그런 일이 일어났는지, 원인과 배경을 묻는 질문" },
  4: { label: "상상 · 가정", description: "만약 다르게 했다면 어땠을지 상상해보게 하는 질문" },
  5: { label: "가치 · 적용", description: "오늘의 경험에서 배울 점, 앞으로 어떻게 할지를 묻는 질문" },
};

export type AgeTier = "toddler" | "child" | "preteen" | "teen" | "adult";

export const AGE_TIER_INFO: Record<AgeTier, { label: string; minDepth: DepthLevel; maxDepth: DepthLevel }> = {
  toddler: { label: "유아 (4~7세)", minDepth: 1, maxDepth: 2 },
  child: { label: "어린이 (8~10세)", minDepth: 1, maxDepth: 3 },
  preteen: { label: "초등 고학년 (11~13세)", minDepth: 2, maxDepth: 4 },
  teen: { label: "청소년 (14~18세)", minDepth: 3, maxDepth: 5 },
  adult: { label: "성인", minDepth: 3, maxDepth: 5 },
};

export function ageTierFromBirthYear(birthYear: number | null | undefined, today = new Date()): AgeTier {
  if (!birthYear) return "adult";
  const age = today.getFullYear() - birthYear;
  if (age <= 7) return "toddler";
  if (age <= 10) return "child";
  if (age <= 13) return "preteen";
  if (age <= 18) return "teen";
  return "adult";
}

export function clampDepth(level: number): DepthLevel {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  return clamped as DepthLevel;
}
