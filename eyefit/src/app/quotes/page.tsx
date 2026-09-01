"use client";

import { useCallback, useEffect, useState } from "react";
import { parseJsonOrThrow, safeParseJson } from "@/lib/api";
import { Callout, Field } from "@/components/Section";
import { won } from "@/lib/format";
import { LENS_INDEXES, LENS_INDEX_IDS, LENS_OPTIONS, LENS_OPTION_IDS } from "@/lib/lenses";
import { MIN_REPORTS, type PriceStats } from "@/lib/stats";
import type { LensIndexId, LensOptionId } from "@/lib/types";

const REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

type StatsResponse = {
  byIndex: Record<string, PriceStats | null>;
  total: number;
  regions: string[];
};

/**
 * 제보 분포를 사분위 막대 하나로 보여준다.
 * 최저~최고 구간 위에 25~75% 구간을 진하게 얹고, 중앙값에 눈금을 세운다.
 */
function DistributionBar({ stats }: { stats: PriceStats }) {
  const span = Math.max(1, stats.max - stats.min);
  const pct = (v: number) => ((v - stats.min) / span) * 100;

  return (
    <div className="mt-2">
      <div className="relative h-3 rounded-full bg-ink-100">
        <div
          className="absolute h-3 rounded-full bg-ink-300"
          style={{ left: `${pct(stats.p25)}%`, width: `${pct(stats.p75) - pct(stats.p25)}%` }}
        />
        <div
          className="absolute top-[-3px] h-[18px] w-[3px] rounded bg-ink-700"
          style={{ left: `calc(${pct(stats.median)}% - 1.5px)` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-ink-600">
        <span>{won(stats.min)}</span>
        <span className="font-medium text-ink-900">중앙값 {won(stats.median)}</span>
        <span>{won(stats.max)}</span>
      </div>
    </div>
  );
}

export default function QuotesPage() {
  const [region, setRegion] = useState<string>("");
  const [progressive, setProgressive] = useState(false);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 제보 폼
  const [myRegion, setMyRegion] = useState("서울");
  const [storeKind, setStoreKind] = useState<"체인" | "동네" | "온라인/기타">("동네");
  const [lensIndex, setLensIndex] = useState<LensIndexId>("1.60");
  const [lensOptions, setLensOptions] = useState<LensOptionId[]>(["hard-multi"]);
  const [lensPrice, setLensPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (region) params.set("region", region);
      if (progressive) params.set("progressive", "true");
      const res = await fetch(`/api/quotes?${params}`);
      setData(await parseJsonOrThrow<StatsResponse>(res));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [region, progressive]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: myRegion,
          storeKind,
          lensIndex,
          lensOptions,
          lensPrice: Number(lensPrice.replace(/[^0-9]/g, "")),
          progressive: lensOptions.includes("progressive"),
          note: note.trim() || undefined,
        }),
      });
      const data = await safeParseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error ?? "제보를 저장하지 못했습니다.");
      setSubmitted(true);
      setLensPrice("");
      setNote("");
      await load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "제보에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-ink-900">다른 사람들은 렌즈에 얼마 냈나</h1>
        <p className="mt-2 text-ink-800">
          안경원 렌즈 값은 정가가 없다시피 합니다. 같은 굴절률인데 매장마다 몇 배씩 차이가 나도
          비교할 데가 없었어요. 실제로 낸 금액을 서로 알려주면 그게 기준이 됩니다.
        </p>
      </header>

      <Callout tone="privacy">
        제보에는 <strong>도수를 받지 않습니다.</strong> 지역·매장 유형·굴절률·옵션·금액만 남고,
        누가 냈는지 알 수 있는 정보는 저장하지 않습니다. 로그인도 없습니다.
      </Callout>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">전국</option>
            {(data?.regions.length ? data.regions : REGIONS).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              checked={progressive}
              onChange={(e) => setProgressive(e.target.checked)}
            />
            누진다초점만 보기
          </label>
        </div>

        {loading && <p className="text-sm text-ink-600">불러오는 중…</p>}
        {loadError && <Callout tone="warn">{loadError}</Callout>}

        {data && (
          <div className="space-y-3">
            <p className="text-sm text-ink-700">
              제보 {data.total.toLocaleString("ko-KR")}건
              {region && ` · ${region}`}
              {progressive && " · 누진"}
            </p>
            {LENS_INDEX_IDS.map((id) => {
              const s = data.byIndex[id];
              return (
                <div key={id} className="rounded-2xl border border-ink-200 bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink-900">{LENS_INDEXES[id].label}</span>
                    {s ? (
                      <span className="text-sm tabular-nums text-ink-700">
                        절반이 {won(s.p25)}~{won(s.p75)} 사이 · {s.count}건
                      </span>
                    ) : (
                      <span className="text-sm text-ink-600">
                        제보 {MIN_REPORTS}건이 모이면 보여드립니다
                      </span>
                    )}
                  </div>
                  {s && <DistributionBar stats={s} />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-ink-300 bg-white p-5">
        <h2 className="text-lg font-bold text-ink-900">내가 낸 금액 알려주기</h2>
        <p className="mt-1 text-sm text-ink-700">
          <strong>렌즈 값만</strong> 적어주세요. 테 값은 브랜드마다 달라서 비교가 안 됩니다.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="지역">
            <select
              value={myRegion}
              onChange={(e) => setMyRegion(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="매장 유형">
            <div className="flex flex-wrap gap-2">
              {(["동네", "체인", "온라인/기타"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setStoreKind(k)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    storeKind === k
                      ? "border-ink-500 bg-ink-500 text-white"
                      : "border-ink-200 bg-white text-ink-800"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-3">
          <Field label="굴절률">
            <div className="flex flex-wrap gap-2">
              {LENS_INDEX_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLensIndex(id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    lensIndex === id
                      ? "border-ink-500 bg-ink-500 text-white"
                      : "border-ink-200 bg-white text-ink-800"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-3">
          <Field label="함께 넣은 옵션">
            <div className="flex flex-wrap gap-2">
              {LENS_OPTION_IDS.map((id) => {
                const on = lensOptions.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setLensOptions((prev) =>
                        prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      on
                        ? "border-ink-500 bg-ink-500 text-white"
                        : "border-ink-200 bg-white text-ink-800"
                    }`}
                  >
                    {LENS_OPTIONS[id].label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="렌즈 값 (원)" hint="영수증의 렌즈 항목 금액">
            <input
              value={lensPrice}
              onChange={(e) => setLensPrice(e.target.value)}
              inputMode="numeric"
              placeholder="120000"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="한마디 (선택)" hint="예: 학생 할인 받음">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        {submitError && <p className="mt-3 text-sm text-amber-800">{submitError}</p>}
        {submitted && !submitError && (
          <p className="mt-3 text-sm text-emerald-800">제보 고맙습니다. 위 분포에 반영했습니다.</p>
        )}

        <button
          type="button"
          disabled={submitting || !lensPrice.replace(/[^0-9]/g, "")}
          onClick={() => void submit()}
          className="mt-4 w-full rounded-xl bg-ink-600 py-3 font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "보내는 중…" : "제보하기"}
        </button>
      </section>
    </div>
  );
}
