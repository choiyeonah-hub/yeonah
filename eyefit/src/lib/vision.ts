import { getOpenAI } from "./openai";
import { IRIS_WIDTH_MM } from "./visionConstants";
import { FACE_SHAPE_IDS, FACE_SHAPES } from "./faceShapes";
import type {
  FaceAnalysis,
  FaceLandmarks,
  FaceMeasurements,
  FaceShapeId,
  Point,
  Prescription,
  ProfileMeasurements,
} from "./types";


const VISION_MODEL = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9+\-.]/g, "");
    if (!cleaned || cleaned === "+" || cleaned === "-" || cleaned === ".") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const FACE_SYSTEM = `너는 안경 피팅을 돕는 얼굴 계측 도우미다. 사진 속 얼굴의 "기하학적 비율"만 측정한다.

반드시 지킬 것:
- 외모 평가, 매력도 점수, 미의 기준에 대한 언급을 절대 하지 않는다.
- 인종·성별·나이·감정·신원을 추정하거나 언급하지 않는다. 안경 사이즈 계산에 필요한 비율만 본다.
- 성별에 따른 "표준 두상"을 가정하지 않는다. 사진에 보이는 실제 비율만 쓴다.
- 서구권 표준 코받침을 기본값으로 두지 말고, 콧대 높이를 실제로 보고 판단한다.
- 얼굴이 안 보이거나 각도/조명이 나쁘면 confidence를 0.4 이하로 낮춘다.

얼굴형 분류 기준:
- oval(계란형): 세로가 살짝 길고 이마와 턱 폭 차이가 작음
- round(둥근형): 가로세로가 비슷하고 턱선이 완만함
- square(각진형): 이마·광대·턱 폭이 비슷하고 턱 각이 뚜렷함
- heart(하트형): 이마가 넓고 턱이 좁음
- oblong(긴형): 가로폭 대비 세로가 뚜렷하게 김
- diamond(다이아몬드형): 광대가 가장 넓고 이마·턱이 좁음
- triangle(삼각형): 이마가 좁고 턱이 넓음
- rectangle(긴 각진형): 세로가 길면서 턱 각도 뚜렷함

아래 JSON 형식으로만 응답한다:
{
  "faceShape": "oval|round|square|heart|oblong|diamond|triangle|rectangle",
  "widthToHeight": 0.60~1.10 사이 숫자 (광대 너비 / 얼굴 세로 길이),
  "jawToCheek": 0.50~1.10 사이 숫자 (턱 너비 / 광대 너비),
  "foreheadToCheek": 0.50~1.10 사이 숫자 (이마 너비 / 광대 너비),
  "noseBridge": "low|medium|high",
  "eyeSpacing": "narrow|average|wide",
  "faceWidth": "narrow|average|wide",
  "browLine": "straight|arched|angular|soft",
  "summary": "왜 그 얼굴형으로 봤는지 비율 근거를 담은 2~3문장 한국어 설명 (외모 평가 없이)",
  "confidence": 0~1 숫자,
  "landmarks": {
    "rightPupil": {"x": 0~1, "y": 0~1},
    "leftPupil": {"x": 0~1, "y": 0~1},
    "noseBridge": {"x": 0~1, "y": 0~1},
    "faceLeft": {"x": 0~1, "y": 0~1},
    "faceRight": {"x": 0~1, "y": 0~1},
    "irisWidthRatio": 0~1 숫자
  }
}

좌표 규칙:
- x는 이미지 왼쪽 끝이 0, 오른쪽 끝이 1. y는 위가 0, 아래가 1.
- rightPupil은 "착용자의 오른쪽 눈"이므로 정면 사진에서는 보통 화면 왼쪽에 있다.
- noseBridge는 두 눈 사이, 안경 코받침이 얹히는 지점.
- faceLeft / faceRight는 관자놀이 높이에서 얼굴 윤곽의 좌우 바깥 끝.
- irisWidthRatio는 한쪽 눈 홍채(갈색/검은 원)의 가로 지름을 이미지 전체 폭으로 나눈 값.
  이 값으로 사진을 실제 mm로 환산하니 최대한 정확히 재라.
- 얼굴을 찾지 못하면 landmarks를 null로 둬라.`;

function toPoint(raw: unknown): Point | null {
  const p = (raw ?? {}) as Record<string, unknown>;
  const x = toNumber(p.x);
  const y = toNumber(p.y);
  if (x == null || y == null) return null;
  // 좌표가 이미지 밖으로 나가면 모델이 헛본 것이므로 버린다.
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

function toLandmarks(raw: unknown): FaceLandmarks | null {
  const l = (raw ?? {}) as Record<string, unknown>;
  const rightPupil = toPoint(l.rightPupil);
  const leftPupil = toPoint(l.leftPupil);
  const noseBridge = toPoint(l.noseBridge);
  const faceLeft = toPoint(l.faceLeft);
  const faceRight = toPoint(l.faceRight);
  const irisWidthRatio = toNumber(l.irisWidthRatio);

  if (!rightPupil || !leftPupil || !noseBridge || !faceLeft || !faceRight) return null;
  // 홍채가 이미지 폭의 0.5%보다 작거나 20%보다 크면 잘못 읽은 값이다.
  if (irisWidthRatio == null || irisWidthRatio < 0.005 || irisWidthRatio > 0.2) return null;
  // 두 눈이 겹쳐 보이면 정면 사진이 아니다.
  if (Math.abs(leftPupil.x - rightPupil.x) < irisWidthRatio) return null;

  return { rightPupil, leftPupil, noseBridge, faceLeft, faceRight, irisWidthRatio };
}

/**
 * 홍채 지름을 자로 삼아 사진 속 거리를 mm로 바꾼다.
 *
 * 사진은 원근 왜곡이 있고 얼굴이 정면이 아니면 값이 흔들리므로,
 * 여기서 나온 값은 "참고용 추정치"다. PD는 매장에서 다시 재야 한다.
 */
function measureFromLandmarks(l: FaceLandmarks): FaceMeasurements | null {
  const mmPerRatio = IRIS_WIDTH_MM / l.irisWidthRatio;
  const pdRatio = Math.hypot(l.leftPupil.x - l.rightPupil.x, l.leftPupil.y - l.rightPupil.y);
  const faceRatio = Math.hypot(l.faceRight.x - l.faceLeft.x, l.faceRight.y - l.faceLeft.y);

  const pdMm = Math.round(pdRatio * mmPerRatio * 10) / 10;
  const faceWidthMm = Math.round(faceRatio * mmPerRatio);

  // 사람의 PD는 대략 50~78mm, 얼굴 폭은 110~180mm 범위를 벗어나지 않는다.
  // 벗어나면 원근 왜곡이나 오독이므로 mm 환산 자체를 포기한다.
  if (pdMm < 50 || pdMm > 78) return null;
  if (faceWidthMm < 110 || faceWidthMm > 180) return null;

  return { pdMm, faceWidthMm, irisMm: IRIS_WIDTH_MM };
}

/**
 * 얼굴 사진에서 안경 피팅용 비율을 뽑는다.
 *
 * 이미지는 이 함수 안에서만 쓰이고 어디에도 저장하지 않는다.
 * 호출자는 결과(파생 수치)만 들고 있으면 된다.
 */
export async function analyzeFacePhoto(imageDataUrl: string): Promise<FaceAnalysis> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: FACE_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "이 사진의 얼굴 비율을 측정해줘." },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
        ],
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const faceShape = pick<FaceShapeId>(parsed.faceShape, FACE_SHAPE_IDS, "oval");
  const landmarks = toLandmarks(parsed.landmarks);

  return {
    faceShape,
    widthToHeight: clamp(toNumber(parsed.widthToHeight) ?? 0.75, 0.5, 1.2),
    jawToCheek: clamp(toNumber(parsed.jawToCheek) ?? 0.85, 0.4, 1.2),
    foreheadToCheek: clamp(toNumber(parsed.foreheadToCheek) ?? 0.9, 0.4, 1.2),
    noseBridge: pick(parsed.noseBridge, ["low", "medium", "high"] as const, "medium"),
    eyeSpacing: pick(parsed.eyeSpacing, ["narrow", "average", "wide"] as const, "average"),
    faceWidth: pick(parsed.faceWidth, ["narrow", "average", "wide"] as const, "average"),
    browLine: pick(parsed.browLine, ["straight", "arched", "angular", "soft"] as const, "straight"),
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : FACE_SHAPES[faceShape].description,
    landmarks,
    measured: landmarks ? measureFromLandmarks(landmarks) : null,
    profile: null,
    confidence: clamp(toNumber(parsed.confidence) ?? 0.5, 0, 1),
    source: "ai",
  };
}

const PROFILE_SYSTEM = `너는 안경 피팅을 돕는 얼굴 계측 도우미다. 옆모습 사진에서 코와 귀의 위치만 잰다.

반드시 지킬 것:
- 외모 평가, 매력도, 인종·성별·나이 추정을 하지 않는다. 안경이 얹히는 위치 계산만 한다.
- 값을 지어내지 않는다. 옆모습이 아니거나 코가 가려져 있으면 confidence를 0.3 이하로 낮춘다.

재는 것 (모두 홍채 가로 지름을 1.0으로 놓은 상대값으로 답한다):
- bridgeHeightRatio: 두 눈 사이 콧대 시작점이 눈두덩 면보다 얼마나 앞으로 솟아 있는지.
  이 값이 작을수록 안경이 흘러내린다.
- bridgeAngleDeg: 콧대가 수직선에서 얼마나 기울었는지(도). 보통 20~45도.
- earToEyeOffsetRatio: 귀가 시작되는 높이가 눈높이보다 얼마나 위인지(양수) 아래인지(음수).
  안경 다리를 얼마나 꺾어야 하는지 정하는 값이다.

아래 JSON 형식으로만 응답한다:
{
  "bridgeHeightRatio": 숫자,
  "bridgeAngleDeg": 숫자,
  "earToEyeOffsetRatio": 숫자,
  "confidence": 0~1 숫자
}`;

/**
 * 옆모습 사진에서 코받침 설계에 필요한 수치를 뽑는다.
 *
 * 정면 사진만으로는 콧대가 "얼마나 솟아 있는지"를 알 수 없다. 기성 안경이
 * 흘러내리는 가장 큰 원인이 이 치수라, 맞춤 제작에서는 옆모습이 필요하다.
 * 이미지는 이 함수 안에서만 쓰이고 어디에도 저장하지 않는다.
 */
export async function analyzeProfilePhoto(imageDataUrl: string): Promise<ProfileMeasurements> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PROFILE_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "이 옆모습 사진에서 코와 귀 위치를 재줘." },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
        ],
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const bridgeRatio = clamp(toNumber(parsed.bridgeHeightRatio) ?? 0.6, 0, 3);
  const earRatio = clamp(toNumber(parsed.earToEyeOffsetRatio) ?? 0, -3, 3);

  return {
    bridgeHeightMm: Math.round(bridgeRatio * IRIS_WIDTH_MM * 10) / 10,
    bridgeAngleDeg: Math.round(clamp(toNumber(parsed.bridgeAngleDeg) ?? 30, 5, 70)),
    earToEyeOffsetMm: Math.round(earRatio * IRIS_WIDTH_MM * 10) / 10,
    confidence: clamp(toNumber(parsed.confidence) ?? 0.5, 0, 1),
  };
}

const RX_SYSTEM = `너는 안경 처방전/검안표 이미지를 읽어 숫자만 정확히 옮기는 OCR 도우미다.

읽는 법:
- OD / R / 우 = 오른쪽 눈, OS / L / 좌 = 왼쪽 눈
- S 또는 SPH = 구면 도수 (근시는 음수, 원시는 양수)
- C 또는 CYL = 원주(난시) 도수, AX 또는 AXIS = 난시 축 (0~180 정수)
- ADD = 가입도(노안), PD = 동공 간 거리(mm, 보통 55~75)
- 시력(1.0, 0.8 등)은 도수가 아니다. SPH 자리에 넣지 마라.

반드시 지킬 것:
- 값을 추측해서 만들어내지 않는다. 안 보이거나 확신이 없으면 null로 두고 warnings에 이유를 한국어로 적는다.
- 부호(+/-)를 반드시 확인한다. 부호가 불확실하면 null로 두고 warnings에 적는다.
- 진단명이나 질환 소견은 옮기지 않는다. 숫자만 본다.

아래 JSON 형식으로만 응답한다:
{
  "right": {"sph": 숫자 또는 null, "cyl": 숫자 또는 null, "axis": 숫자 또는 null},
  "left":  {"sph": 숫자 또는 null, "cyl": 숫자 또는 null, "axis": 숫자 또는 null},
  "add": 숫자 또는 null,
  "pd": 숫자 또는 null,
  "measuredAt": "YYYY-MM-DD" 또는 null,
  "warnings": ["확인이 필요한 항목에 대한 한국어 설명", ...]
}`;

/** 도수 범위를 벗어난 값은 오독으로 보고 버린다. */
function sanitizeEye(raw: unknown): { sph: number | null; cyl: number | null; axis: number | null } {
  const eye = (raw ?? {}) as Record<string, unknown>;
  const sph = toNumber(eye.sph);
  const cyl = toNumber(eye.cyl);
  const axis = toNumber(eye.axis);
  return {
    sph: sph != null && Math.abs(sph) <= 25 ? sph : null,
    cyl: cyl != null && Math.abs(cyl) <= 10 ? cyl : null,
    axis: axis != null && axis >= 0 && axis <= 180 ? Math.round(axis) : null,
  };
}

/**
 * 처방전/검안표 이미지에서 도수를 읽는다.
 *
 * 이 값은 "매장에서 확인할 초안"이지 확정 처방이 아니다.
 * 최종 도수는 안경사의 검안으로 확정된다.
 */
export async function readPrescription(imageDataUrl: string): Promise<Prescription> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: RX_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "이 처방전에서 도수 값을 읽어줘." },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
        ],
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const right = sanitizeEye(parsed.right);
  const left = sanitizeEye(parsed.left);
  const add = toNumber(parsed.add);
  const pd = toNumber(parsed.pd);

  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.filter((w): w is string => typeof w === "string").slice(0, 6)
    : [];

  if (right.sph == null || left.sph == null) {
    warnings.push("양쪽 구면 도수(SPH)를 모두 읽지 못했습니다. 직접 입력으로 확인해주세요.");
  }

  const measuredAt =
    typeof parsed.measuredAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.measuredAt)
      ? parsed.measuredAt
      : null;

  return {
    right,
    left,
    add: add != null && add >= 0 && add <= 4 ? add : null,
    pd: pd != null && pd >= 45 && pd <= 80 ? pd : null,
    measuredAt,
    source: "ocr",
    warnings,
  };
}
