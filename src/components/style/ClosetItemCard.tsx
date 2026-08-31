"use client";

import { colorSpec, readableTextColor } from "@/lib/style/color";
import { CLOSET_CATEGORIES, type ClosetVerdict } from "@/lib/style/closet";

const GRADE_STYLE = {
  best: "bg-emerald-100 text-emerald-800",
  good: "bg-neutral-200 text-neutral-700",
  caution: "bg-amber-100 text-amber-800",
} as const;

export default function ClosetItemCard({
  verdict,
  onRemove,
}: {
  verdict: ClosetVerdict;
  onRemove: (id: string) => void;
}) {
  const { item, color, length, silhouette } = verdict;
  const category = CLOSET_CATEGORIES.find((entry) => entry.id === item.category);
  const spec = colorSpec(item.hex);

  return (
    <article className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="shrink-0">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-24 w-20 rounded-lg object-cover" />
        ) : (
          <div
            className="flex h-24 w-20 items-center justify-center rounded-lg text-[10px] font-mono"
            style={{ backgroundColor: spec.hex, color: readableTextColor(spec.hex) }}
          >
            {spec.hex}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">{item.name}</p>
            <p className="text-[11px] text-neutral-500">
              {category?.label}
              {typeof item.lengthCm === "number" && ` · ${category?.lengthLabel} ${item.lengthCm}cm`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="shrink-0 text-[11px] text-neutral-400 hover:text-red-600"
          >
            삭제
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${GRADE_STYLE[color.grade]}`}>
            {color.gradeLabel} · ΔE {color.deltaE}
          </span>
          <span
            className="h-4 w-4 rounded border border-neutral-200"
            style={{ backgroundColor: item.hex }}
            aria-hidden
          />
          <span className="font-mono text-[11px] text-neutral-500">{spec.hex}</span>
          <span className="text-neutral-300">→</span>
          <span
            className="h-4 w-4 rounded border border-neutral-200"
            style={{ backgroundColor: color.nearest.hex }}
            aria-hidden
          />
          <span className="text-[11px] text-neutral-500">
            {color.nearest.name} {color.nearest.hex}
          </span>
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">{color.comment}</p>

        {length && (
          <p
            className={`mt-1.5 rounded-lg px-2 py-1.5 text-xs leading-relaxed ${
              length.ok ? "bg-neutral-50 text-neutral-600" : "bg-amber-50 text-amber-800"
            }`}
          >
            <span className="font-medium">{length.label}</span> · 권장 {length.recommended}
            <br />
            {length.comment}
          </p>
        )}

        {silhouette.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {silhouette.map((note) => (
              <li key={note} className="text-[11px] leading-relaxed text-neutral-500">
                · {note}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
