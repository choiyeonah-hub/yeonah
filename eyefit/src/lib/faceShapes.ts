import type { FaceShapeId, FrameShapeId } from "./types";

/**
 * 얼굴형별 정보와 궁합 테 모양.
 *
 * 기준은 "예쁜 얼굴"이 아니라 대비(contrast) 원칙이다.
 * 둥근 얼굴엔 각진 테로 윤곽을 잡고, 각진 얼굴엔 곡선 테로 부드럽게 하고,
 * 긴 얼굴엔 세로폭이 있는 테로 얼굴을 나눠준다.
 */
export const FACE_SHAPES: Record<
  FaceShapeId,
  {
    label: string;
    description: string;
    /** 잘 어울리는 테 모양 (앞에 있을수록 강한 추천) */
    best: FrameShapeId[];
    /** 피하는 게 나은 테 모양 */
    avoid: FrameShapeId[];
    principle: string;
  }
> = {
  oval: {
    label: "계란형",
    description: "이마와 턱의 폭 차이가 크지 않고 세로가 살짝 긴, 균형 잡힌 윤곽",
    best: ["wellington", "boston", "square", "round", "cat-eye"],
    avoid: [],
    principle: "비율이 균형 잡혀 있어 대부분의 테가 무난합니다. 취향과 사이즈를 우선으로 고르세요.",
  },
  round: {
    label: "둥근형",
    description: "가로세로 길이가 비슷하고 턱선이 완만한 윤곽",
    best: ["square", "rectangle", "wellington", "browline", "octagon"],
    avoid: ["round", "oval"],
    principle: "각진 테의 직선이 얼굴에 세로 방향의 선을 만들어 윤곽을 또렷하게 잡아줍니다.",
  },
  square: {
    label: "각진형",
    description: "이마·광대·턱 폭이 비슷하고 턱선 각이 뚜렷한 윤곽",
    best: ["round", "boston", "oval", "aviator", "cat-eye"],
    avoid: ["square", "rectangle"],
    principle: "곡선 테가 턱선의 각을 상쇄해 인상을 부드럽게 만듭니다.",
  },
  heart: {
    label: "하트형",
    description: "이마가 넓고 턱으로 갈수록 좁아지는 윤곽",
    best: ["boston", "round", "oval", "aviator"],
    avoid: ["browline", "cat-eye"],
    principle: "아래쪽에 볼륨이 있는 테가 좁은 하관을 채워 위아래 균형을 맞춰줍니다. 상단이 강조된 테는 넓은 이마를 더 넓어 보이게 합니다.",
  },
  oblong: {
    label: "긴형",
    description: "가로폭에 비해 세로가 길고 이마가 넓은 윤곽",
    best: ["wellington", "boston", "square", "browline"],
    avoid: ["oval", "aviator"],
    principle: "세로폭이 넉넉한 테가 얼굴을 가로로 나눠 길이를 짧아 보이게 합니다.",
  },
  diamond: {
    label: "다이아몬드형",
    description: "광대가 가장 넓고 이마와 턱이 좁은 윤곽",
    best: ["oval", "cat-eye", "browline", "round"],
    avoid: ["rectangle"],
    principle: "위쪽 라인이 살아 있는 테가 좁은 이마를 보완하고, 곡선이 광대를 부드럽게 감쌉니다.",
  },
  triangle: {
    label: "삼각형",
    description: "이마가 좁고 턱으로 갈수록 넓어지는 윤곽",
    best: ["browline", "cat-eye", "aviator", "wellington"],
    avoid: ["round"],
    principle: "상단이 두껍거나 강조된 테가 시선을 위로 올려 좁은 이마와 넓은 하관의 균형을 맞춰줍니다.",
  },
  rectangle: {
    label: "긴 각진형",
    description: "세로가 길면서 턱선의 각도 뚜렷한 윤곽",
    best: ["boston", "round", "oval", "wellington"],
    avoid: ["rectangle", "aviator"],
    principle: "세로폭이 있으면서 곡선인 테가 길이와 각을 동시에 잡아줍니다.",
  },
};

export const FACE_SHAPE_IDS = Object.keys(FACE_SHAPES) as FaceShapeId[];

export const FRAME_SHAPE_LABEL: Record<FrameShapeId, string> = {
  round: "라운드",
  boston: "보스턴",
  oval: "오벌",
  square: "스퀘어",
  wellington: "웰링턴",
  rectangle: "직사각",
  "cat-eye": "캣아이",
  browline: "브로우라인",
  octagon: "옥타곤",
  aviator: "보잉",
};
