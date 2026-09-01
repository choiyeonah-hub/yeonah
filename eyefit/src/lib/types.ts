// 렌즈 값 투명화 도구에서 공유하는 타입 정의.

/** 테 모양. 두께 계산에는 안 쓰이고, 테 그림과 목록 표시에만 쓴다. */
export type FrameShapeId =
  | "round"
  | "boston"
  | "oval"
  | "square"
  | "wellington"
  | "rectangle"
  | "cat-eye"
  | "browline"
  | "octagon"
  | "aviator";

/**
 * 테 마감. 두께 계산의 판정 기준이 달라진다.
 * 풀테는 두꺼운 가장자리를 테가 가려주지만, 하금테와 무테는 그대로 드러난다.
 */
export type FrameRimId = "full" | "half" | "rimless";

/** 한쪽 눈의 도수. */
export type EyeRx = {
  /** 구면(근시 -, 원시 +) */
  sph: number | null;
  /** 원주(난시) */
  cyl: number | null;
  /** 난시 축 0~180 */
  axis: number | null;
};

/** 처방 정보(민감정보). 이 앱은 저장하지 않는다. */
export type Prescription = {
  /** 오른쪽 눈 (OD / R) */
  right: EyeRx;
  /** 왼쪽 눈 (OS / L) */
  left: EyeRx;
  /** 가입도(노안). 있으면 누진 대상. */
  add: number | null;
  /** 동공 간 거리(mm). 편심량 계산에 필요하다. */
  pd: number | null;
  /** 검사일(YYYY-MM-DD) */
  measuredAt: string | null;
  source: "ocr" | "manual";
  /** OCR이 자신 없어 사용자 확인이 필요한 항목들. */
  warnings: string[];
};

export type LensIndexId = "1.56" | "1.60" | "1.67" | "1.74";

export type LensOptionId =
  | "hard-multi"
  | "blue-cut"
  | "photochromic"
  | "anti-fog"
  | "uv400"
  | "progressive";

/** 기성 테. 사용자가 각인 숫자를 모를 때 골라 쓰는 참고용 목록이다. */
export type Frame = {
  id: string;
  name: string;
  brand: string;
  shape: FrameShapeId;
  rim: FrameRimId;
  material: "아세테이트" | "메탈" | "TR-90" | "티타늄" | "콤비";
  /** 렌즈 한 알의 가로폭(mm) */
  lensWidth: number;
  /** 브릿지 폭(mm) */
  bridge: number;
  /** 렌즈 세로폭(mm) */
  lensHeight: number;
  /** 템플(다리) 길이(mm) */
  temple: number;
  /** 테 전체 가로폭(mm) */
  totalWidth: number;
  weightGram: number;
  asianFit: boolean;
  adjustableNosePad: boolean;
  colors: string[];
  price: number;
  tags: string[];
};
