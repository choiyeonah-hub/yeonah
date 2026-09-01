"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseJsonOrThrow } from "@/lib/api";
import { won } from "@/lib/format";
import { REGIONS } from "@/lib/stores";
import type {
  CustomSpec,
  FaceAnalysis,
  FrameMode,
  LensIndexId,
  LensOptionId,
  Prescription,
  Quote,
  Store,
} from "@/lib/types";
import { Callout, Field } from "./Section";

export default function StepStores({
  face,
  prescription,
  frameMode,
  frameId,
  factoryId,
  customSpec,
  frameName,
  lensIndex,
  lensOptions,
  region,
  storeKind,
  storeId,
  onChange,
  onBack,
}: {
  face: FaceAnalysis;
  prescription: Prescription | null;
  frameMode: FrameMode;
  frameId: string | null;
  factoryId: string | null;
  customSpec: CustomSpec | null;
  frameName: string;
  lensIndex: LensIndexId;
  lensOptions: LensOptionId[];
  region: string | null;
  storeKind: Store["kind"] | null;
  storeId: string | null;
  onChange: (patch: { region?: string | null; storeKind?: Store["kind"] | null; storeId?: string | null }) => void;
  onBack: () => void;
}) {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [leadDays, setLeadDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rxConsent, setRxConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frameMode,
        frameId,
        factoryId,
        customSpec,
        lensIndex,
        lensOptions,
        region,
        kind: storeKind,
      }),
    })
      .then((res) => parseJsonOrThrow<{ quotes: Quote[]; stores: Store[]; leadDays: number }>(res))
      .then((data) => {
        if (!alive) return;
        setQuotes(data.quotes);
        setStores(data.stores);
        setLeadDays(data.leadDays);
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "견적을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [frameMode, frameId, factoryId, customSpec, lensIndex, lensOptions, region, storeKind]);

  const selectedQuote = quotes.find((q) => q.storeId === storeId) ?? null;

  async function submit() {
    if (!storeId || !selectedQuote) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameMode,
          frameId,
          factoryId,
          customSpec,
          storeId,
          lensIndex,
          lensOptions,
          contactName: name.trim(),
          contactPhone: phone.trim(),
          face: {
            faceShape: face.faceShape,
            summary: face.summary,
            metrics: {
              widthToHeight: face.widthToHeight,
              jawToCheek: face.jawToCheek,
              foreheadToCheek: face.foreheadToCheek,
              noseBridge: face.noseBridge,
              eyeSpacing: face.eyeSpacing,
              faceWidth: face.faceWidth,
              browLine: face.browLine,
            },
          },
          sensitiveConsent: rxConsent,
          prescription:
            rxConsent && prescription
              ? {
                  right: prescription.right,
                  left: prescription.left,
                  add: prescription.add,
                  pd: prescription.pd,
                  measuredAt: prescription.measuredAt,
                }
              : null,
        }),
      });
      const data = await parseJsonOrThrow<{ code: string }>(res);
      router.push(`/reservation/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "예약에 실패했습니다.");
      setSubmitting(false);
    }
  }

  const cheapest = quotes[0]?.totalPrice ?? 0;

  return (
    <div className="space-y-5">
      <Callout tone="warn" title="테와 렌즈는 파는 곳이 다릅니다">
        <p>
          도수 렌즈의 조제·판매는 <strong>안경사만</strong> 할 수 있고 온라인 판매도 안 됩니다. 그래서
          렌즈 값은 고른 안경원에서 <strong>매장 결제</strong>합니다.
        </p>
        <p>
          {frameMode === "custom"
            ? "맞춤 테는 제휴 공장에서 제작해 예약한 안경원으로 보내드립니다."
            : "기성 테는 안경원 재고에서 바로 씌워드립니다."}{" "}
          이 앱에서는 결제하지 않고, 예상 견적과 방문 예약까지만 진행합니다.
        </p>
      </Callout>

      {leadDays > 0 && (
        <Callout>
          맞춤 제작이라 공장에서 약 <strong>{leadDays}일</strong>이 걸립니다. 완성되면 예약한
          안경원으로 배송되고, 그때 렌즈를 조제합니다.
        </Callout>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={region ?? ""}
          onChange={(e) => onChange({ region: e.target.value || null, storeId: null })}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">전국</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {(["동네", "체인"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange({ storeKind: storeKind === k ? null : k, storeId: null })}
            className={`rounded-full border px-3 py-2 text-sm ${
              storeKind === k
                ? "border-ink-500 bg-ink-500 text-white"
                : "border-ink-200 bg-white text-ink-800"
            }`}
          >
            {k === "동네" ? "동네 안경원" : "전국 체인"}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-600">견적을 계산하는 중…</p>}
      {!loading && quotes.length === 0 && (
        <Callout>조건에 맞는 제휴 안경원이 없습니다. 지역이나 매장 유형을 바꿔보세요.</Callout>
      )}

      <ul className="space-y-3">
        {quotes.map((q) => {
          const store = stores.find((s) => s.id === q.storeId);
          if (!store) return null;
          const selected = storeId === store.id;
          return (
            <li key={q.storeId}>
              <button
                type="button"
                onClick={() => onChange({ storeId: store.id })}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-ink-500 bg-ink-50 ring-2 ring-ink-300"
                    : "border-ink-200 bg-white hover:border-ink-400"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">
                      {store.name}
                      {q.totalPrice === cheapest && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          최저가
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-600">
                      {store.kind} · {store.address} · ★ {store.rating} ({store.reviewCount}) ·{" "}
                      {store.turnaround}
                      {store.freeExam && " · 무료 정밀검안"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-ink-900">{won(q.totalPrice)}</p>
                    <p className="text-xs text-ink-600">
                      테 {won(q.framePrice)} + 렌즈 {won(q.lensPrice)}
                    </p>
                    <p className="text-xs text-emerald-700">정가 대비 {won(q.saved)} 절약</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-ink-600">{store.services.join(" · ")}</p>
              </button>
            </li>
          );
        })}
      </ul>

      {storeId && selectedQuote && (
        <div className="rounded-2xl border border-ink-300 bg-white p-5">
          <p className="font-semibold text-ink-900">예약 정보</p>
          <p className="mt-1 text-sm text-ink-700">
            {frameName} + {lensIndex} 렌즈 · 예상 {won(selectedQuote.totalPrice)}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="이름">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="휴대폰 번호" hint="매장에서 예약 확인 연락을 드립니다">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="010-1234-5678"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          {prescription && (
            <label className="mt-4 flex items-start gap-2 text-sm text-ink-800">
              <input
                type="checkbox"
                checked={rxConsent}
                onChange={(e) => setRxConsent(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong>[선택] 민감정보 제3자 제공 동의</strong> — 입력한 도수(민감정보)를 예약한
                안경원에 전달하는 데 동의합니다. 동의하지 않아도 예약은 되고, 그 경우 매장에서 직접
                검안합니다.
              </span>
            </label>
          )}

          {error && <p className="mt-3 text-sm text-amber-800">{error}</p>}

          <button
            type="button"
            disabled={submitting || !name.trim() || !phone.trim()}
            onClick={() => void submit()}
            className="mt-4 w-full rounded-xl bg-ink-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "예약 중…" : "이 안경원에 방문 예약하기"}
          </button>
          <p className="mt-2 text-center text-xs text-ink-600">
            결제는 매장에서 합니다. 예약만으로는 비용이 발생하지 않습니다.
          </p>
        </div>
      )}

      <button type="button" onClick={onBack} className="text-sm text-ink-700 underline">
        이전
      </button>
    </div>
  );
}
