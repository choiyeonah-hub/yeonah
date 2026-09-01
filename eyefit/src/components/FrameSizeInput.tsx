"use client";

import { useState } from "react";
import type { FrameSpec } from "@/lib/advice";
import { FRAMES } from "@/lib/frames";
import type { FrameRimId } from "@/lib/types";
import FrameSvg from "./FrameSvg";
import { Callout, Field } from "./Section";

const RIM_LABEL: Record<FrameRimId, string> = {
  full: "풀테 (테가 렌즈를 다 감쌈)",
  half: "하금테 (아래가 줄)",
  rimless: "무테",
};

function num(v: string, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * 테 치수 입력.
 *
 * 렌즈 두께는 도수만으로 정해지지 않는다. 같은 도수라도 큰 테에 넣으면
 * 훨씬 두꺼워진다. 그래서 이 입력이 도수만큼 중요하고, 소비자가 가장 모르는
 * 정보이기도 하다. 안경 다리 안쪽 각인에 다 적혀 있다는 걸 알려주는 게 절반이다.
 */
export default function FrameSizeInput({
  frame,
  onChange,
}: {
  frame: FrameSpec;
  onChange: (frame: FrameSpec) => void;
}) {
  const [mode, setMode] = useState<"manual" | "preset">("manual");

  const input =
    "w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-ink-500 focus:outline-none";

  return (
    <div className="space-y-4">
      <Callout>
        <p>
          안경 <strong>다리 안쪽</strong>이나 <strong>코받침 근처</strong>에 <code>52□18 145</code>{" "}
          같은 숫자가 적혀 있습니다. 순서대로 <strong>렌즈 가로폭 · 브릿지 · 다리 길이</strong>{" "}
          입니다. 앞의 두 개만 있으면 됩니다.
        </p>
        <p>
          지금 쓰는 안경이 없다면 아래 &ldquo;대표 사이즈에서 고르기&rdquo;로 대충 맞춰도
          경향은 그대로 나옵니다.
        </p>
      </Callout>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["manual", "각인 숫자 직접 입력"],
            ["preset", "대표 사이즈에서 고르기"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              mode === m
                ? "border-ink-500 bg-ink-500 text-white"
                : "border-ink-200 bg-white text-ink-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "manual" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="렌즈 가로폭 (mm)" hint="각인의 첫 숫자">
            <input
              className={input}
              inputMode="numeric"
              value={frame.lensWidth}
              onChange={(e) => onChange({ ...frame, lensWidth: num(e.target.value, frame.lensWidth) })}
            />
          </Field>
          <Field label="브릿지 (mm)" hint="□ 뒤 숫자">
            <input
              className={input}
              inputMode="numeric"
              value={frame.bridge}
              onChange={(e) => onChange({ ...frame, bridge: num(e.target.value, frame.bridge) })}
            />
          </Field>
          <Field label="렌즈 세로폭 (mm)" hint="각인에 없으면 자로 재거나 38로 두세요">
            <input
              className={input}
              inputMode="numeric"
              value={frame.lensHeight}
              onChange={(e) =>
                onChange({ ...frame, lensHeight: num(e.target.value, frame.lensHeight) })
              }
            />
          </Field>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {FRAMES.map((f) => {
            const on =
              frame.lensWidth === f.lensWidth &&
              frame.bridge === f.bridge &&
              frame.lensHeight === f.lensHeight;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  onChange({
                    lensWidth: f.lensWidth,
                    bridge: f.bridge,
                    lensHeight: f.lensHeight,
                    rim: f.rim,
                  })
                }
                className={`rounded-xl border p-3 text-left ${
                  on ? "border-ink-500 bg-ink-50 ring-2 ring-ink-200" : "border-ink-200 bg-white"
                }`}
              >
                <FrameSvg shape={f.shape} rim={f.rim} className="mb-2 h-10 w-full" color="#2c4753" />
                <p className="text-sm font-medium text-ink-900">
                  {f.lensWidth}□{f.bridge} · 세로 {f.lensHeight}mm
                </p>
                <p className="text-xs text-ink-600">
                  {f.name} · {RIM_LABEL[f.rim].split(" ")[0]}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <Field label="테 마감" hint="무테와 하금테는 두꺼운 가장자리가 그대로 보입니다">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RIM_LABEL) as FrameRimId[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ ...frame, rim: r })}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                frame.rim === r
                  ? "border-ink-500 bg-ink-500 text-white"
                  : "border-ink-200 bg-white text-ink-800"
              }`}
            >
              {RIM_LABEL[r]}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}
