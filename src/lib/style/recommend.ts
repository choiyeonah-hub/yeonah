import { hexToLch, mixHex, normalizeHex } from "./color";
import type {
  BodyDiagnosis,
  ColorDiagnosis,
  OutfitLook,
  PaletteColor,
  PersonalColorType,
  RecommendedItem,
  SizingHint,
  StyleRecommendation,
} from "./types";

const round = (value: number) => Math.round(value);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function byUse(colors: PaletteColor[], keyword: string): PaletteColor[] {
  return colors.filter((color) => color.use.includes(keyword));
}

function pick(colors: PaletteColor[], keyword: string, count: number): PaletteColor[] {
  const matched = byUse(colors, keyword);
  const rest = colors.filter((color) => !matched.includes(color));
  return [...matched, ...rest].slice(0, count);
}

function darkest(colors: PaletteColor[], count: number): PaletteColor[] {
  return [...colors].sort((a, b) => hexToLch(a.hex).L - hexToLch(b.hex).L).slice(0, count);
}

function lightest(colors: PaletteColor[], count: number): PaletteColor[] {
  return [...colors].sort((a, b) => hexToLch(b.hex).L - hexToLch(a.hex).L).slice(0, count);
}

function vivid(colors: PaletteColor[], count: number): PaletteColor[] {
  return [...colors].sort((a, b) => hexToLch(b.hex).C - hexToLch(a.hex).C).slice(0, count);
}

// 다리가 가장 길어 보이는 구두는 "본인 피부보다 살짝 어두운 누드"다.
// 측정된 피부색이 있으면 그 색에서 직접 계산하고, 없으면 팔레트의 중간 뉴트럴을 쓴다.
function nudeShoeColor(colorType: PersonalColorType, skinHex?: string): PaletteColor {
  const skin = normalizeHex(skinHex ?? "");
  if (skin) {
    const hex = mixHex(skin, "#3A2B24", 0.22);
    return { hex, name: "내 피부톤 누드", use: "다리 길어 보이는 구두" };
  }
  const fallback = colorType.neutral[2] ?? colorType.neutral[1];
  return { hex: fallback.hex, name: `${fallback.name} 누드`, use: "다리 길어 보이는 구두" };
}

export type SizingNumbers = {
  heelRange: [number, number];
  hemFromFloor: number;
  skirtAboveKnee: number;
  skirtMidi: number;
  skirtLong: number;
  /** 종아리가 가장 굵은 지점에서 끝나 다리가 짧아 보이는 총장 구간 (허리 기준) */
  skirtAvoidBand: [number, number];
  topCrop: number;
  topRegular: number;
  topLong: number;
  jacket: number;
  halfCoat: number;
  longCoat: number;
  bagWidth: [number, number];
  bagDrop: number;
  totalLookRule: string;
};

// 키와 비율에서 실제 cm 수치를 뽑아낸다. 모든 길이는 키에 대한 인체 계측 비율을 기준으로 계산.
export function sizingNumbers(body: BodyDiagnosis): SizingNumbers {
  const h = body.height;
  const legRatio = body.ratios.find((r) => r.key === "legRatio")?.value ?? 0.45;
  const legBand = body.ratios.find((r) => r.key === "legRatio")?.band ?? "average";
  const idealLeg = 0.47;

  // 부족한 다리 비율을 굽으로 보정하되, 굽으로 전부 메우려 하면 신을 수 없는 높이가 된다.
  // 차이의 60%만 굽으로 보정하고 최대 8cm로 제한한다.
  const heelBase = clamp(round((idealLeg - legRatio) * h * 0.6) + 2, 2, 7);
  const heelRange: [number, number] = [clamp(heelBase - 1, 1, 7), clamp(heelBase + 1, 3, 8)];

  const waistHeight = h * 0.62; // 바닥 → 허리
  const kneeHeight = h * 0.285; // 바닥 → 무릎
  // 종아리는 무릎 바로 아래(키의 20.5~25% 높이)가 가장 굵고, 그 아래로 다시 가늘어진다.
  // 미디 기장은 굵은 구간을 지나 가늘어지는 지점(17%)에서 끝나야 다리가 길어 보인다.
  const calfWidestLow = h * 0.205;
  const calfWidestHigh = h * 0.25;
  const calfSlimHeight = h * 0.17;
  const ankleHeight = h * 0.085;
  const hps = h * 0.855; // 바닥 → 목 옆 어깨점(총장 기준점)

  return {
    heelRange,
    hemFromFloor: legBand === "low" ? 0.5 : 1.5,
    skirtAboveKnee: round(waistHeight - kneeHeight - 4),
    skirtMidi: round(waistHeight - calfSlimHeight),
    skirtLong: round(waistHeight - ankleHeight),
    skirtAvoidBand: [round(waistHeight - calfWidestHigh), round(waistHeight - calfWidestLow)],
    topCrop: round(hps - waistHeight - 3),
    topRegular: round(hps - waistHeight + 8),
    topLong: round(hps - waistHeight + 20),
    jacket: round(h * 0.36),
    halfCoat: round(h * 0.56),
    longCoat: round(h * 0.68),
    bagWidth: [round(h * 0.155), round(h * 0.19)],
    bagDrop: round(h * (legBand === "low" ? 0.185 : 0.225)),
    totalLookRule:
      legBand === "low"
        ? "하의와 구두를 같은 톤으로 맞추면 다리 라인이 끊기지 않습니다(가장 효과 큰 규칙)."
        : "상·하의 색 대비를 자유롭게 줘도 비율이 무너지지 않습니다.",
  };
}

export function buildRecommendation(
  colorType: PersonalColorType,
  color: ColorDiagnosis,
  body: BodyDiagnosis,
): StyleRecommendation {
  const sizing = sizingNumbers(body);
  const legBand = body.ratios.find((r) => r.key === "legRatio")?.band ?? "average";
  const upperBand = body.ratios.find((r) => r.key === "upperLower")?.band ?? "average";
  const armBand = body.ratios.find((r) => r.key === "armRatio")?.band ?? "average";
  const faceBand = body.ratios.find((r) => r.key === "faceRatio")?.band ?? "average";
  const headBand = body.ratios.find((r) => r.key === "headUnits")?.band ?? "average";
  const shoulderBand = body.ratios.find((r) => r.key === "shoulderToHip")?.band ?? "average";
  const shape = body.shape.id;
  const frame = body.frame.id;

  const topColors = pick(colorType.best, "상의", 3);
  const pointColors = vivid(colorType.best, 3);
  const softColors = lightest(colorType.best, 3);
  const bottomColors = darkest(colorType.neutral, 2);
  const outerColors = [colorType.neutral[1], colorType.neutral[3], colorType.best[0]].filter(
    Boolean,
  ) as PaletteColor[];
  const nude = nudeShoeColor(colorType, color.measured.skin);

  // ── 실루엣 규칙 ──────────────────────────────────────────────────────────
  const silhouetteRules: string[] = [];
  silhouetteRules.push(
    legBand === "low"
      ? `허리선을 배꼽 위로 올리는 하이웨이스트가 기본값입니다. 상의는 총장 ${sizing.topCrop}cm 전후(허리선에서 끝나는 길이)로 맞추세요.`
      : `허리선 위치가 자유롭습니다. 상의 총장 ${sizing.topRegular}cm 전후의 레귤러 기장도 잘 맞습니다.`,
  );
  silhouetteRules.push(sizing.totalLookRule);
  if (upperBand === "high")
    silhouetteRules.push("상체 비중이 크므로 상의는 짧게, 하의는 길게 가는 조합이 안전합니다.");
  if (faceBand === "high")
    silhouetteRules.push("얼굴이 긴 편이라 라운드넥·보트넥처럼 가로로 열리는 넥라인이 얼굴을 짧아 보이게 합니다.");
  if (faceBand === "low")
    silhouetteRules.push("V넥·오픈 카라로 세로선을 만들면 목이 길어 보이고 답답함이 줄어듭니다.");
  if (headBand === "low")
    silhouetteRules.push("큰 카라·볼륨 모자·큰 후드는 머리를 더 커 보이게 하니 피하세요.");
  if (shoulderBand === "high")
    silhouetteRules.push("래글런·드롭숄더로 어깨 끝을 흐리면 상체가 가벼워집니다.");
  if (shoulderBand === "low")
    silhouetteRules.push("셋인 숄더 재킷·퍼프 소매로 어깨선을 세우면 전체 균형이 잡힙니다.");
  if (frame === "straight")
    silhouetteRules.push("몸에 붙지 않되 군더더기 없는 I라인, 매끈한 소재(코튼·울 개버딘)가 가장 깔끔합니다.");
  if (frame === "wave")
    silhouetteRules.push("허리선을 높이고 위쪽에 볼륨(퍼프·프릴·트위드)을 주면 상하 균형이 맞습니다.");
  if (frame === "natural")
    silhouetteRules.push("여유 있는 실루엣과 두께감 있는 소재(리넨·워싱·트위드)가 뼈대를 자연스럽게 감싸 줍니다.");
  if (armBand === "high")
    silhouetteRules.push(`팔이 긴 편이라 소매는 ${round(body.height * 0.3 + 2)}cm 이상, 셔츠는 수선을 전제로 고르세요.`);
  if (armBand === "low")
    silhouetteRules.push("7부·롤업 소매로 손목을 드러내면 팔이 길어 보이고 기성복 소매 남음도 정리됩니다.");
  silhouetteRules.push(
    `색은 ${colorType.name} 팔레트 안에서 고르되, 얼굴 근처(상의·스카프)에 베스트 컬러를 두는 것이 가장 효과가 큽니다.`,
  );

  // ── 피해야 할 것 ────────────────────────────────────────────────────────
  const avoidRules: string[] = [
    `${colorType.avoid
      .slice(0, 3)
      .map((c) => `${c.name}(${c.hex})`)
      .join(", ")}는 얼굴 근처에 두지 마세요. ${colorType.avoid[0].use}.`,
  ];
  if (legBand === "low")
    avoidRules.push(
      `허리에서 ${sizing.skirtAvoidBand[0]}~${sizing.skirtAvoidBand[1]}cm에서 끝나는 기장(종아리가 가장 굵은 지점)과 발등을 덮는 스트랩 슈즈는 다리를 짧아 보이게 합니다.`,
    );
  if (shape === "pear") avoidRules.push("밝고 광택 있는 하의, 엉덩이를 가로지르는 상의 밑단은 피하세요.");
  if (shape === "inverted") avoidRules.push("어깨 패드·볼륨 소매·큰 카라는 상체를 더 넓혀 보이게 합니다.");
  if (shape === "round") avoidRules.push("허리를 조이는 벨트와 배에 붙는 니트는 오히려 라인을 드러냅니다.");
  if (shape === "rectangle") avoidRules.push("위아래가 모두 박시한 조합은 실루엣이 사라져 둔해 보입니다.");
  if (frame === "wave") avoidRules.push("두껍고 뻣뻣한 소재는 몸이 소재에 눌립니다.");
  if (frame === "natural") avoidRules.push("얇고 몸에 딱 붙는 소재는 뼈대가 도드라져 마르고 각져 보입니다.");

  // ── 계산된 치수 ────────────────────────────────────────────────────────
  const sizingHints: SizingHint[] = [
    {
      label: "구두 굽 높이",
      value: `${sizing.heelRange[0]}~${sizing.heelRange[1]}cm`,
      basis: `현재 다리 비율에서 이상 비율(47%)까지의 차이를 굽으로 보정한 값`,
    },
    {
      label: "팬츠 밑단 (굽 신은 상태)",
      value: `바닥에서 ${sizing.hemFromFloor}cm`,
      basis: "밑단이 신발 위에서 끊기지 않아야 다리 라인이 이어집니다",
    },
    {
      label: "상의 총장 (목옆점 기준)",
      value: `크롭 ${sizing.topCrop}cm / 레귤러 ${sizing.topRegular}cm / 롱 ${sizing.topLong}cm`,
      basis: `키 ${body.height}cm의 허리선 위치에서 계산`,
    },
    {
      label: "스커트·원피스 총장 (허리 기준)",
      value: `무릎 위 ${sizing.skirtAboveKnee}cm / 미디 ${sizing.skirtMidi}cm / 롱 ${sizing.skirtLong}cm`,
      basis: "무릎·종아리·발목 높이에서 역산 (종아리 중간은 제외)",
    },
    {
      label: "아우터 총장",
      value: `재킷 ${sizing.jacket}cm / 하프 ${sizing.halfCoat}cm / 롱 ${sizing.longCoat}cm`,
      basis: "키 대비 아우터 기장 비율(36% / 56% / 68%)",
    },
    {
      label: "가방 가로 사이즈",
      value: `${sizing.bagWidth[0]}~${sizing.bagWidth[1]}cm`,
      basis: "몸 폭 대비 가방이 커 보이지 않는 범위(키의 15.5~19%)",
    },
    {
      label: "크로스백 스트랩 (어깨→가방 상단)",
      value: `${sizing.bagDrop}cm`,
      basis:
        legBand === "low"
          ? "가방을 허리선 위에 두면 허리 위치가 높아 보여 다리가 길어 보입니다"
          : "가방이 골반 근처에 오면 전체 실루엣이 안정적입니다",
    },
  ];

  // ── 옷 추천 ────────────────────────────────────────────────────────────
  const clothes: RecommendedItem[] = [];

  clothes.push({
    slot: "top",
    category:
      frame === "wave"
        ? "허리선에서 끝나는 소프트 니트 / 퍼프 블라우스"
        : frame === "natural"
          ? "적당히 오버된 셔츠 · 두께감 있는 니트"
          : "군더더기 없는 라운드·V넥 니트 / 코튼 셔츠",
    searchTerm: frame === "wave" ? "퍼프 블라우스" : frame === "natural" ? "오버핏 셔츠" : "베이직 니트",
    why:
      `${body.frame.name}에 맞는 소재와 ${
        faceBand === "high" ? "가로로 열리는 넥라인" : faceBand === "low" ? "세로로 열리는 넥라인" : "넥라인"
      }으로 얼굴 비율까지 함께 정리합니다.`,
    spec: [
      `총장 ${sizing.topCrop}~${sizing.topRegular}cm`,
      faceBand === "high" ? "넥라인: 라운드·보트넥" : "넥라인: V넥·오픈 카라",
      armBand === "high" ? "소매: 긴팔은 손등을 살짝 덮는 기장" : "소매: 7부 또는 손목이 보이는 기장",
      frame === "straight" ? "소재: 매끈한 코튼·메리노" : frame === "wave" ? "소재: 부드러운 앙고라·시폰" : "소재: 워싱 코튼·거친 니트",
    ],
    colors: topColors,
  });

  clothes.push({
    slot: "bottom",
    category:
      shape === "pear"
        ? "하이웨이스트 스트레이트·와이드 슬랙스"
        : shape === "inverted"
          ? "볼륨 있는 와이드·플레어 팬츠"
          : shape === "round"
            ? "배를 누르지 않는 하이웨이스트 테이퍼드 팬츠"
            : "하이웨이스트 스트레이트 팬츠",
    searchTerm:
      shape === "inverted"
        ? "하이웨이스트 와이드 팬츠"
        : shape === "round"
          ? "하이웨이스트 테이퍼드 팬츠"
          : "하이웨이스트 슬랙스",
    why:
      legBand === "low"
        ? "허리선을 올리고 밑단까지 라인을 끊지 않아 다리 비율을 시각적으로 늘립니다."
        : "다리 비율이 좋아 밑단 폭과 기장 선택이 자유롭습니다.",
    spec: [
      `밑단은 굽 신은 상태에서 바닥 ${sizing.hemFromFloor}cm`,
      legBand === "low" ? "밑위 깊은 하이웨이스트 (배꼽 위)" : "하이·미들 웨이스트 모두 가능",
      shape === "pear" ? "앞주름(핀턱) 있는 스트레이트가 허벅지를 자연스럽게 지나갑니다" : "앞판이 깔끔한 무주름도 잘 맞습니다",
      "하의 색을 구두와 맞추면 다리 길이가 이어져 보입니다",
    ],
    colors: bottomColors,
  });

  clothes.push({
    slot: "dress",
    category:
      shape === "hourglass"
        ? "허리선이 들어간 랩·벨티드 원피스"
        : shape === "round"
          ? "가슴 아래에서 떨어지는 엠파이어·A라인 원피스"
          : shape === "pear"
            ? "상체에 디테일이 있는 A라인 원피스"
            : "허리 턱·벨트로 라인을 만드는 원피스",
    searchTerm:
      shape === "hourglass"
        ? "랩 원피스"
        : shape === "round"
          ? "엠파이어 원피스"
          : "A라인 원피스",
    why: `${body.shape.name}의 볼륨 분포에 맞춰 시선이 가장 좋은 곳에 머물도록 설계된 실루엣입니다.`,
    spec: [
      `총장: 무릎 위 ${sizing.skirtAboveKnee}cm 또는 미디 ${sizing.skirtMidi}cm`,
      `총장 ${sizing.skirtAvoidBand[0]}~${sizing.skirtAvoidBand[1]}cm(종아리가 가장 굵은 지점)는 피하기`,
      frame === "wave" ? "부드럽게 흐르는 소재" : frame === "natural" ? "린넨·워싱 등 텍스처 있는 소재" : "형태가 유지되는 매끈한 소재",
    ],
    colors: pick(colorType.best, "원피스", 3),
  });

  clothes.push({
    slot: "outer",
    category:
      headBand === "low"
        ? "카라가 작은 싱글 재킷 · 노카라 코트"
        : frame === "natural"
          ? "오버사이즈 셋업 재킷 · 발마칸 코트"
          : "어깨선이 맞는 테일러드 재킷 · 스트레이트 코트",
    searchTerm:
      headBand === "low" ? "노카라 코트" : frame === "natural" ? "오버핏 발마칸 코트" : "테일러드 재킷",
    why: "아우터는 전체 실루엣의 세로선을 결정합니다. 어깨선이 맞고 앞이 길게 트이는 형태가 가장 안전합니다.",
    spec: [
      `재킷 ${sizing.jacket}cm / 하프 ${sizing.halfCoat}cm / 롱 ${sizing.longCoat}cm`,
      legBand === "low" ? "롱코트는 안에 입는 옷과 톤을 맞춰 세로선을 유지하세요" : "롱코트·숏 아우터 모두 소화 가능",
      shoulderBand === "high" ? "어깨 패드 없는 드롭숄더" : "어깨선이 정확히 맞는 셋인 숄더",
    ],
    colors: outerColors.slice(0, 3),
  });

  // ── 구두 추천 ──────────────────────────────────────────────────────────
  const shoes: RecommendedItem[] = [
    {
      slot: "shoes",
      category: `${sizing.heelRange[0]}~${sizing.heelRange[1]}cm 아몬드 토 펌프스`,
      searchTerm: `${sizing.heelRange[1]}cm 펌프스`,
      why:
        legBand === "low"
          ? "발등을 넓게 드러내고 앞코가 살짝 길어 다리 라인이 발끝까지 이어집니다. 굽 높이는 부족한 다리 비율을 정확히 메우는 값입니다."
          : "굽이 낮아도 비율이 무너지지 않아 데일리로 가장 실용적인 형태입니다.",
      spec: [
        `굽 ${sizing.heelRange[0]}~${sizing.heelRange[1]}cm`,
        "토 모양: 아몬드·포인티 (발등 노출이 클수록 다리가 길어 보임)",
        "발목 스트랩은 다리를 끊으므로 피하기",
      ],
      colors: [nude, ...darkest(colorType.neutral, 1)],
    },
    {
      slot: "shoes",
      category: frame === "natural" ? "투박한 로퍼 · 첼시 부츠" : "슬림한 로퍼 · 플랫",
      searchTerm: frame === "natural" ? "첼시 부츠" : "로퍼",
      why: `${body.frame.name}은 신발의 두께감도 몸의 뼈대와 맞아야 균형이 잡힙니다.`,
      spec: [
        frame === "natural" ? "밑창 두께 2.5cm 이상, 볼륨 있는 라스트" : "밑창 1.5cm 이하, 얇은 라스트",
        legBand === "low" ? "하의와 같은 톤으로 맞춰 신기" : "포인트 컬러로 신어도 무방",
      ],
      colors: [...darkest(colorType.neutral, 1), nude],
    },
    {
      slot: "shoes",
      category: "스니커즈 (데일리)",
      searchTerm: "스니커즈",
      why: "캐주얼에서도 팔레트를 유지하면 전체 톤이 흐트러지지 않습니다.",
      spec: [
        legBand === "low" ? "발목이 드러나는 로우탑 (하이탑은 다리를 끊음)" : "로우탑·하이탑 모두 가능",
        "밑창은 하의 색과 가까운 톤으로",
      ],
      colors: lightest(colorType.neutral, 2),
    },
  ];

  // ── 가방 추천 ──────────────────────────────────────────────────────────
  const bags: RecommendedItem[] = [
    {
      slot: "bag",
      category: "구조감 있는 미니 숄더백",
      searchTerm: "미니 숄더백",
      why:
        legBand === "low"
          ? "가방을 허리선 위에 두면 허리 위치가 올라가 보여 다리 비율이 좋아집니다."
          : "가방 위치가 자유로워 어깨에 걸치는 형태가 가장 편안합니다.",
      spec: [
        `가로 ${sizing.bagWidth[0]}~${sizing.bagWidth[1]}cm`,
        `스트랩: 어깨에서 ${sizing.bagDrop}cm 지점에 가방 상단이 오도록`,
        headBand === "low" ? "가방이 너무 크면 머리가 더 커 보이니 가로 폭 상한을 지키세요" : "조금 큰 사이즈도 소화 가능",
      ],
      colors: [pointColors[0], colorType.neutral[2] ?? colorType.neutral[1]],
    },
    {
      slot: "bag",
      category: "세로형 토트백 (출근·수납용)",
      searchTerm: "세로형 토트백",
      why: "세로가 긴 형태는 몸에 세로선을 더해 전체를 길어 보이게 합니다.",
      spec: [
        `가로 ${sizing.bagWidth[1]}cm 내외, 세로가 가로보다 길 것`,
        "손잡이는 어깨에 걸치는 길이(약 25~30cm 드롭)",
        "소재는 형태가 유지되는 가죽·코팅 캔버스",
      ],
      colors: [...darkest(colorType.neutral, 1), colorType.best[0]],
    },
    {
      slot: "bag",
      category: "포인트 컬러 클러치·미니백",
      searchTerm: "미니백",
      why: `무채색 옷차림일 때 ${colorType.name}의 베스트 컬러를 가방으로 얹으면 얼굴빛이 살아납니다.`,
      spec: ["가로 20cm 내외", "옷에는 쓰기 부담스러운 채도 높은 색을 가방으로 소화"],
      colors: pointColors.slice(0, 2),
    },
  ];

  // ── 코디 3세트 (AI가 없을 때도 항상 제공되는 규칙 기반 결과) ────────────
  const looks: OutfitLook[] = [
    {
      title: "데일리",
      scene: "동네·카페·가벼운 약속",
      items: [
        { slot: "상의", name: `${clothes[0].category.split(" / ")[0]} (총장 ${sizing.topCrop}cm)`, color: topColors[0] },
        { slot: "하의", name: `${clothes[1].category} (밑단 바닥 ${sizing.hemFromFloor}cm)`, color: bottomColors[0] },
        { slot: "구두", name: shoes[1].category, color: shoes[1].colors[0] },
        { slot: "가방", name: bags[0].category, color: bags[0].colors[0] },
      ],
      tip: sizing.totalLookRule,
    },
    {
      title: "오피스",
      scene: "출근·미팅",
      items: [
        { slot: "아우터", name: `${clothes[3].category} (총장 ${sizing.jacket}cm)`, color: outerColors[0] },
        { slot: "이너", name: "베스트 컬러 이너", color: softColors[0] },
        { slot: "하의", name: `${clothes[1].category}`, color: bottomColors[0] },
        { slot: "구두", name: shoes[0].category, color: shoes[0].colors[0] },
        { slot: "가방", name: bags[1].category, color: bags[1].colors[0] },
      ],
      tip: "무채색 정장에도 이너 한 장만 팔레트 색으로 바꾸면 안색이 확 달라집니다.",
    },
    {
      title: "특별한 날",
      scene: "약속·행사·사진 찍는 날",
      items: [
        { slot: "원피스", name: `${clothes[2].category} (총장 ${sizing.skirtMidi}cm)`, color: pointColors[0] },
        { slot: "구두", name: `${sizing.heelRange[1]}cm 펌프스`, color: shoes[0].colors[0] },
        { slot: "가방", name: bags[2].category, color: bags[2].colors[0] },
        { slot: "립", name: colorType.lip[0].name, color: colorType.lip[0] },
        { slot: "주얼리", name: colorType.metal[0].name, color: colorType.metal[0] },
      ],
      tip: `사진을 찍는 날이라면 얼굴 바로 아래에 ${colorType.best[0].name}(${colorType.best[0].hex})을 두세요.`,
    },
  ];

  const headline = `${colorType.name} · ${body.shape.name} · ${body.headUnits.toFixed(1)}등신`;

  return {
    headline,
    keywords: [...colorType.keywords, body.frame.name, body.shape.name],
    silhouetteRules,
    avoidRules,
    sizing: sizingHints,
    clothes,
    shoes,
    bags,
    looks,
  };
}
