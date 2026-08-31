import type { RatioResult } from "@/lib/style/types";

const BAND_STYLE: Record<RatioResult["band"], { dot: string; text: string }> = {
  low: { dot: "bg-amber-400", text: "text-amber-700" },
  average: { dot: "bg-emerald-500", text: "text-emerald-700" },
  high: { dot: "bg-sky-500", text: "text-sky-700" },
};

// 평균 구간을 가운데에 두고, 내 값이 어디쯤인지 점으로 찍어 보여준다.
export default function RatioBar({ ratio }: { ratio: RatioResult }) {
  const [min, max] = ratio.averageRange;
  const span = Math.max(max - min, 1e-6);
  const axisMin = min - span * 2;
  const axisMax = max + span * 2;
  const toPercent = (value: number) =>
    Math.max(2, Math.min(98, ((value - axisMin) / (axisMax - axisMin)) * 100));

  const style = BAND_STYLE[ratio.band];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="text-sm font-semibold text-neutral-800">{ratio.label}</h4>
        <p className="text-sm font-semibold text-neutral-900">
          {ratio.display}
          {ratio.estimated && (
            <span className="ml-1 align-middle text-[10px] font-normal text-neutral-400">(추정)</span>
          )}
        </p>
      </div>

      <div className="relative mt-3 h-2 rounded-full bg-neutral-100">
        <div
          className="absolute inset-y-0 rounded-full bg-emerald-100"
          style={{ left: `${toPercent(min)}%`, right: `${100 - toPercent(max)}%` }}
        />
        <div
          className={`absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow ${style.dot}`}
          style={{ left: `${toPercent(ratio.value)}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
        <span>평균 하한 {min}</span>
        <span className={`font-medium ${style.text}`}>{ratio.bandLabel}</span>
        <span>평균 상한 {max}</span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-neutral-600">{ratio.comment}</p>
    </div>
  );
}
