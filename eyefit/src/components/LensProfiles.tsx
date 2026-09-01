"use client";

import type { IndexOption } from "@/lib/advice";
import { LENS_INDEXES } from "@/lib/lenses";
import { radiusForPower, sagitta } from "@/lib/optics";
import { won } from "@/lib/format";

/**
 * 굴절률별 렌즈 단면을 같은 축척으로 겹쳐 보여준다.
 *
 * 이 그림이 이 앱의 핵심 논거다. "1.67과 1.74는 0.4mm 차이"라는 문장보다,
 * 가로세로 같은 배율로 그린 단면 네 개를 나란히 놓는 쪽이 훨씬 정직하다.
 * 차이가 눈에 안 보이면, 그게 바로 답이다.
 *
 * 강조는 하나만 한다(추천 항목). 나머지는 같은 계열의 옅은 색으로 물러나게 둔다.
 */

/** 단면 윤곽을 그릴 때 x축을 몇 등분해 표본할지. */
const SAMPLES = 48;

/**
 * 렌즈 단면의 위/아래 윤곽선 경로.
 *
 * 중심에서 x만큼 떨어진 지점의 두께는
 *   근시(마이너스): 중심두께 + 새그   → 가장자리가 두껍다
 *   원시(플러스):   중심두께 − 새그   → 가장자리가 얇다
 * 위아래 대칭으로 그린다. 실제 렌즈는 앞면이 볼록한 메니스커스 형태지만,
 * 여기서 비교하려는 건 곡률이 아니라 두께라서 대칭 단면이 읽기 쉽다.
 */
function profilePath(params: {
  halfDiameter: number;
  centerThickness: number;
  powerD: number;
  index: string;
  viewHeight: number;
}): string {
  const { halfDiameter, centerThickness, powerD, index, viewHeight } = params;
  const radius = radiusForPower(powerD, Number(index));
  const sign = powerD < 0 ? 1 : -1;
  const midY = viewHeight / 2;

  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const x = -halfDiameter + (2 * halfDiameter * i) / SAMPLES;
    const sag = Number.isFinite(radius) ? sagitta(radius, Math.abs(x)) : 0;
    const t = Math.max(0.15, centerThickness + sign * sag);
    const px = x + halfDiameter;
    top.push(`${px.toFixed(2)},${(midY - t / 2).toFixed(2)}`);
    bottom.push(`${px.toFixed(2)},${(midY + t / 2).toFixed(2)}`);
  }
  return `M ${top.join(" L ")} L ${bottom.reverse().join(" L ")} Z`;
}

export default function LensProfiles({
  options,
  halfDiameter,
  powerD,
}: {
  options: IndexOption[];
  halfDiameter: number;
  powerD: number;
}) {
  const isMinus = powerD < 0;
  // 네 단면을 같은 배율로 그려야 비교가 된다. 가장 두꺼운 값에 맞춰 높이를 고정한다.
  const maxThickness = Math.max(...options.map((o) => Math.max(o.edgeThickness, o.centerThickness)));
  const viewHeight = maxThickness + 1;
  const viewWidth = halfDiameter * 2;

  return (
    <figure className="space-y-3">
      <figcaption className="text-sm text-ink-700">
        굴절률별 렌즈 단면 — 가로세로 <strong>같은 배율</strong>로 그렸습니다. 지름{" "}
        {viewWidth.toFixed(0)}mm 안에서의 실제 두께 비율입니다.
      </figcaption>

      <ul className="space-y-2">
        {options.map((o) => {
          const key = isMinus ? o.edgeThickness : o.centerThickness;
          return (
            <li key={o.index} className="flex items-center gap-3">
              <span
                className={`w-12 shrink-0 text-sm tabular-nums ${
                  o.isRecommended ? "font-bold text-ink-900" : "text-ink-600"
                }`}
              >
                {o.index}
              </span>

              <svg
                viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-10 min-w-0 flex-1"
                role="img"
                aria-label={`굴절률 ${o.index} 렌즈 단면, ${isMinus ? "가장자리" : "중심"} 두께 ${key}mm`}
              >
                <path
                  d={profilePath({
                    halfDiameter,
                    centerThickness: o.centerThickness,
                    powerD,
                    index: o.index,
                    viewHeight,
                  })}
                  fill={o.isRecommended ? "#356878" : "#c3dce0"}
                />
              </svg>

              <span
                className={`w-16 shrink-0 text-right text-sm tabular-nums ${
                  o.isRecommended ? "font-bold text-ink-900" : "text-ink-700"
                }`}
              >
                {key.toFixed(2)}mm
              </span>
            </li>
          );
        })}
      </ul>

      {/* 그림은 감을 주고, 숫자는 표가 준다. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-sm">
          <caption className="sr-only">굴절률별 두께·무게·가격 비교</caption>
          <thead>
            <tr className="border-b border-ink-200 text-xs text-ink-600">
              <th className="py-2 text-left font-medium">굴절률</th>
              <th className="whitespace-nowrap py-2 text-right font-medium">
                {isMinus ? "가장자리" : "중심"} 두께
              </th>
              <th className="whitespace-nowrap py-2 text-right font-medium">무게</th>
              <th className="whitespace-nowrap py-2 text-right font-medium">렌즈 값</th>
              <th className="whitespace-nowrap py-2 pl-3 text-right font-medium">한 단계 올리면</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {options.map((o) => {
              const key = isMinus ? o.edgeThickness : o.centerThickness;
              return (
                <tr key={o.index} className={o.isRecommended ? "bg-ink-50" : undefined}>
                  <td className="py-2 text-left">
                    <span
                      className={`block tabular-nums ${o.isRecommended ? "font-bold text-ink-900" : "text-ink-800"}`}
                    >
                      {o.index}
                    </span>
                    <span
                      className={`block whitespace-nowrap text-xs ${
                        o.isRecommended ? "font-medium text-ink-700" : "text-ink-600"
                      }`}
                    >
                      {LENS_INDEXES[o.index].label.replace(/^[\d.]+\s*/, "").replace(/[()]/g, "")}
                      {o.isRecommended && " · 여기까지"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums text-ink-900">
                    {key.toFixed(2)}mm
                  </td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums text-ink-700">
                    {o.weightGram}g
                  </td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums text-ink-900">
                    {won(o.price)}
                  </td>
                  <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums text-ink-700">
                    {o.gainOverCheaperMm == null ? (
                      "—"
                    ) : o.gainOverCheaperMm <= 0 ? (
                      <span className="text-xs">차이 없음</span>
                    ) : (
                      <>
                        −{o.gainOverCheaperMm}mm
                        {o.wonPerTenthMm != null && (
                          <span className="block text-xs text-ink-600">
                            0.1mm당 {(o.wonPerTenthMm / 10000).toFixed(1)}만원
                          </span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
