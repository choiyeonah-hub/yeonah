// 안경 추천 앱에서 공유하는 타입 정의.

/** 사진 위 좌표. 좌우는 "사진에서 보이는" 기준이 아니라 착용자 기준(right=오른쪽 눈). */
export type Point = { x: number; y: number };

/** 가상 착용에 필요한 최소 좌표. 모두 이미지 폭/높이로 나눈 0~1 값. */
export type FaceLandmarks = {
  rightPupil: Point;
  leftPupil: Point;
  /** 코가 눈 사이에서 시작하는 지점(안경이 얹히는 높이) */
  noseBridge: Point;
  /** 관자놀이 바깥쪽 좌우 끝 */
  faceLeft: Point;
  faceRight: Point;
  /** 홍채 가로 지름(이미지 폭 대비 비율). mm 환산의 기준자. */
  irisWidthRatio: number;
};

/** 홍채 지름을 기준자로 환산한 정면 실측 추정치(mm). */
export type FaceMeasurements = {
  /** 동공 간 거리 */
  pdMm: number;
  /** 관자놀이 사이 얼굴 폭 */
  faceWidthMm: number;
  /** 환산에 쓴 홍채 지름(mm) */
  irisMm: number;
};

/** 옆모습 사진에서 잰 코 관련 수치. 맞춤 코받침 설계에 쓴다. */
export type ProfileMeasurements = {
  /** 눈 사이 콧대 시작점이 얼마나 솟아 있는지(mm). 낮을수록 안경이 흘러내린다. */
  bridgeHeightMm: number;
  /** 콧대 경사각(도). 코받침을 눕힐 각도. */
  bridgeAngleDeg: number;
  /** 눈높이 대비 귀 시작점의 높이차(mm). 양수면 귀가 더 높다. 템플 각도에 쓴다. */
  earToEyeOffsetMm: number;
  confidence: number;
};

/** 얼굴형 8종. 추천 로직의 1차 축. */
export type FaceShapeId =
  | "oval"
  | "round"
  | "square"
  | "heart"
  | "oblong"
  | "diamond"
  | "triangle"
  | "rectangle";

/** 테 모양. 추천 로직의 2차 축. */
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

/** 테 마감. 두께감/무게/도수 커버 능력이 달라진다. */
export type FrameRimId = "full" | "half" | "rimless";

/**
 * 얼굴 분석 결과.
 *
 * "미의 기준"이 아니라 측정 가능한 기하학적 비율만 담는다.
 * 성별을 전제로 한 표준 두상 대신, 실제로 찍힌 얼굴의 비율을 쓴다.
 */
export type FaceAnalysis = {
  faceShape: FaceShapeId;
  /** 얼굴 가로/세로 비율. 1에 가까울수록 둥글고 짧은 얼굴. */
  widthToHeight: number;
  /** 광대 너비 대비 턱 너비(0~1). 낮을수록 하관이 좁다(하트/역삼각). */
  jawToCheek: number;
  /** 광대 너비 대비 이마 너비(0~1). */
  foreheadToCheek: number;
  /** 콧대 높이. 낮으면 아시안핏(코받침 높은 테)이 필요하다. */
  noseBridge: "low" | "medium" | "high";
  /** 눈 사이 간격 인상. 렌즈폭·브릿지 선택에 쓴다. */
  eyeSpacing: "narrow" | "average" | "wide";
  /** 얼굴 전체 폭 인상. 테 전체폭(프론트 사이즈) 매칭에 쓴다. */
  faceWidth: "narrow" | "average" | "wide";
  /** 눈썹 라인. 브로우라인 테와의 궁합. */
  browLine: "straight" | "arched" | "angular" | "soft";
  /**
   * 사진 위 좌표(0~1로 정규화). 가상 착용에서 테를 올릴 위치를 잡는 데 쓴다.
   * 얼굴을 못 찾으면 null.
   */
  landmarks: FaceLandmarks | null;
  /**
   * 홍채 지름을 자로 삼아 환산한 실측 추정치(mm).
   * 사람의 각막(홍채) 가로 지름은 개인차가 작아(약 11.7mm) 사진 속 길이를
   * mm로 바꾸는 기준자로 쓸 수 있다. 참고값이며 매장 실측을 대체하지 않는다.
   */
  measured: FaceMeasurements | null;
  /** 옆모습 사진에서 잰 코 관련 수치. 안 찍었으면 null. */
  profile: ProfileMeasurements | null;
  /** 사람이 읽는 한 문단 요약. */
  summary: string;
  /** 0~1. 사진 품질이 나쁘면 낮게 나온다. */
  confidence: number;
  /** 분석 방식. manual이면 사용자가 얼굴형을 직접 고른 것. */
  source: "ai" | "manual";
};

/** 한쪽 눈의 도수. */
export type EyeRx = {
  /** 구면(근시 -, 원시 +) */
  sph: number | null;
  /** 원주(난시) */
  cyl: number | null;
  /** 난시 축 0~180 */
  axis: number | null;
};

/** 처방 정보(민감정보). */
export type Prescription = {
  /** 오른쪽 눈 (OD / R) */
  right: EyeRx;
  /** 왼쪽 눈 (OS / L) */
  left: EyeRx;
  /** 가입도(노안). 있으면 누진/중근용 대상. */
  add: number | null;
  /** 동공 간 거리(mm). 광학 중심 정렬에 쓴다. */
  pd: number | null;
  /** 검사일(YYYY-MM-DD). 처방전이 오래되면 재검을 안내한다. */
  measuredAt: string | null;
  source: "ocr" | "manual";
  /** OCR이 자신 없어 사용자 확인이 필요한 항목들. */
  warnings: string[];
};

export type LensOptionId =
  | "hard-multi"
  | "blue-cut"
  | "photochromic"
  | "anti-fog"
  | "uv400"
  | "progressive";

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
  /** 렌즈 세로폭(mm). 누진렌즈는 34mm 이상 필요. */
  lensHeight: number;
  /** 템플(다리) 길이(mm) */
  temple: number;
  /** 테 전체 가로폭(mm) */
  totalWidth: number;
  weightGram: number;
  /** 코받침이 높게 설계된 아시안핏 여부 */
  asianFit: boolean;
  /** 코패드를 구부려 조절할 수 있는지 */
  adjustableNosePad: boolean;
  colors: string[];
  price: number;
  tags: string[];
};

export type LensIndexId = "1.56" | "1.60" | "1.67" | "1.74";

export type Store = {
  id: string;
  name: string;
  kind: "체인" | "동네";
  region: string;
  district: string;
  address: string;
  /** 테 정가 대비 할인율 (0.15 = 15% 할인) */
  frameDiscount: number;
  /** 렌즈 정가 대비 할인율 */
  lensDiscount: number;
  rating: number;
  reviewCount: number;
  /** 무료 정밀검안 제공 여부 */
  freeExam: boolean;
  /** 완성까지 걸리는 시간 */
  turnaround: string;
  services: string[];
};

/** 테 하나에 대한 적합도 계산 결과. */
export type FitScore = {
  frameId: string;
  /** 0~100 */
  score: number;
  /** 잘 맞는 이유들 */
  pros: string[];
  /** 감점 사유들 */
  cons: string[];
};

/** 매장별 견적 한 줄. */
export type Quote = {
  storeId: string;
  framePrice: number;
  lensPrice: number;
  totalPrice: number;
  /** 정가 합계 대비 절약액 */
  saved: number;
};

/**
 * 맞춤 제작 테의 설계 치수.
 * 기성품 카탈로그에서 고르는 대신, 얼굴 계측값에서 치수를 직접 뽑아 공장에 넘긴다.
 */
export type CustomSpec = {
  shape: FrameShapeId;
  rim: FrameRimId;
  /** 렌즈 한 알 가로폭(mm) */
  lensWidth: number;
  /** 브릿지 폭(mm) */
  bridge: number;
  /** 렌즈 세로폭(mm) */
  lensHeight: number;
  /** 템플(다리) 길이(mm) */
  temple: number;
  /** 테 전체 가로폭(mm) */
  totalWidth: number;
  /** 코받침 높이(mm). 콧대가 낮을수록 높게 잡는다. */
  nosePadHeight: number;
  /** 코받침을 눕히는 각도(도). 옆모습을 안 찍었으면 null. */
  nosePadAngleDeg: number | null;
  /** 템플을 귀 쪽으로 꺾어 내리는 양(mm). 옆모습을 안 찍었으면 null. */
  templeDropMm: number | null;
  material: string;
  color: string;
  /**
   * 한쪽 눈당 광학 중심 편심량(mm).
   * (렌즈폭 + 브릿지 - PD) / 2. 작을수록 렌즈가 얇고 프리즘 오차가 적다.
   */
  decentrationPerEye: number | null;
  /** 각 치수를 왜 그렇게 잡았는지 */
  rationale: string[];
};

/** 테를 어디서 구하는지. 판매 주체와 법적 책임이 달라진다. */
export type FrameMode = "stock" | "custom";

/** 마법사 전체가 들고 다니는 상태. 사진 원본은 여기에 담지 않는다. */
export type FitState = {
  face: FaceAnalysis | null;
  /**
   * 가상 착용에 쓰는 정면 사진(data URL).
   * 브라우저 메모리에만 두고, 분석 요청 이후로는 서버에 다시 보내지 않는다.
   */
  photoDataUrl: string | null;
  prescription: Prescription | null;
  /** 도수를 모른 채로 진행하는 경우(매장에서 검안) */
  skipPrescription: boolean;
  screenHours: number;
  outdoorHeavy: boolean;
  frameMode: FrameMode;
  frameId: string | null;
  factoryId: string | null;
  customSpec: CustomSpec | null;
  lensIndex: LensIndexId;
  lensOptions: LensOptionId[];
  region: string | null;
  storeKind: Store["kind"] | null;
  storeId: string | null;
};
