import type {
  BodyDiagnosis,
  BodyInput,
  BodyShapeId,
  FrameId,
  Gender,
  RatioBand,
  RatioResult,
} from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Size Korea 계측 평균을 참고한 근사값. 사용자가 재지 않은 항목을 추정할 때 쓴다.
const POPULATION = {
  female: {
    headRatio: 1 / 7.3, // 키 대비 머리 길이(정수리~턱)
    faceOfHead: 0.76, // 머리 길이 대비 얼굴 길이(헤어라인~턱)
    legRatio: 0.452, // 키 대비 다리 길이(골반~바닥)
    armRatio: 0.302,
    shoulderRatio: 0.232,
    bustRatio: 0.53,
    waistRatio: 0.44,
    hipRatio: 0.575,
  },
  male: {
    headRatio: 1 / 7.5,
    faceOfHead: 0.78,
    legRatio: 0.462,
    armRatio: 0.312,
    shoulderRatio: 0.256,
    bustRatio: 0.55,
    waistRatio: 0.47,
    hipRatio: 0.555,
  },
};

function profileFor(gender: Gender) {
  return gender === "male" ? POPULATION.male : POPULATION.female;
}

type Normalized = Required<
  Pick<
    BodyInput,
    | "height"
    | "headLength"
    | "faceLength"
    | "shoulderWidth"
    | "bust"
    | "waist"
    | "hip"
    | "legLength"
    | "armLength"
  >
> & { estimated: string[]; gender: Gender };

// 비어 있는 계측값을 키·성별 평균으로 채우고, 어떤 값이 추정치인지 기록한다.
export function normalizeBody(input: BodyInput): Normalized {
  const profile = profileFor(input.gender);
  const height = clamp(input.height, 120, 220);
  const estimated: string[] = [];

  const pick = (value: number | undefined, fallback: number, label: string) => {
    if (typeof value === "number" && value > 0) return value;
    estimated.push(label);
    return Math.round(fallback * 10) / 10;
  };

  const headLength = pick(input.headLength, height * profile.headRatio, "머리 길이");
  const faceLength = pick(input.faceLength, headLength * profile.faceOfHead, "얼굴 길이");
  const legLength = pick(input.legLength, height * profile.legRatio, "다리 길이");
  const armLength = pick(input.armLength, height * profile.armRatio, "팔 길이");
  const shoulderWidth = pick(input.shoulderWidth, height * profile.shoulderRatio, "어깨너비");
  const bust = pick(input.bust, height * profile.bustRatio, "가슴둘레");
  const waist = pick(input.waist, height * profile.waistRatio, "허리둘레");
  const hip = pick(input.hip, height * profile.hipRatio, "엉덩이둘레");

  return {
    height,
    headLength,
    faceLength,
    shoulderWidth,
    bust,
    waist,
    hip,
    legLength,
    armLength,
    estimated,
    gender: input.gender,
  };
}

function band(value: number, [low, high]: [number, number]): RatioBand {
  if (value < low) return "low";
  if (value > high) return "high";
  return "average";
}

const BAND_LABEL: Record<RatioBand, string> = {
  low: "평균보다 짧은 편",
  average: "평균 범위",
  high: "평균보다 긴 편",
};

export function bodyShape(m: Normalized): { id: BodyShapeId; name: string; description: string } {
  const shoulderCircum = m.shoulderWidth * 2.2; // 어깨너비를 둘레 스케일로 환산해 상하 비교
  const upper = Math.max(m.bust, shoulderCircum);
  const waistToHip = m.waist / m.hip;
  const waistDefinition = upper - m.waist;

  // 평균 체형에서도 여성은 엉덩이가 가슴보다 7cm 정도 크다.
  // 그 평균 차이를 기준선으로 빼줘야 "평균 체형 = 삼각형"으로 잘못 나오지 않는다.
  const baseline = m.gender === "male" ? 1 : 7;
  const hipMinusUpper = m.hip - upper - baseline;

  if (hipMinusUpper >= 5) {
    return {
      id: "pear",
      name: "하체 볼륨형 (삼각형)",
      description:
        "어깨·가슴보다 엉덩이와 허벅지 볼륨이 큰 체형. 시선을 위로 올리고 하체를 정돈하면 균형이 맞습니다.",
    };
  }
  if (hipMinusUpper <= -5) {
    return {
      id: "inverted",
      name: "상체 볼륨형 (역삼각형)",
      description:
        "어깨·가슴 볼륨이 엉덩이보다 큰 체형. 상체를 덜어내고 하체에 볼륨을 주면 균형이 맞습니다.",
    };
  }
  if (waistDefinition >= 20 && waistToHip <= 0.75) {
    return {
      id: "hourglass",
      name: "모래시계형",
      description:
        "어깨와 엉덩이가 비슷하고 허리가 확실히 들어간 체형. 허리선을 드러내는 옷이 가장 잘 맞습니다.",
    };
  }
  if (waistToHip >= 0.85) {
    return {
      id: "round",
      name: "복부 볼륨형 (라운드)",
      description:
        "허리선이 상대적으로 완만한 체형. 배 위로 떨어지는 라인과 세로선을 살리면 실루엣이 정리됩니다.",
    };
  }
  return {
    id: "rectangle",
    name: "일자형 (스트레이트/직사각)",
    description:
      "어깨·허리·엉덩이 폭 차이가 크지 않은 체형. 허리선을 만들어주는 디테일이 필요합니다.",
  };
}

export function frameType(input: BodyInput): { id: FrameId; name: string; description: string } {
  const answers = input.frame;
  const score: Record<FrameId, number> = { straight: 0, wave: 0, natural: 0 };

  if (answers) {
    if (answers.wrist === "thin") score.wave += 2;
    if (answers.wrist === "medium") score.straight += 2;
    if (answers.wrist === "thick") score.natural += 2;

    if (answers.collarbone === "hidden") score.straight += 2;
    if (answers.collarbone === "slight") score.wave += 2;
    if (answers.collarbone === "prominent") score.natural += 2;

    if (answers.fleshiness === "upper") score.straight += 2;
    if (answers.fleshiness === "lower") score.wave += 2;
    if (answers.fleshiness === "even") score.natural += 1;
  } else {
    score.straight += 1; // 답이 없으면 가장 무난한 기본값
  }

  const winner = (Object.keys(score) as FrameId[]).sort((a, b) => score[b] - score[a])[0];

  const table: Record<FrameId, { name: string; description: string }> = {
    straight: {
      name: "스트레이트 골격",
      description:
        "상체에 두께가 있고 몸의 선이 직선적입니다. 몸에 붙지 않되 군더더기 없는 'I 라인'과 매끈한 소재가 잘 맞습니다.",
    },
    wave: {
      name: "웨이브 골격",
      description:
        "뼈가 가늘고 상체가 얇으며 아래쪽에 살이 붙습니다. 허리선을 높이고 부드러운 소재로 위쪽에 볼륨을 주면 좋습니다.",
    },
    natural: {
      name: "내추럴 골격",
      description:
        "관절과 뼈대가 도드라집니다. 몸에 붙는 옷보다 여유 있는 실루엣과 두께감 있는 소재가 훨씬 잘 어울립니다.",
    },
  };

  const prefix = answers ? "" : "(골격 문항에 답하지 않아 기본값으로 잡았습니다. 3문항만 답하면 정확해집니다.) ";
  return { id: winner, name: table[winner].name, description: prefix + table[winner].description };
}

export function diagnoseBody(input: BodyInput, source: "manual" | "photo" = "manual"): BodyDiagnosis {
  const m = normalizeBody(input);
  const isMale = m.gender === "male";

  const headUnits = m.height / m.headLength;
  const legRatio = m.legLength / m.height;
  const armRatio = m.armLength / m.height;
  const faceRatio = m.faceLength / m.height;
  const torsoLength = Math.max(m.height - m.headLength - m.legLength, 1); // 턱 ~ 골반
  const upperShare = (torsoLength / (torsoLength + m.legLength)) * 100;
  const shoulderToHip = (m.shoulderWidth * 2.2) / m.hip;
  const waistToHip = m.waist / m.hip;

  const wasEstimated = (label: string) => m.estimated.includes(label);

  const ratios: RatioResult[] = [
    {
      key: "headUnits",
      label: "두신 비율 (키 ÷ 머리 길이)",
      value: Number(headUnits.toFixed(2)),
      display: `${headUnits.toFixed(1)}등신`,
      unit: "등신",
      averageRange: isMale ? [7.2, 7.8] : [7.0, 7.6],
      band: band(headUnits, isMale ? [7.2, 7.8] : [7.0, 7.6]),
      bandLabel: "",
      comment: "",
      estimated: wasEstimated("머리 길이"),
    },
    {
      key: "faceRatio",
      label: "얼굴 길이 비율 (얼굴 ÷ 키)",
      value: Number(faceRatio.toFixed(3)),
      display: `${(faceRatio * 100).toFixed(1)}% · 얼굴 ${m.faceLength.toFixed(1)}cm`,
      unit: "%",
      averageRange: [0.098, 0.115],
      band: band(faceRatio, [0.098, 0.115]),
      bandLabel: "",
      comment: "",
      estimated: wasEstimated("얼굴 길이"),
    },
    {
      key: "legRatio",
      label: "다리 길이 비율 (다리 ÷ 키)",
      value: Number(legRatio.toFixed(3)),
      display: `${(legRatio * 100).toFixed(1)}% · 다리 ${m.legLength.toFixed(1)}cm`,
      unit: "%",
      averageRange: isMale ? [0.45, 0.475] : [0.44, 0.465],
      band: band(legRatio, isMale ? [0.45, 0.475] : [0.44, 0.465]),
      bandLabel: "",
      comment: "",
      estimated: wasEstimated("다리 길이"),
    },
    {
      key: "upperLower",
      label: "상체 : 하체 (머리 제외)",
      value: Number(upperShare.toFixed(1)),
      display: `${upperShare.toFixed(0)} : ${(100 - upperShare).toFixed(0)}`,
      unit: ":",
      averageRange: [45, 49],
      band: band(upperShare, [45, 49]),
      bandLabel: "",
      comment: "",
      estimated: wasEstimated("다리 길이"),
    },
    {
      key: "armRatio",
      label: "팔 길이 비율 (팔 ÷ 키)",
      value: Number(armRatio.toFixed(3)),
      display: `${(armRatio * 100).toFixed(1)}% · 팔 ${m.armLength.toFixed(1)}cm`,
      unit: "%",
      averageRange: [0.295, 0.315],
      band: band(armRatio, [0.295, 0.315]),
      bandLabel: "",
      comment: "",
      estimated: wasEstimated("팔 길이"),
    },
    {
      key: "shoulderToHip",
      label: "어깨 : 엉덩이 균형",
      value: Number(shoulderToHip.toFixed(2)),
      display: `${shoulderToHip.toFixed(2)} (어깨너비 ${m.shoulderWidth.toFixed(1)}cm)`,
      unit: "배",
      averageRange: [0.92, 1.03],
      band: band(shoulderToHip, [0.92, 1.03]),
      bandLabel: "",
      comment: "",
      estimated: wasEstimated("어깨너비") || wasEstimated("엉덩이둘레"),
    },
    {
      key: "waistToHip",
      label: "허리 : 엉덩이 (WHR)",
      value: Number(waistToHip.toFixed(2)),
      display: `${waistToHip.toFixed(2)}`,
      unit: "배",
      averageRange: isMale ? [0.8, 0.9] : [0.7, 0.8],
      band: band(waistToHip, isMale ? [0.8, 0.9] : [0.7, 0.8]),
      bandLabel: "",
      comment: "",
      estimated: wasEstimated("허리둘레") || wasEstimated("엉덩이둘레"),
    },
  ];

  const comments: Record<string, Record<RatioBand, string>> = {
    headUnits: {
      low: "머리가 상대적으로 커 보이는 비율입니다. 볼륨 있는 헤어와 큰 모자·큰 카라는 피하고, 세로선을 살리면 등신이 올라 보입니다.",
      average: "머리와 몸의 비율이 안정적입니다. 실루엣 선택의 폭이 넓습니다.",
      high: "머리가 작고 등신이 긴 비율입니다. 오버사이즈·볼륨 실루엣을 소화하기 좋습니다.",
    },
    faceRatio: {
      low: "얼굴 길이가 짧은 편이라 목선이 답답해 보이기 쉽습니다. V넥·오픈 카라로 세로선을 만들어 주세요.",
      average: "얼굴 길이 비율이 평균 범위입니다. 넥라인 선택이 자유롭습니다.",
      high: "얼굴이 긴 편이라 가로 요소가 도움이 됩니다. 라운드넥·보트넥, 가로 스트라이프 카라가 잘 맞습니다.",
    },
    legRatio: {
      low: "다리 비율을 올려 주는 설계가 핵심입니다. 하이웨이스트 + 하의와 신발 색 맞추기(톤온톤)로 다리 길이를 시각적으로 늘립니다.",
      average: "상하체 균형이 좋습니다. 허리선 위치를 바꿔가며 다양한 실루엣을 시도할 수 있습니다.",
      high: "다리가 긴 비율이라 로우라이즈·롱 아우터도 소화됩니다. 오히려 상체에 볼륨을 줘도 무너지지 않습니다.",
    },
    upperLower: {
      low: "하체 비중이 큰 균형입니다. 상의 길이를 조금 늘리거나 상체에 시선을 두면 자연스럽습니다.",
      average: "이상적인 상하체 균형(45:55 부근)에 가깝습니다.",
      high: "상체 비중이 큰 균형입니다. 상의를 짧게(크롭·인턱) 입고 허리선을 올리는 것이 가장 빠른 해법입니다.",
    },
    armRatio: {
      low: "소매가 남기 쉬운 비율입니다. 7부·롤업 소매, 손목이 보이는 기장이 훨씬 깔끔합니다.",
      average: "기성복 소매 기장이 대체로 잘 맞는 비율입니다.",
      high: "팔이 긴 편이라 정장·셔츠는 소매 기장 수선을 전제로 고르는 편이 좋습니다. 오버사이즈는 소매를 접어 입으세요.",
    },
    shoulderToHip: {
      low: "어깨가 좁은 편입니다. 어깨 라인이 살아 있는 재킷·퍼프 소매로 상체를 넓히면 균형이 잡힙니다.",
      average: "어깨와 엉덩이 폭이 균형적입니다.",
      high: "어깨가 넓은 편입니다. 어깨 패드·볼륨 소매를 피하고 목선을 깊게 열면 상체가 가벼워집니다.",
    },
    waistToHip: {
      low: "허리 굴곡이 뚜렷합니다. 허리선을 드러내는 옷이 가장 잘 어울립니다.",
      average: "허리와 엉덩이 비율이 평균 범위입니다.",
      high: "허리선이 완만한 편입니다. 벨트로 억지로 조이기보다 세로 라인과 A라인으로 정리하세요.",
    },
  };

  ratios.forEach((ratio) => {
    ratio.bandLabel =
      ratio.key === "waistToHip" || ratio.key === "shoulderToHip" || ratio.key === "upperLower"
        ? { low: "평균보다 작은 편", average: "평균 범위", high: "평균보다 큰 편" }[ratio.band]
        : BAND_LABEL[ratio.band];
    ratio.comment = comments[ratio.key][ratio.band];
  });

  const shape = bodyShape(m);
  const frame = frameType(input);

  const strengths: string[] = [];
  const balancePoints: string[] = [];

  const legBand = ratios.find((r) => r.key === "legRatio")!.band;
  const headBand = ratios.find((r) => r.key === "headUnits")!.band;
  const upperBand = ratios.find((r) => r.key === "upperLower")!.band;

  if (legBand === "high") strengths.push("다리 비율이 길어 하의 선택이 자유롭습니다.");
  if (headBand === "high") strengths.push("두신 비율이 높아 오버사이즈가 잘 받습니다.");
  if (shape.id === "hourglass") strengths.push("허리 굴곡이 뚜렷해 허리선을 살리는 옷이 잘 맞습니다.");
  if (frame.id === "natural") strengths.push("뼈대가 있어 두께감 있는 소재와 루즈핏을 잘 소화합니다.");
  if (frame.id === "straight") strengths.push("상체 라인이 깔끔해 심플한 정장·셔츠가 잘 맞습니다.");
  if (strengths.length === 0) strengths.push("전체 비율이 평균 범위라 다양한 실루엣을 시도할 수 있습니다.");

  if (legBand === "low" || upperBand === "high")
    balancePoints.push("허리선을 올려 다리 비율을 늘리는 것이 1순위입니다.");
  if (headBand === "low") balancePoints.push("머리 주변 볼륨을 줄이고 세로선을 만들어 주세요.");
  if (shape.id === "pear") balancePoints.push("하체는 어둡게·매끈하게, 상체에 시선을 모으세요.");
  if (shape.id === "inverted") balancePoints.push("어깨 볼륨을 줄이고 하체에 폭을 주세요.");
  if (shape.id === "round") balancePoints.push("배 위로 떨어지는 라인과 세로 오픈이 필요합니다.");
  if (shape.id === "rectangle") balancePoints.push("허리 디테일(턱·벨트·랩)이 실루엣을 만들어 줍니다.");
  if (balancePoints.length === 0) balancePoints.push("특별히 보완할 지점이 없어 취향대로 입어도 무너지지 않습니다.");

  return {
    source,
    height: m.height,
    headUnits: Number(headUnits.toFixed(2)),
    ratios,
    shape,
    frame,
    upperLower: [Number(upperShare.toFixed(0)), Number((100 - upperShare).toFixed(0))],
    strengths,
    balancePoints,
    estimatedFields: m.estimated,
  };
}
