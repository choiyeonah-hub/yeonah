/** 제보가 이 개수는 넘어야 통계를 보여준다. 서너 건으로 "평균"을 말하면 오해를 준다. */
export const MIN_REPORTS = 5;

export type PriceStats = {
  count: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

/**
 * 제보된 금액의 분포를 낸다.
 *
 * 평균 대신 중앙값과 사분위를 쓴다. 소수의 아주 비싼 견적이 평균을 끌어올려
 * "이 정도가 보통"이라는 잘못된 인상을 주는 걸 막기 위해서다.
 */
export function priceStats(prices: number[]): PriceStats | null {
  if (prices.length < MIN_REPORTS) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  return {
    count: sorted.length,
    median: quantile(sorted, 0.5),
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}
