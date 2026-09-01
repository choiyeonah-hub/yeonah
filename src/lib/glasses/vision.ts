import { getOpenAI } from "../openai";
import { FACE_SHAPE_IDS, FACE_SHAPES } from "./faceShapes";
import type { FaceAnalysis, FaceShapeId, Prescription } from "./types";

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
  "confidence": 0~1 숫자
}`;

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
    confidence: clamp(toNumber(parsed.confidence) ?? 0.5, 0, 1),
    source: "ai",
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
