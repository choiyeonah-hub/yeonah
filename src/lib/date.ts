// KST(Asia/Seoul) 기준 오늘 날짜 문자열(YYYY-MM-DD)을 반환한다.
export function todayKstString(): string {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const d = String(kst.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateStringNDaysAgo(n: number, from = todayKstString()): string {
  const d = new Date(`${from}T00:00:00+09:00`);
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
