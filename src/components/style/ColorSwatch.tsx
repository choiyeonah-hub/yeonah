"use client";

import { useState } from "react";

import { colorSpec, readableTextColor } from "@/lib/style/color";
import type { PaletteColor } from "@/lib/style/types";

type Props = {
  color: PaletteColor;
  size?: "sm" | "md";
  /** 클릭하면 RGB·HSL·Lab·CMYK까지 펼쳐 보여준다. */
  expandable?: boolean;
};

export default function ColorSwatch({ color, size = "md", expandable = true }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const spec = colorSpec(color.hex);
  const textColor = readableTextColor(spec.hex);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(spec.hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* 클립보드를 못 쓰는 환경에서는 조용히 넘어간다 */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => (expandable ? setOpen((prev) => !prev) : copy())}
        className={`flex w-full flex-col justify-end text-left transition ${
          size === "sm" ? "h-16 p-2" : "h-24 p-3"
        }`}
        style={{ backgroundColor: spec.hex, color: textColor }}
      >
        <span className={`font-semibold ${size === "sm" ? "text-xs" : "text-sm"}`}>{color.name}</span>
        <span className="font-mono text-[11px] opacity-90">{spec.hex}</span>
      </button>

      <div className="px-3 py-2">
        <p className="text-[11px] leading-tight text-neutral-500">{color.use}</p>

        {open && (
          <dl className="mt-2 space-y-1 border-t border-neutral-100 pt-2 text-[11px] text-neutral-600">
            {[
              ["RGB", spec.rgb],
              ["HSL", spec.hsl],
              ["CIE Lab", spec.lab],
              ["LCh", spec.lch],
              ["CMYK", spec.cmyk],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="shrink-0 text-neutral-400">{label}</dt>
                <dd className="text-right font-mono">{value}</dd>
              </div>
            ))}
            <button
              type="button"
              onClick={copy}
              className="mt-1 w-full rounded-md bg-neutral-100 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-200"
            >
              {copied ? "복사됨!" : "HEX 복사"}
            </button>
          </dl>
        )}
      </div>
    </div>
  );
}
