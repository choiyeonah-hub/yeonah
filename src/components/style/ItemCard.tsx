import ColorSwatch from "./ColorSwatch";
import type { RecommendedItem } from "@/lib/style/types";

const SLOT_LABEL: Record<RecommendedItem["slot"], string> = {
  top: "상의",
  bottom: "하의",
  outer: "아우터",
  dress: "원피스",
  shoes: "구두",
  bag: "가방",
};

export default function ItemCard({ item }: { item: RecommendedItem }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4">
      <span className="inline-block rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-white">
        {SLOT_LABEL[item.slot]}
      </span>
      <h4 className="mt-2 text-base font-semibold text-neutral-900">{item.category}</h4>
      <p className="mt-1 text-sm leading-relaxed text-neutral-600">{item.why}</p>

      <ul className="mt-3 space-y-1">
        {item.spec.map((line) => (
          <li key={line} className="flex gap-2 text-xs text-neutral-700">
            <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
            <span className="leading-relaxed">{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {item.colors.map((color) => (
          <ColorSwatch key={`${item.category}-${color.hex}-${color.name}`} color={color} size="sm" />
        ))}
      </div>
    </article>
  );
}
