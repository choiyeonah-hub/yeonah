"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import FrameSizeInput from "@/components/FrameSizeInput";
import LensProfiles from "@/components/LensProfiles";
import PrescriptionInput from "@/components/PrescriptionInput";
import { Callout, Field } from "@/components/Section";
import { adviseLens, VISIBLE_GAIN_MM, type FrameSpec } from "@/lib/advice";
import { won } from "@/lib/format";
import { LENS_INDEXES } from "@/lib/lenses";
import type { Prescription } from "@/lib/types";

const DEFAULT_FRAME: FrameSpec = { lensWidth: 50, bridge: 18, lensHeight: 38, rim: "full" };

const VERDICT_STYLE = {
  필요: "bg-emerald-100 text-emerald-900",
  선택: "bg-ink-100 text-ink-800",
  "근거 약함": "bg-amber-100 text-amber-900",
} as const;

/** 도수가 하나라도 들어왔는지. 빈 폼에 결과를 보여주면 오해를 준다. */
function hasPower(rx: Prescription | null): rx is Prescription {
  return rx != null && (rx.right.sph != null || rx.left.sph != null);
}

export default function CheckPage() {
  // 도수는 이 컴포넌트의 메모리에만 있다. localStorage에도, DB에도 넣지 않는다.
  const [rx, setRx] = useState<Prescription | null>(null);
  const [frame, setFrame] = useState<FrameSpec>(DEFAULT_FRAME);
  const [screenHours, setScreenHours] = useState(6);
  const [outdoorHeavy, setOutdoorHeavy] = useState(false);

  const advice = useMemo(() => {
    if (!hasPower(rx)) return null;
    return adviseLens({ prescription: rx, frame, screenHours, outdoorHeavy });
  }, [rx, frame, screenHours, outdoorHeavy]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-ink-900">내 도수에 정말 그 렌즈가 필요한가</h1>
        <p className="mt-2 text-ink-800">
          도수와 테 치수만 넣으면 굴절률별로 렌즈가 실제 몇 mm가 되는지 계산합니다. 값을 바꾸면
          결과가 바로 갱신됩니다.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">1. 도수</h2>
        <PrescriptionInput prescription={rx} onChange={setRx} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">2. 테 치수</h2>
        <FrameSizeInput frame={frame} onChange={setFrame} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">3. 생활 환경</h2>
        <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 sm:grid-cols-2">
          <Field label={`하루 화면 보는 시간: ${screenHours}시간`}>
            <input
              type="range"
              min={0}
              max={14}
              value={screenHours}
              onChange={(e) => setScreenHours(Number(e.target.value))}
              className="w-full accent-ink-500"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              checked={outdoorHeavy}
              onChange={(e) => setOutdoorHeavy(e.target.checked)}
            />
            야외 활동이 많은 편입니다
          </label>
        </div>
      </section>

      {!advice ? (
        <Callout>구면 도수(SPH)를 한쪽이라도 넣으면 결과가 나옵니다.</Callout>
      ) : (
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-ink-900">결과</h2>

          <div className="rounded-2xl border border-ink-300 bg-ink-50 p-5">
            <p className="text-xl font-bold leading-snug text-ink-900">{advice.headline}</p>
            <ul className="mt-3 space-y-1 text-sm text-ink-800">
              {advice.reasons.map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <LensProfiles
              options={advice.options}
              halfDiameter={advice.halfDiameter}
              powerD={advice.powerD}
            />
            <p className="mt-3 text-xs leading-relaxed text-ink-600">
              두께는 렌즈에서 <strong>가장 두꺼운 지점</strong>(바깥쪽 위/아래 모서리) 기준입니다.
              둥근 테는 모서리가 깎여 나가 이보다 조금 얇습니다. 이 앱은 굴절률 차이가{" "}
              <strong>{VISIBLE_GAIN_MM}mm 미만이면 눈으로 구분하기 어렵다</strong>고 보고 추천을
              정합니다. 계산식은 <Link href="/how-it-works" className="underline">계산 방식</Link>{" "}
              페이지에 전부 공개해 두었습니다.
            </p>
          </div>

          {advice.smallerFrame && advice.smallerFrame.savedMm > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-bold text-emerald-900">렌즈보다 테를 바꾸는 게 쌀 수 있습니다</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900">
                지금 테({frame.lensWidth}mm)에서 렌즈폭이 <strong>{advice.smallerFrame.lensWidth}mm</strong>
                인 테로 바꾸면, 같은 굴절률로도 두께가{" "}
                <strong>{advice.smallerFrame.savedMm}mm 줄어듭니다</strong> (
                {advice.smallerFrame.edgeThickness.toFixed(2)}mm).
              </p>
              <p className="mt-2 text-sm text-emerald-900">
                굴절률을 한 단계 올려서 얻는 게 보통{" "}
                {advice.options.find((o) => o.isRecommended)?.gainOverCheaperMm ?? "0.5"}mm 안팎이니,
                <strong> 작은 테를 고르는 편이 돈을 덜 쓰고 더 얇아지는 경우가 많습니다.</strong>
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-bold text-ink-900">코팅·기능은 어떤가</h3>
            <ul className="mt-3 space-y-3">
              {advice.optionVerdicts.map((o) => (
                <li key={o.id} className="border-b border-ink-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-ink-900">{o.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-ink-700">
                        {o.price === 0 ? "포함" : `+${won(o.price)}`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_STYLE[o.verdict]}`}
                      >
                        {o.verdict}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-700">{o.reason}</p>
                </li>
              ))}
            </ul>
          </div>

          {advice.cautions.length > 0 && (
            <Callout tone="warn" title="매장에서 꼭 확인하세요">
              {advice.cautions.map((c) => (
                <p key={c}>· {c}</p>
              ))}
            </Callout>
          )}

          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-bold text-ink-900">매장에서 이렇게 물어보세요</h3>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-ink-800">
              <li>
                · &ldquo;제 도수 {advice.powerD.toFixed(2)}D에 이 테({frame.lensWidth}□{frame.bridge})면{" "}
                {LENS_INDEXES[advice.recommended].label}로 가장자리 몇 mm 나오나요?&rdquo;
              </li>
              <li>· &ldquo;한 단계 올리면 몇 mm 얇아지나요? 그 차이에 얼마 더 드나요?&rdquo;</li>
              <li>· &ldquo;반사 방지 코팅은 렌즈 값에 포함인가요, 별도인가요?&rdquo;</li>
              <li>· &ldquo;PD 측정해 주시고, 편심량이 얼마인지 알려주실 수 있나요?&rdquo;</li>
            </ul>
            <p className="mt-3 text-xs text-ink-600">
              이 계산은 참고용 추정입니다. 실제 두께는 렌즈 제조사의 설계와 테 모양에 따라
              달라지고, 최종 판단은 검안한 안경사의 몫입니다.
            </p>
          </div>

          <Link
            href="/quotes"
            className="block rounded-xl bg-ink-600 py-3 text-center font-semibold text-white"
          >
            다른 사람들은 얼마 냈는지 보기
          </Link>
        </section>
      )}
    </div>
  );
}
