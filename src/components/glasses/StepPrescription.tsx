"use client";

import { useRef, useState } from "react";
import { parseJsonOrThrow } from "@/lib/api";
import { diopter } from "@/lib/glasses/format";
import { fileToScaledDataUrl } from "@/lib/glasses/image";
import type { EyeRx, Prescription } from "@/lib/glasses/types";
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
    "w-full rounded-lg border border-havruta-200 px-2 py-2 text-center text-sm focus:border-havruta-500 focus:outline-none";
  return (
    <tr>
      <th className="py-2 pr-2 text-left text-sm font-semibold text-havruta-900">{label}</th>
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

export default function StepPrescription({
  prescription,
  skip,
  screenHours,
  outdoorHeavy,
  onChange,
  onNext,
  onBack,
}: {
  prescription: Prescription | null;
  skip: boolean;
  screenHours: number;
  outdoorHeavy: boolean;
  onChange: (patch: {
    prescription?: Prescription | null;
    skipPrescription?: boolean;
    screenHours?: number;
    outdoorHeavy?: boolean;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rx = prescription ?? EMPTY_RX;

  function patchRx(patch: Partial<Prescription>) {
    onChange({ prescription: { ...rx, ...patch, source: "manual" }, skipPrescription: false });
  }

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await fileToScaledDataUrl(file, 1400, 0.9);
      const res = await fetch("/api/glasses/read-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await parseJsonOrThrow<{ prescription: Prescription }>(res);
      onChange({ prescription: data.prescription, skipPrescription: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "처방전을 읽지 못했습니다.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <Callout tone="privacy" title="도수는 민감정보입니다">
        <p>
          안경 처방전의 도수는 개인정보보호법상 <strong>건강에 관한 민감정보</strong>로 볼 수
          있습니다. 그래서 이 앱은 처방전 <strong>이미지를 저장하지 않고</strong>, 읽어낸 숫자도
          마지막 예약 단계에서 <strong>별도로 동의</strong>해야만 매장에 전달합니다.
        </p>
        <p>
          동의하지 않아도 끝까지 진행할 수 있습니다. 그 경우 도수는 매장에서 안경사가 직접
          검안합니다.
        </p>
      </Callout>

      <Callout tone="warn">
        여기서 읽은 값은 <strong>매장에서 확인할 초안</strong>이지 확정 처방이 아닙니다. 최종 도수는
        안경사의 검안으로 정해집니다. 이 앱은 진단이나 의료적 판단을 하지 않습니다.
      </Callout>

      <div className="rounded-2xl border border-havruta-200 bg-white p-4">
        <p className="mb-2 font-semibold text-havruta-900">처방전·검안표 사진으로 자동 입력</p>
        <label className="mb-3 flex items-start gap-2 text-sm text-havruta-800">
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
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-havruta-500 file:px-3 file:py-2 file:text-white disabled:opacity-40"
        />
        {loading && <p className="mt-3 text-sm text-havruta-600">처방전을 읽는 중…</p>}
        {error && <p className="mt-3 text-sm text-amber-800">{error}</p>}
      </div>

      <div className="rounded-2xl border border-havruta-200 bg-white p-4">
        <p className="mb-1 font-semibold text-havruta-900">도수 직접 입력 / 확인</p>
        <p className="mb-3 text-sm text-havruta-700">
          자동 판독은 틀릴 수 있으니 처방전과 한 번 대조해주세요. 근시는 <code>-</code>, 원시는{" "}
          <code>+</code> 부호를 꼭 확인하세요.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px]">
            <thead>
              <tr className="text-xs text-havruta-600">
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
              className="w-full rounded-lg border border-havruta-200 px-3 py-2 text-sm"
              inputMode="decimal"
              placeholder="+2.00"
              value={rx.add ?? ""}
              onChange={(e) => patchRx({ add: numOrNull(e.target.value) })}
            />
          </Field>
          <Field label="PD (동공 간 거리, mm)" hint="모르면 비워두세요">
            <input
              className="w-full rounded-lg border border-havruta-200 px-3 py-2 text-sm"
              inputMode="decimal"
              placeholder="63"
              value={rx.pd ?? ""}
              onChange={(e) => patchRx({ pd: numOrNull(e.target.value) })}
            />
          </Field>
          <Field label="검사일">
            <input
              type="date"
              className="w-full rounded-lg border border-havruta-200 px-3 py-2 text-sm"
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
          <p className="mt-3 text-sm text-havruta-700">
            현재 값 — 오른쪽 {diopter(rx.right.sph)} / {diopter(rx.right.cyl)} ×{" "}
            {rx.right.axis ?? "—"}, 왼쪽 {diopter(rx.left.sph)} / {diopter(rx.left.cyl)} ×{" "}
            {rx.left.axis ?? "—"}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-havruta-200 bg-white p-4">
        <p className="mb-3 font-semibold text-havruta-900">생활 환경</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`하루 화면 보는 시간: ${screenHours}시간`}>
            <input
              type="range"
              min={0}
              max={14}
              value={screenHours}
              onChange={(e) => onChange({ screenHours: Number(e.target.value) })}
              className="w-full accent-havruta-500"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-havruta-800">
            <input
              type="checkbox"
              checked={outdoorHeavy}
              onChange={(e) => onChange({ outdoorHeavy: e.target.checked })}
            />
            야외 활동이 많은 편입니다
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm text-havruta-700 underline">
          이전
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onChange({ prescription: null, skipPrescription: true });
              onNext();
            }}
            className="rounded-xl border border-havruta-300 px-4 py-3 text-sm font-medium text-havruta-800"
          >
            도수 모름 · 매장에서 검안할게요
          </button>
          <button
            type="button"
            disabled={!prescription && !skip}
            onClick={onNext}
            className="rounded-xl bg-havruta-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
          >
            다음: 테 고르기
          </button>
        </div>
      </div>
    </div>
  );
}
