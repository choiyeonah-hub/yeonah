"use client";

import { useState } from "react";
import { PRODUCTION_METHODS, type Factory } from "@/lib/factories";
import { FRAME_SHAPE_LABEL } from "@/lib/faceShapes";
import type { CustomSpec } from "@/lib/types";

/**
 * 공장에 그대로 넘길 발주 명세.
 *
 * 여기 담기는 건 치수와 재질뿐이다. 도수·연락처·얼굴 사진은 들어가지 않는다.
 * 공장은 이 종이만 있으면 만들 수 있고, 그래서 개인정보를 볼 이유가 없다.
 */
function buildSheet(code: string, factory: Factory, spec: CustomSpec): string {
  const lines = [
    `[아이핏 맞춤 안경테 발주서]`,
    `주문번호: ${code}`,
    `공장: ${factory.name} (${factory.country} ${factory.region})`,
    `공법: ${factory.methods.map((m) => PRODUCTION_METHODS[m].label).join(" / ")}`,
    `수량: 1`,
    ``,
    `모양: ${FRAME_SHAPE_LABEL[spec.shape]} / 마감: 풀테`,
    `재질: ${spec.material}`,
    `색상: ${spec.color}`,
    ``,
    `치수 (mm)`,
    `  렌즈 가로폭 : ${spec.lensWidth}`,
    `  브릿지      : ${spec.bridge}`,
    `  렌즈 세로폭 : ${spec.lensHeight}`,
    `  템플 길이   : ${spec.temple}`,
    `  전체 가로폭 : ${spec.totalWidth}`,
    `  코받침 높이 : ${spec.nosePadHeight}`,
  ];
  if (spec.nosePadAngleDeg != null) lines.push(`  코받침 각도 : ${spec.nosePadAngleDeg}도`);
  if (spec.templeDropMm != null) lines.push(`  템플 꺾임   : ${spec.templeDropMm}`);
  lines.push(
    ``,
    `각인 표기: ${spec.lensWidth}□${spec.bridge}-${spec.temple}`,
    spec.decentrationPerEye != null
      ? `참고: 광학중심 편심 한쪽당 ${spec.decentrationPerEye}mm (렌즈 가공 시 보정)`
      : `참고: PD 미확정 — 렌즈 가공 전 안경원에서 측정`,
    ``,
    `※ 이 발주서에는 도수·연락처·얼굴 이미지가 포함되지 않습니다.`
  );
  return lines.join("\n");
}

export default function FactoryOrderSheet({
  code,
  factory,
  spec,
}: {
  code: string;
  factory: Factory;
  spec: CustomSpec;
}) {
  const [copied, setCopied] = useState(false);
  const sheet = buildSheet(code, factory, spec);

  async function copy() {
    try {
      await navigator.clipboard.writeText(sheet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없으면 아래 본문을 직접 복사하면 된다.
      setCopied(false);
    }
  }

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-ink-900">공장 발주 명세</h2>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm text-ink-800"
        >
          {copied ? "복사했습니다" : "복사하기"}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-ink-50 p-4 text-xs leading-relaxed text-ink-900">
        {sheet}
      </pre>
      <p className="mt-2 text-xs text-ink-600">
        공장에는 이 치수만 전달됩니다. 도수와 연락처, 얼굴 사진은 넘어가지 않습니다.
      </p>
    </section>
  );
}
