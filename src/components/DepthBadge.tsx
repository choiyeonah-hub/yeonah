const COLORS: Record<number, string> = {
  1: "bg-sky-100 text-sky-700",
  2: "bg-emerald-100 text-emerald-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-rose-100 text-rose-700",
};

export default function DepthBadge({ level, label }: { level: number | null | undefined; label?: string | null }) {
  if (!level) return null;
  const color = COLORS[level] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <span>{"●".repeat(level)}</span>
      <span>{label ?? `${level}단계`}</span>
    </span>
  );
}
