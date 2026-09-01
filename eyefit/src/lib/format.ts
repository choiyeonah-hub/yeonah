/** 12800 → "128,000원" */
export function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 도수는 부호와 소수점 둘째 자리를 항상 붙여 쓴다. (-2.25, +1.50) */
export function diopter(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2)}`;
}
