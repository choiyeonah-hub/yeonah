"use client";

import { useEffect, useMemo, useState } from "react";
import { customFrameQuote, deriveCustomSpec } from "@/lib/custom";
import { FRAME_SHAPE_LABEL } from "@/lib/faceShapes";
import { oneOffFactories, PRODUCTION_METHODS } from "@/lib/factories";
import { won } from "@/lib/format";
import type { CustomSpec, FaceAnalysis, Prescription } from "@/lib/types";
import FrameSvg from "./FrameSvg";
import { Callout } from "./Section";
import TryOn from "./TryOn";

const COLORS = ["블랙", "하바나", "클리어", "네이비", "카키", "버건디", "샴페인 골드", "실버"];

export default function CustomDesigner({
  face,
  prescription,
  photoDataUrl,
  factoryId,
  onChange,
}: {
  face: FaceAnalysis;
  prescription: Prescription | null;
  photoDataUrl: string | null;
  factoryId: string | null;
  onChange: (patch: { factoryId: string | null; customSpec: CustomSpec | null }) => void;
}) {
  const factories = useMemo(() => oneOffFactories(), []);
  const selected = factories.find((f) => f.id === factoryId) ?? null;
  const [material, setMaterial] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]);

  // 공장을 바꾸면 그 공장이 다루는 재질로 다시 맞춘다.
  const effectiveMaterial =
    selected && material && selected.materials.includes(material)
      ? material
      : selected?.materials[0] ?? null;

  const spec = useMemo(() => {
    if (!effectiveMaterial) return null;
    return deriveCustomSpec({ face, prescription, material: effectiveMaterial, color });
  }, [face, prescription, effectiveMaterial, color]);

  const quote = selected && spec ? customFrameQuote({ factory: selected, spec }) : null;

  useEffect(() => {
    onChange({ factoryId: selected?.id ?? null, customSpec: spec });
  }, [selected, spec, onChange]);

  return (
    <div className="space-y-5">
      <Callout tone="privacy" title="기성품이 안 맞는 이유는 대개 두 치수입니다">
        <p>
          <strong>테 전체폭</strong>과 <strong>코받침 높이</strong>. 시중 규격은 정해진 몇 가지 중에서
          고르는 거라 이 둘이 얼굴과 어긋나면 흘러내리거나 관자놀이를 누릅니다. 맞춤 제작은 반대로
          얼굴 계측값에서 치수를 만들어 공장에 넘깁니다.
        </p>
      </Callout>

      <div>
        <p className="mb-2 font-semibold text-ink-900">제작 공장 고르기</p>
        <div className="space-y-2">
          {factories.map((f) => {
            const on = selected?.id === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ factoryId: f.id, customSpec: null })}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  on
                    ? "border-ink-500 bg-ink-50 ring-2 ring-ink-200"
                    : "border-ink-200 bg-white hover:border-ink-400"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{f.name}</p>
                    <p className="text-xs text-ink-600">
                      {f.country} {f.region} · {f.methods.map((m) => PRODUCTION_METHODS[m].label).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-ink-900">{won(f.oneOffUnitCost ?? 0)}</p>
                    <p className="text-xs text-ink-600">제작 {f.leadDays}일</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-700">{f.note}</p>
                <p className="mt-1 text-xs text-ink-600">
                  재질: {f.materials.join(" / ")} · 인증: {f.certifications.join(", ")}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 font-semibold text-ink-900">재질</p>
            <div className="flex flex-wrap gap-2">
              {selected.materials.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMaterial(m)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    effectiveMaterial === m
                      ? "border-ink-500 bg-ink-500 text-white"
                      : "border-ink-200 bg-white text-ink-800"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-semibold text-ink-900">색상</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    color === c
                      ? "border-ink-500 bg-ink-500 text-white"
                      : "border-ink-200 bg-white text-ink-800"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {spec && selected && (
        <div className="rounded-2xl border border-ink-300 bg-white p-5">
          <p className="font-semibold text-ink-900">
            설계 도면 — {FRAME_SHAPE_LABEL[spec.shape]} · {spec.material} · {spec.color}
          </p>
          <FrameSvg shape={spec.shape} rim={spec.rim} className="my-3 h-24 w-full" color="#2c4753" />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {[
              ["렌즈 가로폭", `${spec.lensWidth}mm`],
              ["브릿지", `${spec.bridge}mm`],
              ["렌즈 세로폭", `${spec.lensHeight}mm`],
              ["템플 길이", `${spec.temple}mm`],
              ["테 전체폭", `${spec.totalWidth}mm`],
              ["코받침 높이", `${spec.nosePadHeight}mm`],
              ...(spec.nosePadAngleDeg != null
                ? ([["코받침 각도", `${spec.nosePadAngleDeg}°`]] as [string, string][])
                : []),
              ...(spec.templeDropMm != null
                ? ([["템플 꺾임", `${spec.templeDropMm}mm`]] as [string, string][])
                : []),
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-ink-600">{k}</dt>
                <dd className="font-medium text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-xs text-ink-600">
            각인 표기 {spec.lensWidth}□{spec.bridge}-{spec.temple}
            {spec.decentrationPerEye != null &&
              ` · 편심 한쪽당 ${Math.abs(spec.decentrationPerEye)}mm`}
          </p>

          {photoDataUrl && face.landmarks && (
            <div className="mt-4 border-t border-ink-100 pt-4">
              <p className="mb-2 text-sm font-semibold text-ink-900">이 치수로 만들면 이렇게 됩니다</p>
              <TryOn
                photoDataUrl={photoDataUrl}
                landmarks={face.landmarks}
                shape={spec.shape}
                rim={spec.rim}
                frameTotalWidthMm={spec.totalWidth}
              />
            </div>
          )}

          <ul className="mt-4 space-y-1 text-sm text-ink-800">
            {spec.rationale.map((r) => (
              <li key={r}>· {r}</li>
            ))}
          </ul>

          {quote && (
            <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm">
              <div className="flex justify-between text-ink-800">
                <span>공장 제작비 ({selected.name})</span>
                <span>{won(quote.productionCost)}</span>
              </div>
              <div className="flex justify-between text-ink-800">
                <span>설계 · 도면 검수 · 재제작 A/S</span>
                <span>{won(quote.platformFee)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-ink-200 pt-2 font-bold text-ink-900">
                <span>테 값</span>
                <span>{won(quote.framePrice)}</span>
              </div>
              <p className="mt-2 text-xs text-ink-600">
                제작에 약 {quote.leadDays}일 걸립니다. 렌즈 값은 다음 단계에서 안경원별로 비교합니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
