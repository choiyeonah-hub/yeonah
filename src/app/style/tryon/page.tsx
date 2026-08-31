"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { loadCloset, type ClosetItem } from "@/lib/style/closet";

type Category = "auto" | "tops" | "bottoms" | "one-pieces";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "auto", label: "자동 판별" },
  { value: "tops", label: "상의" },
  { value: "bottoms", label: "하의" },
  { value: "one-pieces", label: "원피스" },
];

// 사람 사진은 전신이 나와야 해서 조금 크게, 옷 사진은 형태만 보이면 되므로 작게 줄인다.
async function toDataUrl(file: File, maxSide: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리할 수 없는 브라우저입니다.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function TryOnPage() {
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("auto");
  const [closet, setCloset] = useState<ClosetItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    setCloset(loadCloset().filter((item) => item.imageUrl));
  }, []);

  const run = async () => {
    if (!modelImage || !garmentImage) return;
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      const response = await fetch("/api/style/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelImage, garmentImage, category }),
      });
      const data = await response.json().catch(() => ({ error: "서버 응답을 읽지 못했습니다." }));
      if (!response.ok) throw new Error(data?.error ?? "가상 피팅에 실패했습니다.");
      setResults(data.imageUrls as string[]);
      setElapsed(typeof data.elapsedMs === "number" ? data.elapsedMs : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가상 피팅에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/style" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← 진단으로
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">가상 피팅</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          전신 사진과 옷 사진을 넣으면 그 옷을 입은 모습을 생성합니다. 옷장에 등록한 옷은 바로 골라 쓸 수 있습니다.
          이미지 1장마다 외부 API 비용이 발생하므로 <strong>버튼을 누를 때만</strong> 호출합니다.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-bold text-neutral-900">1. 내 전신 사진</h2>
          <p className="mt-1 text-xs text-neutral-500">정면, 전신이 다 나오고 배경이 단순할수록 결과가 좋습니다.</p>
          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-4 hover:border-neutral-400">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  setModelImage(await toDataUrl(file, 1024));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "이미지를 읽지 못했습니다.");
                }
              }}
            />
            {modelImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={modelImage} alt="내 전신 사진" className="h-48 rounded-lg object-cover" />
            ) : (
              <span className="text-sm text-neutral-500">전신 사진 올리기</span>
            )}
          </label>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-bold text-neutral-900">2. 입어볼 옷</h2>
          <p className="mt-1 text-xs text-neutral-500">옷만 찍힌 사진(누끼/평면 촬영)이 가장 잘 됩니다.</p>

          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-4 hover:border-neutral-400">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  setGarmentImage(await toDataUrl(file, 768));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "이미지를 읽지 못했습니다.");
                }
              }}
            />
            {garmentImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={garmentImage} alt="입어볼 옷" className="h-48 rounded-lg object-cover" />
            ) : (
              <span className="text-sm text-neutral-500">옷 사진 올리기</span>
            )}
          </label>

          {closet.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-neutral-600">내 옷장에서 고르기</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {closet.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGarmentImage(item.imageUrl ?? null)}
                    className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                      garmentImage === item.imageUrl ? "border-neutral-900" : "border-neutral-200"
                    }`}
                    title={item.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.name} className="h-16 w-14 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-bold text-neutral-900">3. 옷 종류</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setCategory(entry.value)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                category === entry.value
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-relaxed text-red-700">{error}</p>}

      <button
        type="button"
        onClick={() => void run()}
        disabled={!modelImage || !garmentImage || busy}
        className="mt-4 w-full rounded-2xl bg-neutral-900 py-4 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {busy ? "생성 중… (보통 10~30초)" : "가상 피팅 실행"}
      </button>
      {!modelImage || !garmentImage ? (
        <p className="mt-2 text-center text-xs text-neutral-500">전신 사진과 옷 사진이 모두 필요합니다.</p>
      ) : null}

      {results.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-neutral-900">결과</h2>
          {elapsed !== null && (
            <p className="mt-1 text-xs text-neutral-500">{(elapsed / 1000).toFixed(1)}초 걸렸습니다.</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {results.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="가상 피팅 결과" className="w-full rounded-2xl border border-neutral-200" />
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 rounded-2xl bg-neutral-100 p-4 text-xs leading-relaxed text-neutral-600">
        · 가상 피팅은 외부 서비스(FASHN)로 사진을 보내 생성합니다. 진단·옷장과 달리 <strong>사진이 서버 밖으로
        나가므로</strong>, 올리기 전에 사진을 확인해 주세요. 생성 결과는 실제 착용감·사이즈를 보장하지 않고,
        기장과 핏은 진단 결과의 cm 수치로 확인하는 편이 정확합니다.
      </p>
    </main>
  );
}
