// 색 계산 유틸. 퍼스널컬러 진단은 "따뜻함(웜/쿨) · 명도 · 채도 · 대비" 네 축으로 이루어지는데,
// 이 축들을 RGB에서 바로 재면 사람 눈과 어긋나기 때문에 CIE Lab / LCh로 변환해서 계산한다.

export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };
export type Lab = { L: number; a: number; b: number };
export type LCH = { L: number; C: number; h: number };

export function normalizeHex(input: string): string | null {
  if (!input) return null;
  let hex = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toUpperCase()}`;
}

export function hexToRgb(hex: string): RGB {
  const normalized = normalizeHex(hex) ?? "#000000";
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to2 = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0").toUpperCase();
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// D65 기준 sRGB → XYZ → Lab
export function rgbToLab({ r, g, b }: RGB): Lab {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) / 1.0;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToLch({ L, a, b }: Lab): LCH {
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

export function hexToLab(hex: string): Lab {
  return rgbToLab(hexToRgb(hex));
}

export function hexToLch(hex: string): LCH {
  return labToLch(hexToLab(hex));
}

// 두 색의 지각적 거리(CIE76). 팔레트에서 가장 가까운 색을 찾을 때 쓴다.
export function deltaE(hexA: string, hexB: string): number {
  const a = hexToLab(hexA);
  const b = hexToLab(hexB);
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

export function nearestHex(hex: string, candidates: string[]): string {
  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = deltaE(hex, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

// 스와치 위에 올릴 글자 색(가독성 확보).
export function readableTextColor(hex: string): string {
  return contrastRatio(hex, "#FFFFFF") >= 3.2 ? "#FFFFFF" : "#1B1B1F";
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

export type ColorSpec = {
  hex: string;
  rgb: string;
  hsl: string;
  lab: string;
  lch: string;
  cmyk: string;
};

// 화면에 "색값 상세"로 보여줄 표기들. 인쇄/원단 발주까지 고려해서 CMYK도 같이 낸다.
export function colorSpec(hex: string): ColorSpec {
  const normalized = normalizeHex(hex) ?? "#000000";
  const rgb = hexToRgb(normalized);
  const hsl = rgbToHsl(rgb);
  const lab = rgbToLab(rgb);
  const lch = labToLch(lab);

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const k = 1 - Math.max(r, g, b);
  const denominator = 1 - k || 1;
  const c = k === 1 ? 0 : (1 - r - k) / denominator;
  const m = k === 1 ? 0 : (1 - g - k) / denominator;
  const y = k === 1 ? 0 : (1 - b - k) / denominator;

  const round = (v: number, digits = 0) => Number(v.toFixed(digits));

  return {
    hex: normalized,
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    lab: `L* ${round(lab.L, 1)} a* ${round(lab.a, 1)} b* ${round(lab.b, 1)}`,
    lch: `L ${round(lch.L, 1)} C ${round(lch.C, 1)} H ${round(lch.h, 0)}°`,
    cmyk: `C ${round(c * 100)} M ${round(m * 100)} Y ${round(y * 100)} K ${round(k * 100)}`,
  };
}

// 색 하나의 성격을 웜/쿨·명도·채도로 요약. 진단 근거 문장을 만들 때 쓴다.
export function colorCharacter(hex: string): {
  warmth: number; // -100(쿨) ~ +100(웜)
  lightness: number; // 0 ~ 100
  chroma: number; // 0 ~ 100
  label: string;
} {
  const { L, C, h } = hexToLch(hex);
  // 노랑(90°) 쪽에 가까울수록 웜, 파랑/보라(270°~300°) 쪽에 가까울수록 쿨.
  const warmAngle = 75;
  let diff = Math.abs(((h - warmAngle + 540) % 360) - 180); // 웜 기준각과의 거리(0~180)
  diff = 180 - diff; // 웜 기준각에 가까울수록 커진다
  const warmth = Math.round(((diff - 90) / 90) * 100);
  const lightness = Math.round(L);
  const chroma = Math.round(Math.min(100, (C / 90) * 100));
  const label = `${warmth >= 0 ? "웜" : "쿨"} · ${
    lightness >= 70 ? "밝음" : lightness >= 45 ? "중간" : "어두움"
  } · ${chroma >= 55 ? "선명" : chroma >= 25 ? "중채도" : "저채도"}`;
  return { warmth, lightness, chroma, label };
}
