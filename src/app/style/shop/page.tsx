"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadLastProfile } from "@/lib/style/closet";
import { buildShopQueries, shopLinks, type ShopQuery } from "@/lib/style/shopping/queries";
import type { RankedProduct, SearchOutcome } from "@/lib/style/shopping/types";
import type { StyleProfileResult } from "@/lib/style/types";

const GRADE_STYLE: Record<RankedProduct["grade"], string> = {
  best: "bg-emerald-100 text-emerald-800",
  good: "bg-neutral-200 text-neutral-700",
  caution: "bg-amber-100 text-amber-800",
  unknown: "bg-neutral-100 text-neutral-500",
};

const GRADE_LABEL: Record<RankedProduct["grade"], string> = {
  best: "베스트 컬러",
  good: "무난",
  caution: "주의",
  unknown: "색 확인 필요",
};

function QueryCard({
  query,
  colorTypeId,
}: {
  query: ShopQuery;
  colorTypeId: string;
}) {
  const [outcome, setOutcome] = useState<(SearchOutcome & { providerEnabled?: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/style/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: query.keyword,
          colorTypeId,
          targetHex: query.targetHex,
          limit: 10,
        }),
      });
      const data = await response.json().catch(() => ({ error: "서버 응답을 읽지 못했습니다." }));
      if (!response.ok) throw new Error(data?.error ?? "상품을 불러오지 못했습니다.");
      setOutcome(data as SearchOutcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "상품을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 h-10 w-10 shrink-0 rounded-lg border border-neutral-200"
          style={{ backgroundColor: query.targetHex }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-neutral-500">{query.slotLabel}</p>
          <h3 className="text-base font-semibold text-neutral-900">{query.keyword}</h3>
          <p className="font-mono text-[11px] text-neutral-500">
            {query.targetName} {query.targetHex}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {query.checkList.filter(Boolean).map((line) => (
          <li key={line} className="flex gap-2 text-xs text-neutral-600">
            <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
            <span className="leading-relaxed">{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {shopLinks(query.keyword).map((link) => (
          <a
            key={link.site}
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-200"
          >
            {link.site}에서 검색 ↗
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void load()}
        disabled={busy}
        className="mt-3 w-full rounded-xl border border-neutral-300 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {busy ? "불러오는 중…" : outcome ? "다시 불러오기" : "쿠팡에서 상품 불러오기 (제휴 API)"}
      </button>

      {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      {outcome?.unavailable && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs leading-relaxed text-amber-800">
          {outcome.unavailable}
        </p>
      )}

      {outcome && outcome.products.length > 0 && (
        <div className="mt-3 space-y-2">
          {outcome.cached && (
            <p className="text-[11px] text-neutral-400">
              캐시된 결과{outcome.fetchedAt ? ` (${new Date(outcome.fetchedAt).toLocaleString("ko-KR")} 기준)` : ""} ·
              가격과 재고는 실제와 다를 수 있습니다
            </p>
          )}
          {outcome.products.slice(0, 6).map((product) => (
            <a
              key={product.id}
              href={product.productUrl}
              target="_blank"
              rel="noreferrer noopener sponsored"
              className="flex gap-3 rounded-xl border border-neutral-200 p-2 hover:border-neutral-400"
            >
              {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs leading-snug text-neutral-800">{product.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${GRADE_STYLE[product.grade]}`}>
                    {GRADE_LABEL[product.grade]}
                    {typeof product.deltaE === "number" && ` · ΔE ${product.deltaE}`}
                  </span>
                  {product.detectedHex && (
                    <span
                      className="h-3.5 w-3.5 rounded border border-neutral-200"
                      style={{ backgroundColor: product.detectedHex }}
                      aria-hidden
                    />
                  )}
                  {typeof product.price === "number" && (
                    <span className="text-[11px] font-medium text-neutral-700">
                      {product.price.toLocaleString("ko-KR")}원
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

export default function ShopPage() {
  const [profile, setProfile] = useState<StyleProfileResult | null>(null);
  const [ready, setReady] = useState(false);
  const [slot, setSlot] = useState<string>("all");

  useEffect(() => {
    setProfile(loadLastProfile());
    setReady(true);
  }, []);

  const queries = useMemo(() => (profile ? buildShopQueries(profile) : []), [profile]);
  const slots = useMemo(() => Array.from(new Set(queries.map((query) => query.slot))), [queries]);
  const visible = slot === "all" ? queries : queries.filter((query) => query.slot === slot);

  if (!ready) return <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-neutral-500">불러오는 중…</main>;

  if (!profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-neutral-900">쇼핑 추천</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          먼저 진단을 마치면, 내 팔레트 색과 내 치수로 만든 검색어와 상품 추천을 보여드립니다.
        </p>
        <Link
          href="/style"
          className="mt-5 inline-block rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
        >
          진단하러 가기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/style" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← 진단으로
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">쇼핑 추천</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          <strong>{profile.colorType.name}</strong> 팔레트 색과 키 {profile.body.height}cm 기준 권장 치수를 합쳐
          검색어를 만들었습니다. 검색어와 쇼핑몰 링크는 제휴 없이도 바로 쓸 수 있고, 쿠팡 파트너스 키가 설정돼
          있으면 상품까지 불러와 <strong>색을 ΔE로 판정</strong>해 정렬합니다.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        {["all", ...slots].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSlot(value)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              slot === value ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {value === "all"
              ? "전체"
              : queries.find((query) => query.slot === value)?.slotLabel ?? value}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {visible.map((query) => (
          <QueryCard key={`${query.slot}-${query.keyword}`} query={query} colorTypeId={profile.colorType.id} />
        ))}
      </div>

      <div className="mt-8 space-y-2 rounded-2xl bg-neutral-100 p-4 text-xs leading-relaxed text-neutral-600">
        <p>
          · 상품 정보는 <strong>쿠팡 파트너스 Open API</strong>에서 가져오며, 검색 API는 시간당 10회 제한이 있어
          결과를 캐시해 씁니다. 따라서 <strong>가격·재고는 실시간이 아니며</strong> 실제 상품 페이지와 다를 수 있습니다.
        </p>
        <p>
          · 색 판정은 <strong>상품 제목의 색 이름</strong>을 기준으로 합니다. 제목에 색이 없으면 판정하지 않고
          "색 확인 필요"로 표시합니다. 실제 색은 상세 이미지를 확인하세요.
        </p>
        <p>
          · 쿠팡 파트너스 링크를 통해 구매가 발생하면 링크 소유자에게 수수료가 지급될 수 있습니다.
        </p>
      </div>
    </main>
  );
}
