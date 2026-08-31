import { deltaE, hexToLch, normalizeHex } from "./color";
import { sizingNumbers } from "./recommend";
import type { BodyDiagnosis, PaletteColor, PersonalColorType, StyleProfileResult } from "./types";

export type ClosetCategory = "top" | "bottom" | "outer" | "dress" | "shoes" | "bag";

export const CLOSET_CATEGORIES: {
  id: ClosetCategory;
  label: string;
  /** 이 카테고리에서 길이 입력이 뜻하는 것 */
  lengthLabel: string;
  lengthHint: string;
}[] = [
  { id: "top", label: "상의", lengthLabel: "총장", lengthHint: "목 옆점 → 밑단" },
  { id: "bottom", label: "하의", lengthLabel: "총장", lengthHint: "허리 → 밑단 (스커트는 치마 길이)" },
  { id: "outer", label: "아우터", lengthLabel: "총장", lengthHint: "목 옆점 → 밑단" },
  { id: "dress", label: "원피스", lengthLabel: "치마 길이", lengthHint: "허리선 → 밑단" },
  { id: "shoes", label: "구두·신발", lengthLabel: "굽 높이", lengthHint: "뒷굽 높이" },
  { id: "bag", label: "가방", lengthLabel: "가로 폭", lengthHint: "가방 가로 길이" },
];

export type ClosetItem = {
  id: string;
  category: ClosetCategory;
  name: string;
  hex: string;
  /** 배색 아이템의 두 번째 색 (선택) */
  secondHex?: string;
  /** 카테고리별 의미가 다른 치수 (cm) */
  lengthCm?: number;
  /** 썸네일 data URL (브라우저 localStorage에만 저장) */
  imageUrl?: string;
  createdAt: string;
};

export type ColorGrade = "best" | "good" | "caution";

export type ColorVerdict = {
  grade: ColorGrade;
  gradeLabel: string;
  deltaE: number;
  nearest: PaletteColor;
  nearestAvoid: PaletteColor;
  avoidDeltaE: number;
  comment: string;
};

export type LengthVerdict = {
  ok: boolean;
  label: string;
  comment: string;
  recommended: string;
};

export type ClosetVerdict = {
  item: ClosetItem;
  color: ColorVerdict;
  length?: LengthVerdict;
  silhouette: string[];
  score: number; // 코디 조합에 쓰는 점수
};

// ΔE(CIE76) 해석 기준. 색 판정 문구를 여기서 한 곳으로 모아 둔다.
function deltaEWording(value: number): string {
  if (value <= 2) return "사실상 같은 색";
  if (value <= 10) return "거의 같은 계열";
  if (value <= 25) return "같은 계열이지만 눈에 띄게 다름";
  return "확실히 다른 색";
}

export function judgeColor(hex: string, colorType: PersonalColorType): ColorVerdict {
  const target = normalizeHex(hex) ?? "#808080";
  const goodPool: PaletteColor[] = [...colorType.best, ...colorType.neutral];

  let nearest = goodPool[0];
  let best = Number.POSITIVE_INFINITY;
  for (const color of goodPool) {
    const distance = deltaE(target, color.hex);
    if (distance < best) {
      best = distance;
      nearest = color;
    }
  }

  let nearestAvoid = colorType.avoid[0];
  let avoidBest = Number.POSITIVE_INFINITY;
  for (const color of colorType.avoid) {
    const distance = deltaE(target, color.hex);
    if (distance < avoidBest) {
      avoidBest = distance;
      nearestAvoid = color;
    }
  }

  let grade: ColorGrade;
  let comment: string;

  if (best <= 12) {
    grade = "best";
    comment = `팔레트의 ${nearest.name}(${nearest.hex})과 ΔE ${best.toFixed(1)} — ${deltaEWording(
      best,
    )}. 얼굴 근처에 그대로 둬도 좋은 색입니다.`;
  } else if (avoidBest < best - 3) {
    grade = "caution";
    comment = `피해야 할 색인 ${nearestAvoid.name}(${nearestAvoid.hex})에 더 가깝습니다(ΔE ${avoidBest.toFixed(
      1,
    )} vs 베스트 ${best.toFixed(1)}). ${nearestAvoid.use}. 얼굴에서 먼 하의·가방으로 쓰거나, 얼굴 근처엔 팔레트 색 이너를 겹쳐 입으세요.`;
  } else if (best <= 28) {
    grade = "good";
    comment = `가장 가까운 팔레트 색은 ${nearest.name}(${nearest.hex}), ΔE ${best.toFixed(
      1,
    )} — ${deltaEWording(best)}. 무난하게 소화됩니다.`;
  } else {
    grade = "caution";
    comment = `팔레트에서 가장 가까운 색도 ΔE ${best.toFixed(
      1,
    )}로 멀어 이 톤에 없는 색입니다. 상의로 쓰기보다 하의·가방처럼 얼굴에서 먼 자리에 두세요.`;
  }

  return {
    grade,
    gradeLabel: { best: "베스트 컬러", good: "무난", caution: "주의" }[grade],
    deltaE: Number(best.toFixed(1)),
    nearest,
    nearestAvoid,
    avoidDeltaE: Number(avoidBest.toFixed(1)),
    comment,
  };
}

export function judgeLength(item: ClosetItem, body: BodyDiagnosis): LengthVerdict | undefined {
  if (typeof item.lengthCm !== "number" || item.lengthCm <= 0) return undefined;
  const s = sizingNumbers(body);
  const value = item.lengthCm;

  if (item.category === "shoes") {
    const [min, max] = s.heelRange;
    const ok = value >= min - 1 && value <= max + 1;
    return {
      ok,
      label: ok ? "권장 굽 높이 범위" : value < min ? "권장보다 낮음" : "권장보다 높음",
      recommended: `${min}~${max}cm`,
      comment: ok
        ? "다리 비율을 메우기에 적당한 굽입니다."
        : value < min
          ? "굽이 낮은 만큼 하의와 신발 색을 맞춰(톤온톤) 다리 라인을 이어 주세요."
          : "굽이 권장보다 높습니다. 편한 날엔 낮춰도 비율이 크게 무너지지 않습니다.",
    };
  }

  if (item.category === "bag") {
    const [min, max] = s.bagWidth;
    const ok = value >= min - 3 && value <= max + 3;
    return {
      ok,
      label: ok ? "몸 폭에 맞는 크기" : value < min ? "작은 편" : "큰 편",
      recommended: `${min}~${max}cm`,
      comment: ok
        ? "몸에 비해 가방이 튀지 않는 크기입니다."
        : value < min
          ? "작아서 귀엽게 쓰이지만, 짐이 많은 날엔 어깨 위치가 애매해질 수 있습니다."
          : "가방이 커서 상체가 눌려 보일 수 있습니다. 세로가 긴 형태를 고르면 완화됩니다.",
    };
  }

  if (item.category === "top" || item.category === "outer") {
    if (item.category === "outer") {
      const targets: [string, number][] = [
        ["재킷", s.jacket],
        ["하프 코트", s.halfCoat],
        ["롱 코트", s.longCoat],
      ];
      const closest = targets.reduce((a, b) =>
        Math.abs(b[1] - value) < Math.abs(a[1] - value) ? b : a,
      );
      const gap = Math.abs(closest[1] - value);
      return {
        ok: gap <= 6,
        label: `${closest[0]} 기장에 가장 가까움 (차이 ${gap.toFixed(0)}cm)`,
        recommended: targets.map(([label, cm]) => `${label} ${cm}cm`).join(" / "),
        comment:
          gap <= 6
            ? "권장 기장대에 들어옵니다."
            : "권장 기장대 사이에 애매하게 걸칩니다. 안에 입는 옷을 같은 톤으로 맞춰 세로선을 유지하세요.",
      };
    }
    const ok = value >= s.topCrop - 4 && value <= s.topLong + 4;
    const isCrop = value <= s.topRegular;
    return {
      ok,
      label: ok ? (isCrop ? "허리선 부근 (크롭~레귤러)" : "긴 기장") : "권장 범위 밖",
      recommended: `크롭 ${s.topCrop} / 레귤러 ${s.topRegular} / 롱 ${s.topLong}cm`,
      comment: ok
        ? isCrop
          ? "허리선이 드러나 다리 비율이 살아나는 기장입니다."
          : "긴 기장이라 하의를 와이드로 받쳐 세로선을 이어 주세요."
        : "권장 범위를 벗어납니다. 밑단을 접거나 앞만 넣어 입어(프렌치턱) 허리선을 만들어 주세요.",
    };
  }

  // 하의·원피스: 허리 기준 치마·바지 길이
  const [dangerLow, dangerHigh] = s.skirtAvoidBand; // 종아리가 가장 굵은 구간
  const inDanger = value >= dangerLow && value <= dangerHigh;
  return {
    ok: !inDanger,
    label: inDanger ? "종아리 중간에서 끊기는 기장" : "괜찮은 기장",
    recommended: `무릎 위 ${s.skirtAboveKnee} / 미디 ${s.skirtMidi} / 롱 ${s.skirtLong}cm`,
    comment: inDanger
      ? `허리에서 ${dangerLow}~${dangerHigh}cm는 종아리가 가장 굵은 지점에서 끝나 다리가 짧아 보입니다. ${s.skirtAboveKnee}cm로 줄이거나 ${s.skirtMidi}cm 미디로 내리는 편이 낫습니다.`
      : "다리 라인이 끊기지 않는 지점에서 끝납니다.",
  };
}

function silhouetteNotes(item: ClosetItem, body: BodyDiagnosis): string[] {
  const notes: string[] = [];
  const frame = body.frame.id;
  const shape = body.shape.id;
  const legBand = body.ratios.find((r) => r.key === "legRatio")?.band ?? "average";

  if (item.category === "top") {
    if (frame === "wave") notes.push("웨이브 골격 — 부드러운 소재로, 허리선에서 끝나게 입으세요.");
    if (frame === "natural") notes.push("내추럴 골격 — 어깨가 조금 떨어지는 여유 있는 핏이 잘 맞습니다.");
    if (frame === "straight") notes.push("스트레이트 골격 — 군더더기 없는 핏이 가장 깔끔합니다.");
    if (shape === "inverted") notes.push("어깨 볼륨(퍼프·패드)은 피하는 편이 좋습니다.");
  }
  if (item.category === "bottom") {
    if (legBand === "low") notes.push("하이웨이스트로 입고, 신발과 톤을 맞추면 다리가 길어 보입니다.");
    if (shape === "pear") notes.push("앞주름 있는 스트레이트가 허벅지를 자연스럽게 지나갑니다.");
  }
  if (item.category === "shoes" && legBand === "low")
    notes.push("발등이 많이 드러나는 형태일수록 다리가 길어 보입니다.");
  if (item.category === "bag")
    notes.push("가방을 허리선 위에 걸면 허리 위치가 높아 보입니다.");
  if (item.category === "dress" && shape === "round")
    notes.push("가슴 아래에서 떨어지는 라인이 배를 눌러 보이지 않게 합니다.");

  return notes;
}

export function judgeItem(item: ClosetItem, profile: StyleProfileResult): ClosetVerdict {
  const color = judgeColor(item.hex, profile.colorType);
  const length = judgeLength(item, profile.body);
  const silhouette = silhouetteNotes(item, profile.body);

  const colorScore = { best: 3, good: 1, caution: -3 }[color.grade];
  const lengthScore = length ? (length.ok ? 1 : -2) : 0;

  return { item, color, length, silhouette, score: colorScore + lengthScore };
}

// ── 내 옷장 안에서 코디 만들기 ────────────────────────────────────────────────

export type ClosetOutfit = {
  items: ClosetVerdict[];
  score: number;
  reasons: string[];
};

export function buildClosetOutfits(
  verdicts: ClosetVerdict[],
  profile: StyleProfileResult,
  limit = 4,
): ClosetOutfit[] {
  const by = (category: ClosetCategory) => verdicts.filter((v) => v.item.category === category);
  const tops = by("top");
  const bottoms = by("bottom");
  const dresses = by("dress");
  const shoes = by("shoes");
  const bags = by("bag");

  const legBand = profile.body.ratios.find((r) => r.key === "legRatio")?.band ?? "average";
  const neutralHexes = profile.colorType.neutral.map((color) => color.hex);
  const isNeutral = (hex: string) => neutralHexes.some((neutral) => deltaE(hex, neutral) <= 20);

  const combos: ClosetOutfit[] = [];

  const scorePair = (aHex: string, bHex: string, reasons: string[]) => {
    let score = 0;
    const distance = deltaE(aHex, bHex);
    if (distance <= 8) {
      score += 2;
      reasons.push(`위아래가 ΔE ${distance.toFixed(1)}로 거의 같은 색 — 세로로 이어지는 톤온톤입니다.`);
    } else if (distance < 22) {
      score -= 2;
      reasons.push(
        `위아래 색이 ΔE ${distance.toFixed(1)}로 애매하게 다릅니다. 같은 색으로 맞추거나 확실히 대비를 주는 편이 낫습니다.`,
      );
    } else if (isNeutral(aHex) || isNeutral(bHex)) {
      score += 2;
      reasons.push("한쪽이 뉴트럴이라 대비가 안정적으로 잡힙니다.");
    } else {
      score += 1;
      reasons.push("색 대비가 확실해 포인트가 살아납니다.");
    }
    return score;
  };

  const withShoesAndBag = (base: ClosetVerdict[], baseScore: number, reasons: string[]) => {
    const bottomHex = base[base.length - 1].item.hex;

    const shoePick = shoes
      .filter((shoe) => shoe.score > 0)
      .map((shoe) => {
        let score = shoe.score;
        const distance = deltaE(shoe.item.hex, bottomHex);
        if (legBand === "low" && distance <= 15) score += 3;
        return { shoe, score, distance };
      })
      .sort((a, b) => b.score - a.score)[0];

    const bagPick = [...bags].filter((bag) => bag.score > 0).sort((a, b) => b.score - a.score)[0];

    const items = [...base];
    let score = baseScore;
    const allReasons = [...reasons];

    if (shoePick) {
      items.push(shoePick.shoe);
      score += shoePick.score;
      if (legBand === "low" && shoePick.distance <= 15) {
        allReasons.push(
          `신발이 하의와 ΔE ${shoePick.distance.toFixed(1)} — 다리에서 신발까지 색이 이어져 가장 길어 보이는 조합입니다.`,
        );
      }
    }
    if (bagPick) {
      items.push(bagPick);
      score += bagPick.score;
    }

    combos.push({ items, score, reasons: allReasons });
  };

  for (const top of tops) {
    for (const bottom of bottoms) {
      const reasons: string[] = [];
      const pairScore = scorePair(top.item.hex, bottom.item.hex, reasons);
      if (top.color.grade === "best")
        reasons.push(`상의가 베스트 컬러(${top.color.nearest.name})라 얼굴빛이 살아납니다.`);
      withShoesAndBag([top, bottom], top.score + bottom.score + pairScore, reasons);
    }
  }

  for (const dress of dresses) {
    const reasons: string[] = [];
    if (dress.color.grade === "best") reasons.push("원피스 색이 베스트 컬러입니다.");
    withShoesAndBag([dress], dress.score + 2, reasons);
  }

  return combos.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ── 브라우저 저장소 ──────────────────────────────────────────────────────────
// 옷 사진은 서버에 올리지 않고 이 브라우저에만 둔다(계정이 없는 앱이라 그게 가장 안전하다).

const CLOSET_KEY = "style:closet:v1";
const PROFILE_KEY = "style:lastResult:v1";

export function loadCloset(): ClosetItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLOSET_KEY);
    return raw ? (JSON.parse(raw) as ClosetItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCloset(items: ClosetItem[]): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false };
  try {
    window.localStorage.setItem(CLOSET_KEY, JSON.stringify(items));
    return { ok: true };
  } catch {
    // 썸네일 때문에 용량(보통 5MB)을 넘긴 경우
    return {
      ok: false,
      error: "브라우저 저장 공간이 가득 찼습니다. 오래된 아이템을 지우거나 사진 없이 등록해 주세요.",
    };
  }
}

export function loadLastProfile(): StyleProfileResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as StyleProfileResult) : null;
  } catch {
    return null;
  }
}

export function saveLastProfile(profile: StyleProfileResult): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* 저장에 실패해도 진단 결과 화면은 그대로 보인다 */
  }
}

export function itemBrightnessLabel(hex: string): string {
  const { L } = hexToLch(hex);
  return L >= 70 ? "밝은 색" : L >= 40 ? "중간 밝기" : "어두운 색";
}
