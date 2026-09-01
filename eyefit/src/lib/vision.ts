import { getOpenAI } from "./openai";
import type { Prescription } from "./types";


const VISION_MODEL = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

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
