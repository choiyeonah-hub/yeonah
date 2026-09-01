import { LENS_INDEXES, LENS_INDEX_IDS, LENS_OPTIONS } from "./lenses";
import {
  computeThickness,
  maxRadiusFromCenter,
  thickestMeridian,
  type LensThickness,
} from "./optics";
import type { FrameRimId, LensIndexId, LensOptionId, Prescription } from "./types";

/**
 * 굴절률을 한 단계 올려서 줄어드는 두께가 이 값보다 작으면,
 * 사람 눈으로는 사실상 구분되지 않는다고 본다.
 */
export const VISIBLE_GAIN_MM = 0.5;

/** 이 두께 이하면 테 안에 무리 없이 숨는다(테 마감별로 다르다). */
const COMFORT_EDGE_MM: Record<FrameRimId, number> = {
  full: 5,
  half: 3.5,
  rimless: 3,
};

/** 계산에 쓸 테 치수. 각인 숫자만 알면 된다. */
export type FrameSpec = {
  lensWidth: number;
  bridge: number;
  lensHeight: number;
  rim: FrameRimId;
};

export type IndexOption = LensThickness & {
  price: number;
  /** 가장 얇은 선택지 대비 몇 mm 두꺼운지 */
  thickerThanBestMm: number;
  /** 한 단계 아래(더 싼) 굴절률 대비 몇 mm 얇아지는지 */
  gainOverCheaperMm: number | null;
  /** 그 0.1mm를 위해 더 내는 돈 */
  wonPerTenthMm: number | null;
  isRecommended: boolean;
  /** 이 굴절률로도 두께가 목표 이하로 안 내려가는 경우 */
  overComfort: boolean;
};

export type OptionVerdict = {
  id: LensOptionId;
  label: string;
  price: number;
  /** "필요" | "선택" | "근거 약함" */
  verdict: "필요" | "선택" | "근거 약함";
  reason: string;
};

export type LensAdvice = {
  /** 계산에 쓴 도수(더 두꺼운 쪽 눈의 최대 경선) */
  powerD: number;
  /** 광학 중심에서 가장 먼 지점까지 거리(mm) */
  halfDiameter: number;
  /** 한쪽당 편심량(mm) */
  decentration: number;
  options: IndexOption[];
  recommended: LensIndexId;
  /** 한 문장 결론 */
  headline: string;
  /** 근거 문장들 */
  reasons: string[];
  /** 렌즈폭을 줄였을 때 얼마나 얇아지는지 */
  smallerFrame: { lensWidth: number; edgeThickness: number; savedMm: number } | null;
  optionVerdicts: OptionVerdict[];
  cautions: string[];
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 처방 도수와 테 치수로 "어느 굴절률까지가 값을 하는지"를 계산한다.
 *
 * 매장에서 더 비싼 렌즈를 권할 때 소비자가 판단할 근거가 없다는 게 이 앱의 출발점이다.
 * 그래서 결론만 주지 않고 두께·무게·차액을 전부 같이 보여준다.
 */
export function adviseLens(params: {
  prescription: Prescription;
  frame: FrameSpec;
  screenHours: number;
  outdoorHeavy: boolean;
}): LensAdvice {
  const { prescription: rx, frame, screenHours, outdoorHeavy } = params;

  // 두 눈 중 더 두꺼워지는 쪽을 기준으로 잡는다. 안경은 두꺼운 쪽에 맞춰 고민하게 된다.
  const rightPower = thickestMeridian(rx.right.sph, rx.right.cyl);
  const leftPower = thickestMeridian(rx.left.sph, rx.left.cyl);
  const powerD = Math.abs(rightPower) >= Math.abs(leftPower) ? rightPower : leftPower;

  const { halfDiameter, decentration } = maxRadiusFromCenter({
    lensWidth: frame.lensWidth,
    lensHeight: frame.lensHeight,
    bridge: frame.bridge,
    pd: rx.pd,
  });

  const raw = LENS_INDEX_IDS.map((index) =>
    computeThickness({
      index,
      powerD,
      halfDiameter,
      lensWidth: frame.lensWidth,
      lensHeight: frame.lensHeight,
    })
  );

  const isMinus = powerD < 0;
  const keyThickness = (t: LensThickness) => (isMinus ? t.edgeThickness : t.centerThickness);
  const best = Math.min(...raw.map(keyThickness));
  const comfort = COMFORT_EDGE_MM[frame.rim];

  // 싼 것부터 훑으면서 둘 중 하나라도 만족하는 첫 굴절률을 고른다.
  //   (가) 테 안에 숨을 만큼 얇거나
  //   (나) 더 올려봐야 눈에 띄게 얇아지지 않거나
  // 둘을 OR로 묶는 게 중요하다. "목표 두께"만 쓰면 목표를 아슬아슬하게 넘길 때
  // 가장 비싼 렌즈로 튀어버리고, "차이"만 쓰면 아주 두꺼운 렌즈를 그냥 넘긴다.
  const recommended: LensIndexId =
    raw.find((t) => keyThickness(t) <= comfort || keyThickness(t) - best <= VISIBLE_GAIN_MM)
      ?.index ?? raw[raw.length - 1].index;

  const options: IndexOption[] = raw.map((t, i) => {
    const prev = i > 0 ? raw[i - 1] : null;
    const gain = prev ? round1(keyThickness(prev) - keyThickness(t)) : null;
    const priceDiff = prev ? LENS_INDEXES[t.index].price - LENS_INDEXES[prev.index].price : null;
    return {
      ...t,
      price: LENS_INDEXES[t.index].price,
      thickerThanBestMm: round1(keyThickness(t) - best),
      gainOverCheaperMm: gain,
      wonPerTenthMm:
        gain != null && priceDiff != null && gain > 0 ? Math.round(priceDiff / (gain * 10)) : null,
      isRecommended: t.index === recommended,
      overComfort: keyThickness(t) > comfort,
    };
  });

  const rec = options.find((o) => o.isRecommended)!;
  const thinnest = options[options.length - 1];
  const reasons: string[] = [];

  reasons.push(
    `도수 ${powerD.toFixed(2)}D, 광학중심에서 렌즈의 가장 먼 지점까지 ${halfDiameter.toFixed(1)}mm 기준으로 계산했습니다. 여기가 렌즈에서 가장 두꺼운 곳입니다.`
  );
  if (decentration > 0) {
    reasons.push(
      `테의 광학중심 간격(${frame.lensWidth + frame.bridge}mm)이 PD ${rx.pd}mm보다 넓어 한쪽당 ${decentration.toFixed(1)}mm 편심됩니다. 그만큼 바깥쪽이 두꺼워집니다.`
    );
  } else if (rx.pd == null) {
    reasons.push("PD를 몰라 편심 없이 계산했습니다. 실제로는 이 값보다 조금 더 두꺼워집니다.");
  }

  const headline =
    rec.index === thinnest.index
      ? `이 도수와 테에서는 ${LENS_INDEXES[rec.index].label}까지 값을 합니다.`
      : `${LENS_INDEXES[rec.index].label}이면 충분합니다. 더 비싼 렌즈로 올려도 ${rec.thickerThanBestMm}mm 차이입니다.`;

  if (rec.index !== thinnest.index) {
    const extra = thinnest.price - rec.price;
    reasons.push(
      `가장 비싼 ${LENS_INDEXES[thinnest.index].label}까지 올리면 ${extra.toLocaleString("ko-KR")}원을 더 내고 ${rec.thickerThanBestMm}mm 얇아집니다. 0.5mm 미만은 눈으로 구분하기 어렵습니다.`
    );
  }

  const weightDiff = round1(rec.weightGram - thinnest.weightGram);
  if (Math.abs(weightDiff) < 0.5) {
    reasons.push(
      `무게도 거의 같습니다(${rec.weightGram}g vs ${thinnest.weightGram}g). 굴절률이 높을수록 재료가 무거워서, 얇아진 만큼 가벼워지지는 않습니다.`
    );
  }

  // 테를 줄이면 얼마나 얇아지는가 — 렌즈를 바꾸는 것보다 효과가 클 때가 많다.
  let smallerFrame: LensAdvice["smallerFrame"] = null;
  if (frame.lensWidth > 44) {
    const smallerWidth = frame.lensWidth - 4;
    const smaller = maxRadiusFromCenter({
      lensWidth: smallerWidth,
      bridge: frame.bridge,
      lensHeight: frame.lensHeight,
      pd: rx.pd,
    });
    const t = computeThickness({
      index: rec.index,
      powerD,
      halfDiameter: smaller.halfDiameter,
      lensWidth: smallerWidth,
      lensHeight: frame.lensHeight,
    });
    smallerFrame = {
      lensWidth: smallerWidth,
      edgeThickness: keyThickness(t),
      savedMm: round1(keyThickness(rec) - keyThickness(t)),
    };
  }

  // 코팅·기능 옵션 판단
  const optionVerdicts: OptionVerdict[] = [
    {
      id: "hard-multi",
      label: LENS_OPTIONS["hard-multi"].label,
      price: LENS_OPTIONS["hard-multi"].price,
      verdict: "필요",
      reason: "반사 방지와 스크래치 방지는 사실상 기본입니다. 별도 비용을 청구한다면 되물어보세요.",
    },
    {
      id: "uv400",
      label: LENS_OPTIONS.uv400.label,
      price: LENS_OPTIONS.uv400.price,
      verdict: "필요",
      reason: "자외선 차단은 눈 건강과 직결되고 비용도 낮습니다. 요즘은 렌즈에 기본 포함인 경우가 많습니다.",
    },
    {
      id: "blue-cut",
      label: LENS_OPTIONS["blue-cut"].label,
      price: LENS_OPTIONS["blue-cut"].price,
      verdict: "근거 약함",
      reason:
        screenHours >= 8
          ? `화면을 하루 ${screenHours}시간 보신다면 넣어볼 만하지만, 블루라이트 차단이 눈의 피로를 줄인다는 근거는 연구에서 약한 편입니다. 눈부심이 실제로 줄어드는지 매장에서 직접 비교해보고 결정하세요.`
          : "눈의 피로 감소 효과에 대한 근거가 약한 편입니다. 화면 사용이 아주 많은 게 아니라면 우선순위를 낮게 두셔도 됩니다.",
    },
    {
      id: "photochromic",
      label: LENS_OPTIONS.photochromic.label,
      price: LENS_OPTIONS.photochromic.price,
      verdict: outdoorHeavy ? "선택" : "근거 약함",
      reason: outdoorHeavy
        ? "야외 활동이 많다면 선글라스를 따로 들고 다니지 않아도 됩니다. 차 안에서는 잘 변하지 않는 점만 감안하세요."
        : "실내 위주라면 값에 비해 쓸 일이 적습니다.",
    },
    {
      id: "anti-fog",
      label: LENS_OPTIONS["anti-fog"].label,
      price: LENS_OPTIONS["anti-fog"].price,
      verdict: "선택",
      reason: "마스크를 자주 쓰거나 실내외 온도차가 큰 환경이면 체감이 큽니다. 아니면 필요 없습니다.",
    },
  ];

  if (rx.add != null && rx.add > 0) {
    optionVerdicts.push({
      id: "progressive",
      label: LENS_OPTIONS.progressive.label,
      price: LENS_OPTIONS.progressive.price,
      verdict: "필요",
      reason: `가입도(ADD +${rx.add.toFixed(2)})가 있는 처방입니다. 먼 곳과 가까운 곳을 한 렌즈로 보려면 필요합니다.`,
    });
  }

  const cautions: string[] = [];
  const cylMax = Math.max(Math.abs(rx.right.cyl ?? 0), Math.abs(rx.left.cyl ?? 0));
  if (cylMax >= 2) {
    cautions.push(
      `난시가 ${cylMax.toFixed(2)}D로 높습니다. 축(AXIS)이 조금만 틀어져도 어지러우니 조립 후 축 확인을 요청하세요.`
    );
  }
  if (Math.abs((rx.right.sph ?? 0) - (rx.left.sph ?? 0)) >= 2) {
    cautions.push(
      "양쪽 도수 차이(부동시)가 2D 이상입니다. 좌우 렌즈 두께와 상이 다르게 느껴질 수 있어 안경사와 상담이 필요합니다."
    );
  }
  if (rx.pd == null) {
    cautions.push("PD가 없으면 편심량을 못 정합니다. 매장에서 반드시 측정해 달라고 하세요.");
  }
  if (frame.rim !== "full" && Math.abs(powerD) >= 4) {
    cautions.push(
      `${frame.rim === "rimless" ? "무테" : "하금테"}는 렌즈 두께가 그대로 드러납니다. 도수 ${Math.abs(powerD).toFixed(2)}D에서는 풀테가 유리합니다.`
    );
  }
  if (rx.measuredAt) {
    const days = (Date.now() - new Date(rx.measuredAt).getTime()) / 86400000;
    if (days > 365) cautions.push("처방전이 1년 이상 지났습니다. 도수가 바뀌었을 수 있습니다.");
  }

  return {
    powerD,
    halfDiameter: round1(halfDiameter),
    decentration: round1(decentration),
    options,
    recommended,
    headline,
    reasons,
    smallerFrame,
    optionVerdicts,
    cautions,
  };
}
