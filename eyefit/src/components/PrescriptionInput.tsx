"use client";

import { useRef, useState } from "react";
import { parseJsonOrThrow } from "@/lib/api";
import { diopter } from "@/lib/format";
import { fileToScaledDataUrl } from "@/lib/image";
import type { EyeRx, Prescription } from "@/lib/types";
import { Callout, Field } from "./Section";

const EMPTY_EYE: EyeRx = { sph: null, cyl: null, axis: null };

const EMPTY_RX: Prescription = {
  right: { ...EMPTY_EYE },
  left: { ...EMPTY_EYE },
  add: null,
  pd: null,
  measuredAt: null,
  source: "manual",
  warnings: [],
};

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function EyeRow({
  label,
  eye,
  onChange,
}: {
  label: string;
  eye: EyeRx;
  onChange: (eye: EyeRx) => void;
}) {
  const cell =
    "w-full rounded-lg border border-ink-200 px-2 py-2 text-center text-sm focus:border-ink-500 focus:outline-none";
  return (
    <tr>
      <th className="py-2 pr-2 text-left text-sm font-semibold text-ink-900">{label}</th>
      <td className="px-1 py-1">
        <input
          className={cell}
          inputMode="decimal"
          placeholder="-2.25"
          value={eye.sph ?? ""}
          onChange={(e) => onChange({ ...eye, sph: numOrNull(e.target.value) })}
        />
      </td>
      <td className="px-1 py-1">
        <input
          className={cell}
          inputMode="decimal"
          placeholder="-0.75"
          value={eye.cyl ?? ""}
          onChange={(e) => onChange({ ...eye, cyl: numOrNull(e.target.value) })}
        />
      </td>
      <td className="px-1 py-1">
        <input
          className={cell}
          inputMode="numeric"
          placeholder="180"
          value={eye.axis ?? ""}
          onChange={(e) => onChange({ ...eye, axis: numOrNull(e.target.value) })}
        />
      </td>
    </tr>
  );
}

export default function PrescriptionInput({
  prescription,
  onChange,
}: {
  prescription: Prescription | null;
  onChange: (prescription: Prescription) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rx = prescription ?? EMPTY_RX;

  function patchRx(patch: Partial<Prescription>) {
    onChange({ ...rx, ...patch, source: "manual" });
  }

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await fileToScaledDataUrl(file, 1400, 0.9);
      const res = await fetch("/api/read-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await parseJsonOrThrow<{ prescription: Prescription }>(res);
      onChange(data.prescription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "처방전을 읽지 못했습니다.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <Callout tone="privacy" title="도수는 아무 데도 저장되지 않습니다">
        <p>
          처방전 도수는 개인정보보호법상 <strong>건강에 관한 민감정보</strong>입니다. 이 도구는
          도수를 <strong>저장하지 않습니다</strong> — 계정도 없고 DB에도 안 들어갑니다. 사진으로
          자동 입력할 때만 판독 서버를 한 번 거치고, 그 이미지도 응답과 함께 버려집니다.
        </p>
        <p>
          사진을 아예 안 올리고 <strong>직접 입력만</strong> 해도 됩니다. 그 경우 도수는 브라우저
          밖으로 나가지 않고, 두께 계산도 전부 이 화면 안에서 끝납니다.
        </p>
      </Callout>

      <div className="rounded-2xl border border-ink-200 bg-white p-4">
        <p className="mb-2 font-semibold text-ink-900">처방전·검안표 사진으로 자동 입력</p>
        <label className="mb-3 flex items-start gap-2 text-sm text-ink-800">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          <span>처방전 이미지를 도수 판독 목적으로 일회성 처리하는 데 동의합니다. (이미지 미저장)</span>
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={!consent || loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ink-500 file:px-3 file:py-2 file:text-white disabled:opacity-40"
        />
        {loading && <p className="mt-3 text-sm text-ink-600">처방전을 읽는 중…</p>}
        {error && <p className="mt-3 text-sm text-amber-800">{error}</p>}
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-4">
        <p className="mb-1 font-semibold text-ink-900">도수 직접 입력 / 확인</p>
        <p className="mb-3 text-sm text-ink-700">
          자동 판독은 틀릴 수 있으니 처방전과 한 번 대조해주세요. 근시는 <code>-</code>, 원시는{" "}
          <code>+</code> 부호를 꼭 확인하세요.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px]">
            <thead>
              <tr className="text-xs text-ink-600">
                <th />
                <th className="px-1 py-1 font-medium">구면 SPH</th>
                <th className="px-1 py-1 font-medium">난시 CYL</th>
                <th className="px-1 py-1 font-medium">축 AXIS</th>
              </tr>
            </thead>
            <tbody>
              <EyeRow label="오른쪽 (OD)" eye={rx.right} onChange={(right) => patchRx({ right })} />
              <EyeRow label="왼쪽 (OS)" eye={rx.left} onChange={(left) => patchRx({ left })} />
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="가입도 ADD" hint="노안 처방에만 있습니다">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              inputMode="decimal"
              placeholder="+2.00"
              value={rx.add ?? ""}
              onChange={(e) => patchRx({ add: numOrNull(e.target.value) })}
            />
          </Field>
          <Field label="PD (동공 간 거리, mm)" hint="모르면 비워두세요">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              inputMode="decimal"
              placeholder="63"
              value={rx.pd ?? ""}
              onChange={(e) => patchRx({ pd: numOrNull(e.target.value) })}
            />
          </Field>
          <Field label="검사일">
            <input
              type="date"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              value={rx.measuredAt ?? ""}
              onChange={(e) => patchRx({ measuredAt: e.target.value || null })}
            />
          </Field>
        </div>

        {rx.warnings.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">
            {rx.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        {prescription && (
          <p className="mt-3 text-sm text-ink-700">
            현재 값 — 오른쪽 {diopter(rx.right.sph)} / {diopter(rx.right.cyl)} ×{" "}
            {rx.right.axis ?? "—"}, 왼쪽 {diopter(rx.left.sph)} / {diopter(rx.left.cyl)} ×{" "}
            {rx.left.axis ?? "—"}
          </p>
        )}
      </div>

    </div>
  );
}
