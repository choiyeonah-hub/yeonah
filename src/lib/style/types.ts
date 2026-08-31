// 스타일 진단 앱에서 서버/클라이언트가 함께 쓰는 타입 정의.

export type PaletteColor = {
  hex: string;
  name: string; // 한글 컬러명
  use: string; // 어디에 쓰면 좋은지 (상의 / 립 / 포인트 …)
};

export type SeasonId = "spring" | "summer" | "autumn" | "winter";

export type PersonalColorId =
  | "spring-light"
  | "spring-bright"
  | "spring-warm"
  | "summer-light"
  | "summer-mute"
  | "summer-cool"
  | "autumn-mute"
  | "autumn-deep"
  | "autumn-warm"
  | "winter-bright"
  | "winter-deep"
  | "winter-cool";

export type PersonalColorType = {
  id: PersonalColorId;
  season: SeasonId;
  seasonName: string;
  name: string; // 예: "봄 라이트"
  subtitle: string;
  keywords: string[];
  description: string;
  // 진단 축의 대표값 (-100 ~ 100 / 0 ~ 100)
  axes: { warmth: number; lightness: number; chroma: number; contrast: number };
  skinNote: string;
  hairNote: string;
  eyeNote: string;
  best: PaletteColor[];
  neutral: PaletteColor[];
  avoid: PaletteColor[];
  metal: PaletteColor[];
  denim: PaletteColor;
  lip: PaletteColor[];
  hairColor: PaletteColor[];
  styleMood: string; // 이 톤에 어울리는 소재/분위기
};

export type ToneAxes = {
  warmth: number; // -100(쿨) ~ +100(웜)
  lightness: number; // 0(어두움) ~ 100(밝음)
  chroma: number; // 0(탁함) ~ 100(선명)
  contrast: number; // 0(저대비) ~ 100(고대비)
};

export type MeasuredColors = {
  skin?: string;
  hair?: string;
  eye?: string;
  lip?: string;
};

export type ColorDiagnosis = {
  typeId: PersonalColorId;
  runnerUpId: PersonalColorId;
  axes: ToneAxes;
  confidence: number; // 0 ~ 100
  source: "photo" | "quiz";
  measured: MeasuredColors;
  reasons: string[];
  aiNote?: string;
};

export type Gender = "female" | "male" | "other";

export type FrameAnswers = {
  wrist: "thin" | "medium" | "thick"; // 손목 두께
  collarbone: "hidden" | "slight" | "prominent"; // 쇄골
  fleshiness: "upper" | "even" | "lower"; // 살이 붙는 위치
};

export type BodyInput = {
  gender: Gender;
  height: number; // cm
  weight?: number;
  headLength?: number; // 정수리 ~ 턱끝
  faceLength?: number; // 헤어라인 ~ 턱끝
  faceWidth?: number; // 광대 사이 폭
  shoulderWidth?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  legLength?: number; // 골반(다리 시작) ~ 바닥
  armLength?: number; // 어깨 끝 ~ 손목
  frame?: FrameAnswers;
};

export type RatioBand = "low" | "average" | "high";

export type RatioResult = {
  key: string;
  label: string;
  value: number; // 계산된 비율(혹은 등신 수)
  display: string; // 화면 표기
  unit: string;
  averageRange: [number, number]; // 한국 성인 평균대
  band: RatioBand;
  bandLabel: string;
  comment: string;
  estimated: boolean; // 사용자가 직접 재지 않고 추정한 값인지
};

export type BodyShapeId = "hourglass" | "rectangle" | "pear" | "inverted" | "round";
export type FrameId = "straight" | "wave" | "natural";

export type BodyDiagnosis = {
  source: "manual" | "photo";
  height: number;
  headUnits: number; // 몇 등신
  ratios: RatioResult[];
  shape: { id: BodyShapeId; name: string; description: string };
  frame: { id: FrameId; name: string; description: string };
  upperLower: [number, number]; // 상체 : 하체 (합 100)
  strengths: string[];
  balancePoints: string[];
  estimatedFields: string[];
};

export type SizingHint = {
  label: string;
  value: string;
  basis: string; // 어떤 계산에서 나온 수치인지
};

export type RecommendedItem = {
  slot: "top" | "bottom" | "outer" | "dress" | "shoes" | "bag";
  category: string; // 예: "하이웨이스트 와이드 슬랙스"
  /** 쇼핑몰 검색창에 그대로 넣을 짧은 명사. category는 설명문이라 검색어로는 못 쓴다. */
  searchTerm: string;
  why: string;
  spec: string[]; // 길이/폭/소재 등 구체 스펙
  colors: PaletteColor[];
};

export type OutfitLook = {
  title: string;
  scene: string; // 어떤 상황에 입는지
  items: { slot: string; name: string; color: PaletteColor }[];
  tip: string;
};

export type StyleRecommendation = {
  headline: string;
  keywords: string[];
  silhouetteRules: string[];
  avoidRules: string[];
  sizing: SizingHint[];
  clothes: RecommendedItem[];
  shoes: RecommendedItem[];
  bags: RecommendedItem[];
  looks: OutfitLook[];
  aiStylistNote?: string;
};

export type StyleProfileResult = {
  id?: string;
  createdAt?: string;
  color: ColorDiagnosis;
  colorType: PersonalColorType;
  body: BodyDiagnosis;
  recommendation: StyleRecommendation;
  aiUsed: boolean;
  notes: string[];
};
