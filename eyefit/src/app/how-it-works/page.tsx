import Link from "next/link";
import { VISIBLE_GAIN_MM } from "@/lib/advice";
import { LENS_DENSITY, LENS_SHAPE_FACTOR, MINUS_CENTER_THICKNESS } from "@/lib/optics";
import { LENS_INDEX_IDS } from "@/lib/lenses";

export const metadata = { title: "계산 방식 - 렌즈값 계산기" };

/**
 * 계산식을 전부 공개하는 페이지.
 *
 * 이 도구의 유일한 자산은 신뢰다. "우리 AI가 추천합니다"라고 하면
 * 안경원의 "제가 보기엔 1.74 가셔야죠"와 다를 게 없다. 그래서 공식과
 * 가정, 한계를 그대로 내놓고 사용자가 직접 검산할 수 있게 한다.
 */
export default function HowItWorks() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-ink-900">계산 방식</h1>
        <p className="mt-3 text-ink-800">
          이 도구의 결론을 믿을 이유는 하나뿐입니다 — <strong>계산을 직접 확인할 수 있다는 것.</strong>{" "}
          그래서 공식과 가정, 그리고 이 계산이 못 하는 것까지 전부 적어둡니다.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">1. 렌즈 두께는 새그(sagitta)로 정해집니다</h2>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 text-sm leading-relaxed text-ink-800">
          <p>
            곡면에서 중심으로부터 h만큼 떨어진 지점이 얼마나 처지는지를 새그라고 합니다. 반지름이
            r인 구면에서
          </p>
          <pre className="my-3 overflow-x-auto rounded-lg bg-ink-50 p-3 text-xs text-ink-900">
{`s = r − √(r² − h²)`}
          </pre>
          <p>
            도수 F(디옵터)와 굴절률 n으로 반지름을 구합니다. F = (n−1)/r 이므로
          </p>
          <pre className="my-3 overflow-x-auto rounded-lg bg-ink-50 p-3 text-xs text-ink-900">
{`r[mm] = (n − 1) × 1000 / |F|`}
          </pre>
          <p>
            굴절률이 높을수록 r이 커지고(면이 완만해지고), 새그가 작아져 렌즈가 얇아집니다.
            흔히 쓰는 h²/2r 근사식은 도수가 높고 렌즈가 크면 오차가 커져서 쓰지 않았습니다.
          </p>
          <p className="mt-2">
            근시(마이너스)는 중심 두께를 {MINUS_CENTER_THICKNESS}mm로 고정하고 가장자리가
            두꺼워집니다. 원시(플러스)는 반대로 가장자리를 고정하고 중심이 두꺼워집니다.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">2. h는 테 치수와 PD에서 나옵니다</h2>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 text-sm leading-relaxed text-ink-800">
          <p>
            테의 광학중심 간격(렌즈폭 + 브릿지)이 착용자의 PD보다 넓으면, 렌즈를 코 쪽으로
            편심시켜 깎습니다. 그만큼 바깥쪽이 광학중심에서 멀어지고 더 두꺼워집니다.
          </p>
          <pre className="my-3 overflow-x-auto rounded-lg bg-ink-50 p-3 text-xs text-ink-900">
{`편심 = (렌즈폭 + 브릿지 − PD) / 2
h = √( (렌즈폭/2 × ${LENS_SHAPE_FACTOR} + 편심)² + (세로폭/2 × ${LENS_SHAPE_FACTOR})² )`}
          </pre>
          <p>
            {LENS_SHAPE_FACTOR}을 곱하는 이유는, 실제 렌즈가 사각형이 아니라 모서리가 둥글게
            깎여 나가기 때문입니다. 이 보정을 안 하면 두께를 실제보다 크게 계산하게 됩니다.
          </p>
          <p className="mt-2">
            난시가 있으면 두 경선의 도수가 다릅니다. 두께는 절댓값이 큰 쪽이 정하므로{" "}
            <code>SPH</code>와 <code>SPH+CYL</code> 중 큰 쪽을 씁니다.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">3. 추천 규칙</h2>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 text-sm leading-relaxed text-ink-800">
          <p>싼 굴절률부터 훑으면서, 둘 중 하나라도 만족하는 첫 번째를 추천합니다.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>테 안에 숨을 만큼 얇거나 (풀테 5mm, 하금테 3.5mm, 무테 3mm 이하)</li>
            <li>
              더 올려봐야 <strong>{VISIBLE_GAIN_MM}mm 미만</strong>밖에 안 얇아지거나
            </li>
          </ol>
          <p className="mt-3">
            둘을 <strong>OR</strong>로 묶은 게 중요합니다. 목표 두께만 쓰면 아슬아슬하게 넘길 때
            가장 비싼 렌즈로 튀어버리고, 차이만 쓰면 아주 두꺼운 렌즈를 그냥 넘깁니다.
          </p>
          <p className="mt-3">
            {VISIBLE_GAIN_MM}mm라는 선은 저희가 정한 것이고, 동의하지 않으실 수 있습니다. 그래서
            결과 화면에 <strong>네 굴절률의 두께를 모두</strong> 보여드립니다. 추천을 무시하고
            직접 고르셔도 됩니다.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">4. 무게 — 얇다고 가볍지 않습니다</h2>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 text-sm leading-relaxed text-ink-800">
          <p>굴절률이 높은 재료일수록 밀도도 높습니다.</p>
          <table className="mt-3 w-full max-w-xs text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-xs text-ink-600">
                <th className="py-1 text-left font-medium">굴절률</th>
                <th className="py-1 text-right font-medium">밀도 (g/cm³)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {LENS_INDEX_IDS.map((id) => (
                <tr key={id}>
                  <td className="py-1 text-left tabular-nums">{id}</td>
                  <td className="py-1 text-right tabular-nums">{LENS_DENSITY[id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3">
            그래서 1.74로 올려도 얇아진 만큼 가벼워지지는 않습니다. 결과 화면에 무게를 함께
            띄우는 이유입니다. 무게는 렌즈 면적(렌즈폭 × 세로폭의 85%) × 평균 두께 × 밀도로
            추정합니다.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-900">이 계산이 못 하는 것</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-amber-900">
          <li>
            · <strong>제조사별 렌즈 설계</strong>를 반영하지 못합니다. 같은 굴절률이라도 비구면
            설계나 베이스커브에 따라 실제 두께가 달라집니다.
          </li>
          <li>
            · <strong>테 모양</strong>을 렌즈폭×세로폭 사각형에 계수를 곱해 근사합니다. 아주 둥근
            테나 캣아이처럼 특이한 모양은 오차가 더 큽니다.
          </li>
          <li>
            · <strong>누진렌즈</strong>의 두께는 설계에 따라 크게 달라져서, 이 계산은 단초점
            기준으로 봐야 합니다.
          </li>
          <li>
            · 코팅의 효능에 대한 판단은 일반적인 연구 동향을 요약한 것이고,{" "}
            <strong>의학적 조언이 아닙니다.</strong>
          </li>
        </ul>
        <p className="mt-3 text-sm text-amber-900">
          그래서 이 도구의 목적은 &ldquo;안경사보다 정확한 값&rdquo;이 아니라, 매장에서{" "}
          <strong>같은 단위로 대화할 수 있는 기준</strong>을 만드는 것입니다.
        </p>
      </section>

      <Link href="/check" className="block text-center text-sm text-ink-700 underline">
        계산해보기
      </Link>
    </div>
  );
}
