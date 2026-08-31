"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ClosetItemCard from "@/components/style/ClosetItemCard";
import {
  buildClosetOutfits,
  CLOSET_CATEGORIES,
  judgeItem,
  loadCloset,
  loadLastProfile,
  saveCloset,
  type ClosetCategory,
  type ClosetItem,
} from "@/lib/style/closet";
import { normalizeHex } from "@/lib/style/color";
import { extractItemColors } from "@/lib/style/dominantColor";
import type { StyleProfileResult } from "@/lib/style/types";

export default function ClosetPage() {
  const [profile, setProfile] = useState<StyleProfileResult | null>(null);
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [ready, setReady] = useState(false);

  const [category, setCategory] = useState<ClosetCategory>("top");
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#B0B0B0");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [lengthCm, setLengthCm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(loadLastProfile());
    setItems(loadCloset());
    setReady(true);
  }, []);

  const persist = (next: ClosetItem[]) => {
    setItems(next);
    const result = saveCloset(next);
    if (!result.ok && result.error) setError(result.error);
  };

  const verdicts = useMemo(
    () => (profile ? items.map((item) => judgeItem(item, profile)) : []),
    [items, profile],
  );

  const outfits = useMemo(
    () => (profile ? buildClosetOutfits(verdicts, profile) : []),
    [verdicts, profile],
  );

  const summary = useMemo(() => {
    const counts = { best: 0, good: 0, caution: 0 };
    verdicts.forEach((verdict) => {
      counts[verdict.color.grade] += 1;
    });
    return counts;
  }, [verdicts]);

  const onPhoto = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const extracted = await extractItemColors(file);
      setCandidates(extracted.colors);
      setHex(extracted.colors[0]);
      setThumbnail(extracted.thumbnail || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진에서 색을 뽑지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const addItem = () => {
    const normalized = normalizeHex(hex);
    if (!normalized) {
      setError("색상 코드를 확인해주세요 (#RRGGBB).");
      return;
    }
    const parsedLength = Number(lengthCm);
    const item: ClosetItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      name: name.trim() || CLOSET_CATEGORIES.find((entry) => entry.id === category)!.label,
      hex: normalized,
      lengthCm: Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : undefined,
      imageUrl: thumbnail,
      createdAt: new Date().toISOString(),
    };
    persist([item, ...items]);
    setName("");
    setLengthCm("");
    setCandidates([]);
    setThumbnail(undefined);
    setError(null);
  };

  const activeCategory = CLOSET_CATEGORIES.find((entry) => entry.id === category)!;

  if (!ready) return <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-neutral-500">불러오는 중…</main>;

  if (!profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-neutral-900">내 옷장</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          옷장 판정을 하려면 먼저 진단 결과가 있어야 합니다. 진단을 한 번 마치면 이 브라우저에 결과가
          저장되고, 그 다음부터 옷장의 옷들을 내 팔레트·내 치수와 비교해 드립니다.
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
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/style" className="text-neutral-500 hover:text-neutral-800">
          ← 진단 결과로
        </Link>
        <Link href="/style/shop" className="text-neutral-500 hover:text-neutral-800">
          쇼핑 추천 →
        </Link>
        <Link href="/style/tryon" className="text-neutral-500 hover:text-neutral-800">
          가상 피팅 →
        </Link>
      </div>

      <header className="mt-3">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">내 옷장</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          가진 옷을 등록하면 <strong>{profile.colorType.name}</strong> 팔레트와의 색 거리(ΔE), 그리고
          키 {profile.body.height}cm 기준 권장 기장과 비교해 판정합니다. 사진과 목록은 서버에 올라가지 않고
          <strong> 이 브라우저에만</strong> 저장됩니다.
        </p>
        {items.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
              베스트 {summary.best}
            </span>
            <span className="rounded-full bg-neutral-200 px-3 py-1 font-medium text-neutral-700">
              무난 {summary.good}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
              주의 {summary.caution}
            </span>
          </p>
        )}
      </header>

      {/* ── 등록 ─────────────────────────────────────────────── */}
      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-bold text-neutral-900">옷 등록하기</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {CLOSET_CATEGORIES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setCategory(entry.id)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                category === entry.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-4 text-center hover:border-neutral-400">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onPhoto(file);
              }}
            />
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt="등록할 옷" className="h-28 rounded-lg object-cover" />
            ) : (
              <span className="text-sm text-neutral-500">
                {busy ? "색을 뽑는 중…" : "옷 사진 올리기 (색 자동 인식)"}
              </span>
            )}
          </label>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">이름</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 베이지 니트"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </label>

            <div>
              <span className="text-xs font-medium text-neutral-600">색</span>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-neutral-200 p-1.5">
                <input
                  type="color"
                  value={hex}
                  onChange={(event) => setHex(event.target.value.toUpperCase())}
                  className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={hex}
                  onChange={(event) => setHex(event.target.value.toUpperCase())}
                  className="w-full min-w-0 font-mono text-xs text-neutral-700 outline-none"
                />
              </div>
              {candidates.length > 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500">사진에서 찾은 색</span>
                  {candidates.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => setHex(candidate)}
                      className={`h-6 w-6 rounded border-2 ${
                        hex === candidate ? "border-neutral-900" : "border-neutral-200"
                      }`}
                      style={{ backgroundColor: candidate }}
                      aria-label={candidate}
                    />
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                {activeCategory.lengthLabel} (cm, 선택)
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={lengthCm}
                onChange={(event) => setLengthCm(event.target.value)}
                placeholder={activeCategory.lengthHint}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
              <span className="mt-0.5 block text-[10px] text-neutral-400">{activeCategory.lengthHint}</span>
            </label>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

        <button
          type="button"
          onClick={addItem}
          className="mt-4 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          옷장에 추가
        </button>
      </section>

      {/* ── 목록 ─────────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-neutral-900">등록한 옷 {items.length}개</h2>
          <div className="mt-4 grid gap-3">
            {verdicts.map((verdict) => (
              <ClosetItemCard
                key={verdict.item.id}
                verdict={verdict}
                onRemove={(id) => persist(items.filter((item) => item.id !== id))}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 옷장 코디 ────────────────────────────────────────── */}
      {outfits.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-neutral-900">내 옷장으로 만든 코디</h2>
          <p className="mt-1 text-sm text-neutral-500">
            색 점수(팔레트 거리) + 기장 적합도 + 위아래 색 조화를 합산해 높은 순으로 보여줍니다.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {outfits.map((outfit, index) => (
              <article
                key={outfit.items.map((entry) => entry.item.id).join("-")}
                className="rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900">코디 {index + 1}</h3>
                  <span className="text-[11px] text-neutral-400">점수 {outfit.score}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {outfit.items.map((entry) => (
                    <div key={entry.item.id} className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 shrink-0 rounded border border-neutral-200"
                        style={{ backgroundColor: entry.item.hex }}
                        aria-hidden
                      />
                      <span className="truncate text-sm text-neutral-700">{entry.item.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[11px] text-neutral-400">
                        {entry.item.hex}
                      </span>
                    </div>
                  ))}
                </div>
                {outfit.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2">
                    {outfit.reasons.map((reason) => (
                      <li key={reason} className="text-[11px] leading-relaxed text-neutral-600">
                        · {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <p className="mt-8 rounded-2xl bg-neutral-100 p-4 text-sm leading-relaxed text-neutral-600">
          아직 등록한 옷이 없습니다. 상의·하의·구두를 두어 개씩만 넣어도 옷장 코디가 만들어집니다.
        </p>
      )}
    </main>
  );
}
