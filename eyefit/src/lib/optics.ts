import type { LensIndexId } from "./types";

/**
 * 렌즈 두께 계산.
 *
 * 이 파일이 이 앱의 심장이다. "1.74가 정말 필요한가"에 답하려면
 * 굴절률을 바꿨을 때 두께가 실제로 몇 mm 줄어드는지를 숫자로 내야 한다.
 * 여기 쓰인 건 안경광학의 기본 공식이고, 계산 과정을 전부 화면에 공개한다.
 */

/** 굴절률별 밀도(g/cm³). 굴절률이 높다고 반드시 가벼운 게 아니다. */
export const LENS_DENSITY: Record<LensIndexId, number> = {
  "1.56": 1.28,
  "1.60": 1.3,
  "1.67": 1.36,
  "1.74": 1.47,
};

/** 마이너스(근시) 렌즈의 중심 두께(mm). 얇게 깎아도 깨지지 않을 최소치. */
export const MINUS_CENTER_THICKNESS = 1.2;
/** 플러스(원시) 렌즈의 가장자리 두께(mm). */
export const PLUS_EDGE_THICKNESS = 1.0;

/**
 * 곡률 반지름 r인 면에서, 중심으로부터 h만큼 떨어진 지점의 처짐(새그, mm).
 *
 *   s = r - √(r² - h²)
 *
 * h²/2r 근사식이 흔히 쓰이지만, 도수가 높고 렌즈가 크면 오차가 커진다.
 * 여기서는 근사 없이 그대로 계산한다.
 */
export function sagitta(radiusMm: number, halfDiameterMm: number): number {
  if (radiusMm <= 0) return 0;
  // 반지름보다 먼 지점은 물리적으로 존재하지 않는다(면이 반구를 넘어감).
  if (halfDiameterMm >= radiusMm) return radiusMm;
  return radiusMm - Math.sqrt(radiusMm * radiusMm - halfDiameterMm * halfDiameterMm);
}

/**
 * 도수 F(디옵터)를 한 면에 몰아넣었을 때의 곡률 반지름(mm).
 *
 *   F = (n - 1) / r   (r은 m 단위)  →  r[mm] = (n - 1) × 1000 / |F|
 *
 * 실제 렌즈는 앞뒤 두 면으로 도수를 나누지만, 중심-가장자리 두께 차이는
 * 두 면의 새그 차이로 정해지므로 합성 도수 하나로 계산해도 값이 같다.
 */
export function radiusForPower(powerD: number, index: number): number {
  const p = Math.abs(powerD);
  if (p < 0.01) return Infinity;
  return ((index - 1) * 1000) / p;
}

/**
 * 실제 렌즈는 사각형이 아니라 모서리가 둥글게 깎여 나간다.
 * 그래서 광학중심에서 가장 먼 지점은 렌즈폭×세로폭 사각형의 꼭짓점보다
 * 8% 정도 가깝다. 이 보정을 안 하면 두께를 실제보다 크게 계산하게 된다.
 */
export const LENS_SHAPE_FACTOR = 0.92;

/**
 * 광학 중심에서 렌즈 가장자리까지의 최대 거리(mm).
 *
 * 안경테의 광학중심 간격(렌즈폭 + 브릿지)이 착용자의 PD보다 크면, 렌즈를
 * 코 쪽으로 편심시켜 깎는다. 그만큼 바깥쪽(귀 쪽) 가장자리가 중심에서
 * 멀어지고, 렌즈에서 가장 두꺼운 지점이 된다.
 *
 * 가장 먼 지점은 바깥쪽 위/아래 모서리이므로 대각선으로 잡는다.
 */
export function maxRadiusFromCenter(params: {
  lensWidth: number;
  lensHeight: number;
  bridge: number;
  pd: number | null;
}): { halfDiameter: number; decentration: number } {
  const { lensWidth, lensHeight, bridge, pd } = params;
  const framePd = lensWidth + bridge;
  // PD를 모르면 편심 0으로 두고(가장 유리한 경우) 계산한다.
  const decentration = pd != null ? Math.max(0, (framePd - pd) / 2) : 0;
  // 편심은 렌즈 모양과 무관한 실제 이동이므로 보정 계수를 곱하지 않는다.
  const halfDiameter = Math.hypot(
    (lensWidth / 2) * LENS_SHAPE_FACTOR + decentration,
    (lensHeight / 2) * LENS_SHAPE_FACTOR
  );
  return { halfDiameter, decentration };
}

export type LensThickness = {
  index: LensIndexId;
  /** 계산에 쓴 도수(가장 두꺼워지는 경선) */
  powerD: number;
  /** 중심에서 가장자리까지 두께 차이(mm) */
  thicknessDelta: number;
  /** 가장자리 두께(mm) */
  edgeThickness: number;
  /** 중심 두께(mm) */
  centerThickness: number;
  /** 한 알 무게 추정(g) */
  weightGram: number;
};

/**
 * 굴절률 하나에 대해 렌즈 두께와 무게를 계산한다.
 *
 * 근시(마이너스)는 중심 두께를 고정하고 가장자리가 두꺼워지며,
 * 원시(플러스)는 반대로 가장자리를 고정하고 중심이 두꺼워진다.
 */
export function computeThickness(params: {
  index: LensIndexId;
  powerD: number;
  halfDiameter: number;
  lensWidth: number;
  lensHeight: number;
}): LensThickness {
  const { index, powerD, halfDiameter, lensWidth, lensHeight } = params;
  const n = Number(index);

  const radius = radiusForPower(powerD, n);
  const thicknessDelta = Number.isFinite(radius) ? sagitta(radius, halfDiameter) : 0;

  const isMinus = powerD < 0;
  const centerThickness = isMinus ? MINUS_CENTER_THICKNESS : PLUS_EDGE_THICKNESS + thicknessDelta;
  const edgeThickness = isMinus ? MINUS_CENTER_THICKNESS + thicknessDelta : PLUS_EDGE_THICKNESS;

  // 무게: 렌즈 면적 × 평균 두께 × 밀도.
  // 두께는 중심에서 거리의 제곱으로 늘어나므로 평균 두께 = 얇은 쪽 + 차이/2.
  // 면적은 테 모양에 맞춰 깎이므로 렌즈폭×세로폭의 약 85%로 본다.
  const areaMm2 = lensWidth * lensHeight * 0.85;
  const meanThickness = Math.min(centerThickness, edgeThickness) + thicknessDelta / 2;
  const volumeCm3 = (areaMm2 * meanThickness) / 1000;
  const weightGram = volumeCm3 * LENS_DENSITY[index];

  return {
    index,
    powerD,
    thicknessDelta: round2(thicknessDelta),
    edgeThickness: round2(edgeThickness),
    centerThickness: round2(centerThickness),
    weightGram: round1(weightGram),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 한쪽 눈의 도수에서 "가장 두꺼워지는 경선"의 도수를 뽑는다.
 *
 * 난시가 있으면 두 경선의 도수가 다르다. 렌즈 두께는 절댓값이 큰 쪽이
 * 결정하므로 SPH와 SPH+CYL 중 절댓값이 큰 값을 쓴다.
 */
export function thickestMeridian(sph: number | null, cyl: number | null): number {
  const s = sph ?? 0;
  const c = cyl ?? 0;
  const other = s + c;
  return Math.abs(other) > Math.abs(s) ? other : s;
}
