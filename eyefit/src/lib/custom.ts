import { FACE_SHAPES } from "./faceShapes";
import { findFactory, type Factory } from "./factories";
import type { CustomSpec, FaceAnalysis, Prescription } from "./types";

/** 테 전체폭에서 렌즈 바깥과 힌지 사이(엔드피스) 한쪽이 차지하는 길이(mm). */
const ENDPIECE = 9;

/** 얼굴 폭 인상 → 목표 테 전체폭(mm) */
const TARGET_WIDTH = { narrow: 130, average: 138, wide: 146 } as const;
/** 눈 간격 인상 → 기본 브릿지 폭(mm) */
const BASE_BRIDGE = { narrow: 16, average: 19, wide: 22 } as const;
/** 얼굴 폭 인상 → 템플(다리) 길이(mm) */
const TEMPLE = { narrow: 140, average: 145, wide: 150 } as const;
/** 콧대 높이 → 코받침 높이(mm). 낮을수록 높게 받쳐줘야 흘러내리지 않는다. */
const NOSE_PAD = { low: 12, medium: 9, high: 6 } as const;

function round(n: number): number {
  return Math.round(n);
}

/**
 * 얼굴 계측값과 도수에서 맞춤 테의 설계 치수를 뽑는다.
 *
 * 기성품은 "정해진 사이즈 중 가장 가까운 것"을 고르는 일이지만,
 * 맞춤 제작은 반대로 얼굴에서 치수를 만들어낸다. 그래서 기성품에서
 * 늘 아쉬웠던 두 가지(전체폭, 코받침 높이)를 먼저 확정하고
 * 나머지 치수를 거기에 맞춘다.
 */
export function deriveCustomSpec(params: {
  face: FaceAnalysis;
  prescription: Prescription | null;
  material: string;
  color: string;
}): CustomSpec {
  const { face, prescription, material, color } = params;
  const rationale: string[] = [];

  // 1) 전체폭: 얼굴 폭에 맞춘다. 여기서 어긋나면 흘러내리거나 관자놀이를 누른다.
  const totalWidth = TARGET_WIDTH[face.faceWidth];
  rationale.push(
    `얼굴 폭이 ${{ narrow: "좁은", average: "보통", wide: "넓은" }[face.faceWidth]} 편이라 테 전체폭을 ${totalWidth}mm로 잡았습니다.`
  );

  // 2) 브릿지: 눈 간격에서 출발하고, 콧대가 낮으면 코 옆면에 닿는 면적을 넓힌다.
  let bridge = BASE_BRIDGE[face.eyeSpacing];
  if (face.noseBridge === "low") {
    bridge += 1;
    rationale.push("콧대가 낮은 편이라 브릿지를 1mm 넓혀 코 옆면에 고르게 닿게 했습니다.");
  }

  // 3) 렌즈 가로폭: 전체폭에서 브릿지와 양쪽 엔드피스를 빼고 반으로 나눈다.
  const lensWidth = round((totalWidth - bridge - ENDPIECE * 2) / 2);

  // 4) 렌즈 세로폭: 얼굴형에 따라 다르고, 누진렌즈면 최소치가 있다.
  let lensHeight = 40;
  if (face.faceShape === "oblong" || face.faceShape === "rectangle") {
    lensHeight = 44;
    rationale.push("얼굴이 긴 편이라 렌즈 세로폭을 44mm로 키워 얼굴을 가로로 나눠줍니다.");
  } else if (face.faceShape === "round") {
    lensHeight = 37;
    rationale.push("둥근 얼굴이라 렌즈 세로폭을 37mm로 낮춰 가로선을 강조했습니다.");
  }
  const needsProgressive = prescription?.add != null && prescription.add > 0;
  if (needsProgressive && lensHeight < 36) {
    lensHeight = 36;
    rationale.push("누진렌즈 근용부가 들어가야 해서 렌즈 세로폭을 36mm 이상으로 올렸습니다.");
  }

  // 5) 코받침 높이: 기성품에서 가장 자주 어긋나는 치수다.
  const nosePadHeight = NOSE_PAD[face.noseBridge];
  if (face.noseBridge === "low") {
    rationale.push(
      `코받침을 ${nosePadHeight}mm로 높였습니다. 기성 테가 흘러내리고 볼에 닿는 건 대부분 이 치수가 낮아서입니다.`
    );
  }

  // 6) 템플 길이
  const temple = TEMPLE[face.faceWidth];

  // 7) 편심량: 렌즈 광학 중심과 눈동자가 얼마나 어긋나는지.
  const decentrationPerEye =
    prescription?.pd != null ? round(((lensWidth + bridge - prescription.pd) / 2) * 10) / 10 : null;
  if (decentrationPerEye != null) {
    if (Math.abs(decentrationPerEye) <= 2) {
      rationale.push(
        `PD ${prescription!.pd}mm 기준 편심이 한쪽당 ${Math.abs(decentrationPerEye)}mm로 작아 렌즈가 얇게 나옵니다.`
      );
    } else {
      rationale.push(
        `PD ${prescription!.pd}mm 기준 편심이 한쪽당 ${Math.abs(decentrationPerEye)}mm입니다. 얼굴 폭을 우선했기 때문이며, 렌즈 가공에서 보정합니다.`
      );
    }
  }

  const shapeInfo = FACE_SHAPES[face.faceShape];
  const shape = shapeInfo.best[0] ?? "wellington";
  rationale.push(`${shapeInfo.label} 얼굴 기준으로 모양은 ${shape}로 시작합니다. ${shapeInfo.principle}`);

  // 맞춤 제작은 1개씩 깎거나 출력하므로, 렌즈를 잡아주는 홈이 있는 풀테로 통일한다.
  // 무테는 렌즈에 직접 구멍을 뚫어 고정해서 파손 위험이 크고 재제작 비용도 크다.
  const rim = "full" as const;
  const power = Math.max(
    Math.abs(prescription?.right.sph ?? 0),
    Math.abs(prescription?.left.sph ?? 0)
  );
  if (power > 4) {
    rationale.push("도수가 높아 렌즈 가장자리 두께를 가릴 수 있게 테 두께를 확보했습니다.");
  }

  return {
    shape,
    rim,
    lensWidth,
    bridge,
    lensHeight,
    temple,
    totalWidth,
    nosePadHeight,
    material,
    color,
    decentrationPerEye,
    rationale,
  };
}

export type CustomQuote = {
  factoryId: string;
  /** 공장 제작 단가 */
  productionCost: number;
  /** 설계·검수·A/S에 대한 플랫폼 비용 */
  platformFee: number;
  /** 사용자가 내는 테 값 */
  framePrice: number;
  leadDays: number;
};

/** 100원 단위로 올림. */
function ceil100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

/**
 * 1개 맞춤 제작 테의 가격을 계산한다.
 *
 * 공장 단가에 플랫폼 몫(치수 설계, 도면 검수, 재제작 A/S)을 더한다.
 * 사용자에게 두 항목을 나눠 보여주기 위해 합계만 내지 않고 분리해서 돌려준다.
 */
export function customFrameQuote(params: {
  factory: Factory;
  spec: CustomSpec;
}): CustomQuote | null {
  const { factory, spec } = params;
  if (!factory.oneOffCapable || factory.oneOffUnitCost == null) return null;

  // 재질 선택지 중 뒤쪽일수록 고급 원단이라 가산이 붙는다.
  const materialIndex = Math.max(0, factory.materials.indexOf(spec.material));
  const productionCost = ceil100(factory.oneOffUnitCost + materialIndex * 8000);

  // 설계·검수·A/S 몫. 저가 공장이어도 이 작업량은 줄지 않아 하한을 둔다.
  const platformFee = Math.max(45000, ceil100(productionCost * 0.35));

  return {
    factoryId: factory.id,
    productionCost,
    platformFee,
    framePrice: productionCost + platformFee,
    leadDays: factory.leadDays,
  };
}

export function customFrameQuoteById(factoryId: string, spec: CustomSpec): CustomQuote | null {
  const factory = findFactory(factoryId);
  if (!factory) return null;
  return customFrameQuote({ factory, spec });
}
