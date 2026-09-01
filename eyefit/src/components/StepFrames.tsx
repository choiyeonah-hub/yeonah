"use client";

import { useMemo, useState } from "react";
import { FRAME_SHAPE_LABEL } from "@/lib/faceShapes";
import { rankFrames } from "@/lib/fit";
import { findFrame } from "@/lib/frames";
import { won } from "@/lib/format";
import { effectivePower } from "@/lib/lenses";
import type { CustomSpec, FaceAnalysis, FrameMode, Prescription } from "@/lib/types";
import CustomDesigner from "./CustomDesigner";
import FrameSvg from "./FrameSvg";
import { Callout } from "./Section";
import TryOn from "./TryOn";

const RIM_LABEL = { full: "풀테", half: "하금테", rimless: "무테" } as const;

function scoreTone(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-ink-100 text-ink-800";
  return "bg-stone-100 text-stone-600";
}

export default function StepFrames({
  face,
  prescription,
  photoDataUrl,
  frameMode,
  frameId,
  factoryId,
  customSpec,
  onChange,
  onNext,
  onBack,
}: {
  face: FaceAnalysis;
  prescription: Prescription | null;
  photoDataUrl: string | null;
  frameMode: FrameMode;
  frameId: string | null;
  factoryId: string | null;
  customSpec: CustomSpec | null;
  onChange: (patch: {
    frameMode?: FrameMode;
    frameId?: string | null;
    factoryId?: string | null;
    customSpec?: CustomSpec | null;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const power = effectivePower(prescription);

  const ranked = useMemo(
    () => rankFrames({ face, prescription, effectivePower: power }),
    [face, prescription, power]
  );

  const visible = showAll ? ranked : ranked.slice(0, 6);

  const ready = frameMode === "stock" ? !!frameId : !!factoryId && !!customSpec;
  const selectedFrame = frameId ? findFrame(frameId) : undefined;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["stock", "기성품에서 고르기", "바로 써볼 수 있고 당일 수령도 됩니다"],
            ["custom", "맞춤 제작하기", "얼굴 계측값으로 치수를 만들어 공장에 발주합니다"],
          ] as [FrameMode, string, string][]
        ).map(([mode, label, hint]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ frameMode: mode })}
            className={`rounded-2xl border p-3 text-left ${
              frameMode === mode
                ? "border-ink-500 bg-ink-500 text-white"
                : "border-ink-200 bg-white text-ink-800"
            }`}
          >
            <span className="block font-semibold">{label}</span>
            <span
              className={`mt-0.5 block text-xs ${frameMode === mode ? "text-ink-100" : "text-ink-600"}`}
            >
              {hint}
            </span>
          </button>
        ))}
      </div>

      {frameMode === "custom" ? (
        <CustomDesigner
          face={face}
          prescription={prescription}
          photoDataUrl={photoDataUrl}
          factoryId={factoryId}
          onChange={onChange}
        />
      ) : (
      <>
      <Callout>
        적합도는 <strong>얼굴형 대비(40) · 얼굴폭 대비 테 전체폭(20) · PD와 광학중심 정렬(15) ·
        콧대와 코받침(15) · 도수와 테 구조(10)</strong>를 합산한 점수입니다. 취향이 우선이니,
        점수가 낮아도 마음에 드는 테를 고르셔도 됩니다.
      </Callout>

      {power > 4 && (
        <Callout tone="warn">
          실효 도수가 {power.toFixed(2)}D로 높습니다. 렌즈폭이 좁고 테가 두꺼운 풀테일수록 렌즈
          가장자리 두께가 덜 보입니다.
        </Callout>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((fit) => {
          const frame = findFrame(fit.frameId);
          if (!frame) return null;
          const selected = frameId === frame.id;
          return (
            <button
              key={frame.id}
              type="button"
              onClick={() => onChange({ frameId: frame.id })}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-ink-500 bg-ink-50 ring-2 ring-ink-300"
                  : "border-ink-200 bg-white hover:border-ink-400"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{frame.name}</p>
                  <p className="text-xs text-ink-600">
                    {frame.brand} · {FRAME_SHAPE_LABEL[frame.shape]} · {RIM_LABEL[frame.rim]} ·{" "}
                    {frame.material}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold ${scoreTone(fit.score)}`}>
                  {fit.score}점
                </span>
              </div>

              <FrameSvg
                shape={frame.shape}
                rim={frame.rim}
                className="my-3 h-20 w-full text-ink-900"
                color="#3a2a18"
              />

              <p className="text-xs text-ink-600">
                {frame.lensWidth}□{frame.bridge}-{frame.temple} · 전체폭 {frame.totalWidth}mm · 세로{" "}
                {frame.lensHeight}mm · {frame.weightGram}g
                {frame.asianFit && " · 아시안핏"}
                {frame.adjustableNosePad && " · 코패드 조절"}
              </p>

              <ul className="mt-2 space-y-1 text-sm text-emerald-800">
                {fit.pros.slice(0, 3).map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
              {fit.cons.length > 0 && (
                <ul className="mt-1 space-y-1 text-sm text-amber-800">
                  {fit.cons.slice(0, 2).map((c) => (
                    <li key={c}>· {c}</li>
                  ))}
                </ul>
              )}

              <p className="mt-3 font-semibold text-ink-900">{won(frame.price)}</p>
              <p className="text-xs text-ink-600">색상: {frame.colors.join(" / ")}</p>
            </button>
          );
        })}
      </div>

      {photoDataUrl && face.landmarks && selectedFrame && (
        <div className="rounded-2xl border border-ink-300 bg-white p-4">
          <p className="mb-2 font-semibold text-ink-900">가상 착용 — {selectedFrame.name}</p>
          <TryOn
            photoDataUrl={photoDataUrl}
            landmarks={face.landmarks}
            shape={selectedFrame.shape}
            rim={selectedFrame.rim}
            frameTotalWidthMm={selectedFrame.totalWidth}
          />
        </div>
      )}

      {!showAll && ranked.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full rounded-xl border border-ink-300 py-3 text-sm font-medium text-ink-800"
        >
          점수가 낮은 테도 모두 보기 ({ranked.length - 6}개 더)
        </button>
      )}
      </>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-ink-700 underline">
          이전
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={onNext}
          className="rounded-xl bg-ink-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
        >
          다음: 렌즈 고르기
        </button>
      </div>
    </div>
  );
}
