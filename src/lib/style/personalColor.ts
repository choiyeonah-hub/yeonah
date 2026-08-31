import { colorCharacter, hexToLab, hexToLch, normalizeHex } from "./color";
import { PERSONAL_COLOR_LIST, PERSONAL_COLOR_TYPES } from "./palettes";
import type {
  ColorDiagnosis,
  MeasuredColors,
  PersonalColorId,
  PersonalColorType,
  ToneAxes,
} from "./types";

const DEFAULT_AXES: ToneAxes = { warmth: 0, lightness: 60, chroma: 50, contrast: 50 };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// ── 사진(또는 직접 입력한 색)에서 진단 좌표 계산 ────────────────────────────────

// 피부의 웜/쿨은 Lab의 b*(노랑) 대 a*(빨강) 비율로 본다.
// 사람 피부는 언제나 주황 계열이라 색상각만으로는 갈리지 않기 때문.
function skinWarmth(hex: string): number {
  const { a, b } = hexToLab(hex);
  if (a <= 0.5) return 0; // 피부 범위를 벗어난 값이면 판단 보류
  const ratio = b / a; // 웜 피부 ≈ 1.6~2.3, 쿨 피부 ≈ 0.9~1.4
  return clamp(Math.round(((ratio - 1.45) / 0.45) * 100), -100, 100);
}

function hairWarmth(hex: string): number {
  const { warmth, lightness } = colorCharacter(hex);
  // 아주 어두운 머리색은 웜/쿨 판단 신뢰도가 낮아 영향력을 줄인다.
  const weight = lightness < 20 ? 0.3 : 1;
  return Math.round(warmth * weight);
}

export function axesFromColors(measured: MeasuredColors): {
  axes: ToneAxes;
  reasons: string[];
} {
  const reasons: string[] = [];
  const skin = normalizeHex(measured.skin ?? "");
  const hair = normalizeHex(measured.hair ?? "");
  const eye = normalizeHex(measured.eye ?? "");
  const lip = normalizeHex(measured.lip ?? "");

  const warmthVotes: { value: number; weight: number }[] = [];
  if (skin) warmthVotes.push({ value: skinWarmth(skin), weight: 3 });
  if (hair) warmthVotes.push({ value: hairWarmth(hair), weight: 1.2 });
  if (lip) warmthVotes.push({ value: colorCharacter(lip).warmth, weight: 0.8 });

  const totalWeight = warmthVotes.reduce((sum, vote) => sum + vote.weight, 0) || 1;
  const warmth = Math.round(
    warmthVotes.reduce((sum, vote) => sum + vote.value * vote.weight, 0) / totalWeight,
  );

  const skinL = skin ? hexToLch(skin).L : 70;
  const hairL = hair ? hexToLch(hair).L : 30;
  const eyeL = eye ? hexToLch(eye).L : 30;

  // 명도: 피부 밝기가 기준이고, 머리·눈이 아주 어두우면 인상이 조금 내려간다.
  // 사람 피부의 L*은 대략 55~90에만 분포하므로, 그 구간을 0~100으로 펴서
  // 타입 좌표(딥 22 ~ 라이트 82)와 같은 축에서 비교할 수 있게 한다.
  const weightedL = skinL * 0.85 + ((hairL + eyeL) / 2) * 0.15;
  const lightness = clamp(Math.round(((weightedL - 55) / 35) * 100), 0, 100);

  // 대비: 피부와 머리(눈)의 밝기 차이.
  // 대부분의 한국인이 검은 모발이라 "차이 그 자체"로 재면 전원이 고대비로 나온다.
  // 그래서 실제 분포대(차이 35~75)를 0~100으로 펴서 상대 위치로 본다.
  const contrastRaw = Math.max(Math.abs(skinL - hairL), Math.abs(skinL - eyeL));
  const contrast = clamp(Math.round(((contrastRaw - 35) / 40) * 100), 0, 100);

  // 채도: 눈·입술·머리의 선명도. 맑고 또렷할수록 선명한 옷 색을 견딘다.
  // 모발·홍채는 절대 채도가 원래 낮은 범위(C 5~35)에 몰려 있어 1.5배로 편다.
  const chromaSources = [eye, lip, hair].filter(Boolean) as string[];
  const chromaAvg = chromaSources.length
    ? chromaSources.reduce((sum, hex) => sum + colorCharacter(hex).chroma, 0) / chromaSources.length
    : 45;
  const chroma = clamp(Math.round(Math.min(100, chromaAvg * 1.5) * 0.6 + contrast * 0.4), 0, 100);

  if (skin) {
    reasons.push(
      `피부 ${skin}의 Lab 노랑/빨강 비율로 본 웜·쿨 지수는 ${warmth > 0 ? "+" : ""}${warmth} (${
        warmth >= 25 ? "웜" : warmth <= -25 ? "쿨" : "뉴트럴에 가까움"
      })`,
    );
    reasons.push(
      `피부 명도 L* ${Math.round(skinL)}(사람 피부 분포 55~90 기준) → 밝기 축 ${lightness}점`,
    );
  }
  if (hair || eye) {
    reasons.push(
      `피부와 ${hair ? "머리" : "눈동자"} 밝기 차이 ${Math.round(contrastRaw)} → 대비 축 ${contrast}점 (${
        contrast >= 65 ? "고대비" : contrast >= 40 ? "중간 대비" : "저대비"
      })`,
    );
  }
  reasons.push(
    `눈·입술의 선명도로 본 채도 축 ${chroma}점 (${
      chroma >= 65 ? "선명한 색이 잘 받음" : chroma >= 40 ? "중채도" : "탁한 색이 편안함"
    })`,
  );

  return { axes: { warmth, lightness, chroma, contrast }, reasons };
}

// ── 문진(사진 없이) 기반 진단 ─────────────────────────────────────────────────

export type QuizOption = {
  value: string;
  label: string;
  axes: Partial<ToneAxes>;
};

export type QuizQuestion = {
  id: string;
  question: string;
  hint?: string;
  options: QuizOption[];
};

export const COLOR_QUIZ: QuizQuestion[] = [
  {
    id: "vein",
    question: "손목 안쪽 혈관이 무슨 색으로 보이나요?",
    hint: "자연광에서 보는 게 가장 정확합니다.",
    options: [
      { value: "green", label: "초록빛", axes: { warmth: 80 } },
      { value: "blue", label: "파랑·보라빛", axes: { warmth: -80 } },
      { value: "mixed", label: "둘 다 섞여 있음", axes: { warmth: 0 } },
    ],
  },
  {
    id: "sun",
    question: "햇빛에 오래 있으면 피부가 어떻게 되나요?",
    options: [
      { value: "tan", label: "갈색으로 잘 탄다", axes: { warmth: 60, lightness: 45 } },
      { value: "burn", label: "붉어지고 잘 안 탄다", axes: { warmth: -60, lightness: 70 } },
      { value: "both", label: "붉어졌다가 갈색으로 남는다", axes: { warmth: 10, lightness: 58 } },
    ],
  },
  {
    id: "metal",
    question: "골드와 실버 중 어느 액세서리가 더 잘 어울리나요?",
    options: [
      { value: "gold", label: "골드", axes: { warmth: 75 } },
      { value: "silver", label: "실버", axes: { warmth: -75 } },
      { value: "both", label: "둘 다 무난", axes: { warmth: 0 } },
    ],
  },
  {
    id: "white",
    question: "순백색 티셔츠와 아이보리 티셔츠, 어느 쪽이 나은가요?",
    options: [
      { value: "pure", label: "순백색이 얼굴이 밝아진다", axes: { warmth: -70, chroma: 65 } },
      { value: "ivory", label: "아이보리가 편안하다", axes: { warmth: 70, chroma: 40 } },
      { value: "same", label: "차이를 모르겠다", axes: { warmth: 0, chroma: 50 } },
    ],
  },
  {
    id: "black",
    question: "블랙 옷을 입으면 얼굴이 어때 보이나요?",
    options: [
      { value: "sharp", label: "이목구비가 또렷해진다", axes: { contrast: 90, chroma: 75, lightness: 45 } },
      { value: "heavy", label: "얼굴이 눌리고 무거워 보인다", axes: { contrast: 25, chroma: 35, lightness: 75 } },
      { value: "neutral", label: "그냥 무난하다", axes: { contrast: 55, chroma: 50, lightness: 60 } },
    ],
  },
  {
    id: "vivid",
    question: "쨍한 원색과 흐린 파스텔 중 어느 쪽이 더 잘 받나요?",
    options: [
      { value: "vivid", label: "쨍한 원색", axes: { chroma: 90, contrast: 75 } },
      { value: "muted", label: "흐릿한 톤다운 색", axes: { chroma: 18, contrast: 35 } },
      { value: "pastel", label: "밝은 파스텔", axes: { chroma: 40, contrast: 28, lightness: 78 } },
    ],
  },
  {
    id: "hair",
    question: "염색하지 않은 본래 머리색은?",
    options: [
      { value: "black", label: "검정에 가까움", axes: { contrast: 85, lightness: 45, warmth: -20 } },
      { value: "darkbrown", label: "짙은 갈색", axes: { contrast: 65, lightness: 52, warmth: 25 } },
      { value: "brown", label: "밝은 갈색·햇빛에 갈색으로 비침", axes: { contrast: 35, lightness: 72, warmth: 60 } },
    ],
  },
  {
    id: "eye",
    question: "눈동자 색과 흰자의 경계는 어떤가요?",
    options: [
      { value: "sharp", label: "검고 또렷하게 갈린다", axes: { contrast: 90, chroma: 80 } },
      { value: "soft", label: "부드럽게 번져 보인다", axes: { contrast: 30, chroma: 30 } },
      { value: "light", label: "밝은 갈색이라 연하다", axes: { contrast: 40, chroma: 55, lightness: 72 } },
    ],
  },
  {
    id: "blush",
    question: "평소 볼에 홍조가 있나요?",
    options: [
      { value: "yes", label: "자주 붉어진다", axes: { warmth: -40, lightness: 72 } },
      { value: "no", label: "거의 없다 · 노란기가 돈다", axes: { warmth: 55, lightness: 58 } },
      { value: "little", label: "약간 있다", axes: { warmth: 0, lightness: 64 } },
    ],
  },
  {
    id: "tone",
    question: "쿠션·파운데이션 호수는 보통 어느 쪽인가요?",
    options: [
      { value: "light", label: "밝은 편 (13·17·21호)", axes: { lightness: 80 } },
      { value: "medium", label: "중간 (21·23호)", axes: { lightness: 60 } },
      { value: "deep", label: "어두운 편 (23·25호 이상)", axes: { lightness: 35 } },
    ],
  },
];

export function axesFromQuiz(answers: Record<string, string>): {
  axes: ToneAxes;
  reasons: string[];
} {
  const buckets: Record<keyof ToneAxes, number[]> = {
    warmth: [],
    lightness: [],
    chroma: [],
    contrast: [],
  };
  const reasons: string[] = [];

  for (const question of COLOR_QUIZ) {
    const answer = answers[question.id];
    if (!answer) continue;
    const option = question.options.find((candidate) => candidate.value === answer);
    if (!option) continue;
    (Object.keys(option.axes) as (keyof ToneAxes)[]).forEach((key) => {
      const value = option.axes[key];
      if (typeof value === "number") buckets[key].push(value);
    });
    reasons.push(`${question.question} → ${option.label}`);
  }

  const average = (values: number[], fallback: number) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : fallback;

  return {
    axes: {
      warmth: average(buckets.warmth, DEFAULT_AXES.warmth),
      lightness: average(buckets.lightness, DEFAULT_AXES.lightness),
      chroma: average(buckets.chroma, DEFAULT_AXES.chroma),
      contrast: average(buckets.contrast, DEFAULT_AXES.contrast),
    },
    reasons,
  };
}

// ── 좌표 → 12타입 매칭 ────────────────────────────────────────────────────────

const AXIS_WEIGHT: Record<keyof ToneAxes, number> = {
  warmth: 1.5,
  lightness: 1.0,
  chroma: 0.95,
  contrast: 0.8,
};

function axisDistance(axes: ToneAxes, type: PersonalColorType): number {
  const diff = (key: keyof ToneAxes, span: number) =>
    ((axes[key] - type.axes[key]) / span) ** 2 * AXIS_WEIGHT[key];
  return Math.sqrt(
    diff("warmth", 200) + diff("lightness", 100) + diff("chroma", 100) + diff("contrast", 100),
  );
}

export function rankTypes(axes: ToneAxes): { type: PersonalColorType; distance: number }[] {
  return PERSONAL_COLOR_LIST.map((type) => ({ type, distance: axisDistance(axes, type) })).sort(
    (a, b) => a.distance - b.distance,
  );
}

export function diagnoseColor(input: {
  source: "photo" | "quiz";
  measured?: MeasuredColors;
  quizAnswers?: Record<string, string>;
  aiNote?: string;
  aiUndertoneHint?: "warm" | "cool" | "neutral";
}): ColorDiagnosis {
  const fromColors = input.measured?.skin ? axesFromColors(input.measured) : null;
  const fromQuiz = input.quizAnswers ? axesFromQuiz(input.quizAnswers) : null;

  let axes: ToneAxes;
  const reasons: string[] = [];

  if (fromColors && fromQuiz) {
    // 사진과 문진이 둘 다 있으면 사진 7 : 문진 3으로 섞는다.
    axes = {
      warmth: Math.round(fromColors.axes.warmth * 0.7 + fromQuiz.axes.warmth * 0.3),
      lightness: Math.round(fromColors.axes.lightness * 0.7 + fromQuiz.axes.lightness * 0.3),
      chroma: Math.round(fromColors.axes.chroma * 0.7 + fromQuiz.axes.chroma * 0.3),
      contrast: Math.round(fromColors.axes.contrast * 0.7 + fromQuiz.axes.contrast * 0.3),
    };
    reasons.push(...fromColors.reasons, ...fromQuiz.reasons.slice(0, 3));
  } else if (fromColors) {
    axes = fromColors.axes;
    reasons.push(...fromColors.reasons);
  } else if (fromQuiz) {
    axes = fromQuiz.axes;
    reasons.push(...fromQuiz.reasons);
  } else {
    axes = DEFAULT_AXES;
    reasons.push("입력이 부족해 기본 좌표로 진단했습니다.");
  }

  // AI가 사진에서 읽은 언더톤 힌트가 있으면 웜/쿨 축을 살짝 보정한다.
  if (input.aiUndertoneHint === "warm") axes.warmth = clamp(axes.warmth + 15, -100, 100);
  if (input.aiUndertoneHint === "cool") axes.warmth = clamp(axes.warmth - 15, -100, 100);

  const ranked = rankTypes(axes);
  const best = ranked[0];
  const runnerUp = ranked[1];

  const margin = runnerUp.distance - best.distance;
  const confidence = clamp(
    Math.round(100 - best.distance * 110 + Math.min(margin * 120, 18)),
    35,
    97,
  );

  return {
    typeId: best.type.id as PersonalColorId,
    runnerUpId: runnerUp.type.id as PersonalColorId,
    axes,
    confidence,
    source: input.source,
    measured: input.measured ?? {},
    reasons,
    aiNote: input.aiNote,
  };
}

export function getColorType(id: PersonalColorId): PersonalColorType {
  return PERSONAL_COLOR_TYPES[id];
}
