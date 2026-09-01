import type { Frame, LensIndexId, LensOptionId, Prescription } from "./types";

/**
 * 렌즈 굴절률.
 * 도수가 높을수록 굴절률이 높은 렌즈를 써야 두께가 얇아진다.
 */
export const LENS_INDEXES: Record<
  LensIndexId,
  { label: string; price: number; description: string; maxPower: number }
> = {
  "1.56": {
    label: "1.56 (일반)",
    price: 40000,
    description: "저도수용 기본 렌즈. 도수가 낮으면 굳이 비싼 렌즈가 필요 없습니다.",
    maxPower: 2,
  },
  "1.60": {
    label: "1.60 (얇은)",
    price: 70000,
    description: "가장 많이 쓰는 표준. 중간 도수까지 두께가 무난합니다.",
    maxPower: 4,
  },
  "1.67": {
    label: "1.67 (아주 얇은)",
    price: 120000,
    description: "고도수용. 렌즈 가장자리 두께가 눈에 띄게 줄어듭니다.",
    maxPower: 6,
  },
  "1.74": {
    label: "1.74 (초박형)",
    price: 190000,
    description: "초고도수용. 가장 얇지만 가격이 높고 아주 약간 어른거림이 있을 수 있습니다.",
    maxPower: 99,
  },
};

export const LENS_INDEX_IDS = Object.keys(LENS_INDEXES) as LensIndexId[];

/** 코팅 및 기능 옵션. */
export const LENS_OPTIONS: Record<
  LensOptionId,
  { label: string; price: number; description: string }
> = {
  "hard-multi": {
    label: "하드 멀티코팅",
    price: 0,
    description: "반사 방지 + 스크래치 방지. 사실상 기본이라 무상 포함입니다.",
  },
  uv400: {
    label: "UV400 자외선 차단",
    price: 10000,
    description: "자외선을 차단해 눈과 눈가 피부를 보호합니다.",
  },
  "blue-cut": {
    label: "블루라이트 차단",
    price: 30000,
    description: "모니터·스마트폰을 오래 보는 경우. 약간 노란기가 돌 수 있습니다.",
  },
  photochromic: {
    label: "변색(조광) 렌즈",
    price: 80000,
    description: "실외에서 어두워집니다. 야외 활동이 많다면 선글라스를 따로 안 들고 다녀도 됩니다.",
  },
  "anti-fog": {
    label: "김서림 방지",
    price: 25000,
    description: "마스크 착용이 잦거나 실내외 온도차가 큰 환경에 유용합니다.",
  },
  progressive: {
    label: "누진다초점",
    price: 250000,
    description: "먼 곳과 가까운 곳을 한 렌즈로 봅니다. 가입도(ADD)가 있는 노안 처방에 필요합니다.",
  },
};

export const LENS_OPTION_IDS = Object.keys(LENS_OPTIONS) as LensOptionId[];

/**
 * 처방 도수에서 "실효 도수"를 뽑는다.
 * 난시(CYL)는 절반 정도를 구면 도수에 더해 두께에 영향을 준다고 본다.
 */
export function effectivePower(rx: Prescription | null): number {
  if (!rx) return 0;
  const eyes = [rx.right, rx.left];
  return Math.max(
    ...eyes.map((e) => Math.abs(e.sph ?? 0) + Math.abs(e.cyl ?? 0) / 2),
    0
  );
}

export type LensRecommendation = {
  index: LensIndexId;
  /** 함께 권하는 옵션 */
  options: LensOptionId[];
  reasons: string[];
  /** 처방전 기준 주의사항 */
  cautions: string[];
  /** 고도수라 테 선택에 제약이 생기는지 */
  needsSmallFrame: boolean;
};

/**
 * 처방 도수와 생활 환경으로 렌즈 사양을 추천한다.
 * 최종 결정은 매장 안경사의 검안 결과를 따른다.
 */
export function recommendLens(params: {
  prescription: Prescription | null;
  screenHours: number;
  outdoorHeavy: boolean;
}): LensRecommendation {
  const { prescription, screenHours, outdoorHeavy } = params;
  const power = effectivePower(prescription);
  const reasons: string[] = [];
  const cautions: string[] = [];
  const options: LensOptionId[] = ["hard-multi", "uv400"];

  let index: LensIndexId = "1.56";
  if (power > 6) index = "1.74";
  else if (power > 4) index = "1.67";
  else if (power > 2) index = "1.60";

  if (prescription) {
    reasons.push(
      `양안 중 높은 실효 도수가 약 ${power.toFixed(2)}D라서 ${LENS_INDEXES[index].label} 렌즈를 권합니다.`
    );
  } else {
    reasons.push("도수를 아직 입력하지 않아 기본값(1.56)으로 잡아두었습니다.");
  }

  if (prescription?.add != null && prescription.add > 0) {
    options.push("progressive");
    reasons.push(`가입도(ADD +${prescription.add.toFixed(2)})가 있어 누진다초점 대상입니다.`);
    cautions.push(
      `누진렌즈는 렌즈 세로폭이 ${PROGRESSIVE_MIN_LENS_HEIGHT}mm 이상인 테라야 근용부가 들어갑니다.`
    );
  }

  if (screenHours >= 6) {
    options.push("blue-cut");
    reasons.push(`화면을 하루 ${screenHours}시간 본다고 하셔서 블루라이트 차단을 넣었습니다.`);
  }

  if (outdoorHeavy) {
    options.push("photochromic");
    reasons.push("야외 활동이 많아 변색 렌즈를 넣었습니다.");
  }

  const cylMax = Math.max(
    Math.abs(prescription?.right.cyl ?? 0),
    Math.abs(prescription?.left.cyl ?? 0)
  );
  if (cylMax >= 2) {
    cautions.push(
      `난시가 ${cylMax.toFixed(2)}D로 높습니다. 축(AXIS)이 조금만 틀어져도 어지러우니 매장에서 축 정렬을 꼭 확인하세요.`
    );
  }

  const sphR = prescription?.right.sph ?? 0;
  const sphL = prescription?.left.sph ?? 0;
  if (prescription && Math.abs(sphR - sphL) >= 2) {
    cautions.push(
      "양쪽 도수 차이(부동시)가 2D 이상입니다. 좌우 렌즈 두께와 상이 다르게 느껴질 수 있어 안경사와 상담이 필요합니다."
    );
  }

  if (prescription?.pd == null) {
    cautions.push("PD(동공 간 거리)가 없습니다. 광학 중심을 맞추려면 매장에서 반드시 측정해야 합니다.");
  }

  if (prescription?.measuredAt) {
    const days = (Date.now() - new Date(prescription.measuredAt).getTime()) / 86400000;
    if (days > 365) {
      cautions.push("처방전이 1년 이상 지났습니다. 도수가 바뀌었을 수 있으니 재검사를 권합니다.");
    }
  }

  return {
    index,
    options: Array.from(new Set(options)),
    reasons,
    cautions,
    needsSmallFrame: power > 4,
  };
}

/** 굴절률 + 옵션의 정가 합계. */
export function lensListPrice(index: LensIndexId, options: LensOptionId[]): number {
  return (
    LENS_INDEXES[index].price +
    options.reduce((sum, o) => sum + (LENS_OPTIONS[o]?.price ?? 0), 0)
  );
}

/** 누진렌즈 근용부가 들어가려면 필요한 최소 렌즈 세로폭(mm). */
export const PROGRESSIVE_MIN_LENS_HEIGHT = 34;

/** 누진렌즈를 쓸 수 있는 테인지(렌즈 세로폭 기준). */
export function supportsProgressive(frame: Frame): boolean {
  return frame.lensHeight >= PROGRESSIVE_MIN_LENS_HEIGHT;
}
