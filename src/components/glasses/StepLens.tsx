"use client";

import { useEffect, useMemo, useState } from "react";
import { findFrame } from "@/lib/glasses/frames";
import { won } from "@/lib/glasses/format";
import {
  LENS_INDEXES,
  LENS_INDEX_IDS,
  LENS_OPTIONS,
  LENS_OPTION_IDS,
  lensListPrice,
  recommendLens,
  supportsProgressive,
} from "@/lib/glasses/lenses";
import type { LensIndexId, LensOptionId, Prescription } from "@/lib/glasses/types";
import { Callout } from "./Section";

export default function StepLens({
  frameId,
  prescription,
  screenHours,
  outdoorHeavy,
  lensIndex,
  lensOptions,
  onChange,
  onNext,
  onBack,
}: {
  frameId: string;
  prescription: Prescription | null;
  screenHours: number;
  outdoorHeavy: boolean;
  lensIndex: LensIndexId;
  lensOptions: LensOptionId[];
  onChange: (patch: { lensIndex?: LensIndexId; lensOptions?: LensOptionId[] }) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const frame = findFrame(frameId);
  const rec = useMemo(
    () => recommendLens({ prescription, screenHours, outdoorHeavy }),
    [prescription, screenHours, outdoorHeavy]
  );
  // 추천값을 한 번만 자동 적용하고, 그 뒤로는 사용자가 바꾼 걸 덮어쓰지 않는다.
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (applied) return;
    onChange({ lensIndex: rec.index, lensOptions: rec.options });
    setApplied(true);
  }, [applied, rec, onChange]);

  function toggleOption(id: LensOptionId) {
    const next = lensOptions.includes(id)
      ? lensOptions.filter((o) => o !== id)
      : [...lensOptions, id];
    onChange({ lensOptions: next });
  }

  const progressiveBlocked =
    frame != null && lensOptions.includes("progressive") && !supportsProgressive(frame);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-havruta-300 bg-havruta-50 p-4">
        <p className="font-semibold text-havruta-900">추천 사양</p>
        <ul className="mt-2 space-y-1 text-sm text-havruta-800">
          {rec.reasons.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
        {rec.cautions.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-amber-800">
            {rec.cautions.map((c) => (
              <li key={c}>⚠ {c}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 font-semibold text-havruta-900">굴절률 (렌즈 두께)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LENS_INDEX_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ lensIndex: id })}
              className={`rounded-xl border p-3 text-left ${
                lensIndex === id
                  ? "border-havruta-500 bg-havruta-50 ring-2 ring-havruta-200"
                  : "border-havruta-200 bg-white hover:border-havruta-400"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-havruta-900">{LENS_INDEXES[id].label}</span>
                <span className="text-sm text-havruta-700">{won(LENS_INDEXES[id].price)}</span>
              </div>
              <p className="mt-1 text-xs text-havruta-600">{LENS_INDEXES[id].description}</p>
              {id === rec.index && (
                <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                  도수 기준 추천
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-semibold text-havruta-900">코팅 · 기능</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LENS_OPTION_IDS.map((id) => {
            const on = lensOptions.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleOption(id)}
                className={`rounded-xl border p-3 text-left ${
                  on
                    ? "border-havruta-500 bg-havruta-50 ring-2 ring-havruta-200"
                    : "border-havruta-200 bg-white hover:border-havruta-400"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-havruta-900">{LENS_OPTIONS[id].label}</span>
                  <span className="text-sm text-havruta-700">
                    {LENS_OPTIONS[id].price === 0 ? "포함" : `+${won(LENS_OPTIONS[id].price)}`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-havruta-600">{LENS_OPTIONS[id].description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {progressiveBlocked && frame && (
        <Callout tone="warn">
          고른 테({frame.name})의 렌즈 세로폭이 {frame.lensHeight}mm라 누진 근용부가 들어가지
          않습니다. 세로폭 34mm 이상인 테로 바꾸거나 누진 옵션을 빼주세요.
        </Callout>
      )}

      <div className="rounded-xl bg-white p-4 text-sm text-havruta-800 ring-1 ring-havruta-200">
        렌즈 정가 합계 <strong>{won(lensListPrice(lensIndex, lensOptions))}</strong> — 매장 할인은 다음
        단계에서 비교합니다.
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-havruta-700 underline">
          이전
        </button>
        <button
          type="button"
          disabled={progressiveBlocked}
          onClick={onNext}
          className="rounded-xl bg-havruta-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
        >
          다음: 안경원 가격 비교
        </button>
      </div>
    </div>
  );
}
