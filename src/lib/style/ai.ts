import OpenAI from "openai";
import { z } from "zod";

import { normalizeHex } from "./color";
import type { BodyDiagnosis, PersonalColorType, StyleRecommendation } from "./types";

let client: OpenAI | null = null;

export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다.");
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const VISION_MODEL = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const TEXT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

async function askJson(params: {
  system: string;
  userText: string;
  imageDataUrl?: string;
  model: string;
}): Promise<unknown> {
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: params.userText },
  ];
  if (params.imageDataUrl) {
    content.push({ type: "image_url", image_url: { url: params.imageDataUrl, detail: "low" } });
  }

  const completion = await getClient().chat.completions.create({
    model: params.model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.system },
      { role: "user", content },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ── 얼굴 사진에서 피부·머리·눈·입술 색 추출 ───────────────────────────────────

const faceSchema = z.object({
  skinHex: z.string(),
  hairHex: z.string().optional(),
  eyeHex: z.string().optional(),
  lipHex: z.string().optional(),
  undertone: z.enum(["warm", "cool", "neutral"]).optional(),
  contrast: z.enum(["low", "medium", "high"]).optional(),
  lightingWarning: z.string().optional(),
  note: z.string().optional(),
});

export type FaceReading = z.infer<typeof faceSchema>;

export async function readFacePhoto(imageDataUrl: string): Promise<FaceReading> {
  const system = [
    "당신은 퍼스널컬러 진단을 위해 사진에서 색을 측정하는 도구입니다.",
    "사람을 평가하거나 외모를 품평하지 말고, 오직 화면에 보이는 색만 측정해서 보고하세요.",
    "조명 색온도의 영향을 고려해 화이트 밸런스를 보정한 값으로 답하세요.",
    "반드시 아래 JSON 스키마로만 답합니다:",
    '{"skinHex":"#RRGGBB","hairHex":"#RRGGBB","eyeHex":"#RRGGBB","lipHex":"#RRGGBB",',
    '"undertone":"warm|cool|neutral","contrast":"low|medium|high","lightingWarning":"조명 문제가 있으면 한 문장, 없으면 빈 문자열","note":"측정 요약 한 문장(한국어)"}',
  ].join("\n");

  const userText = [
    "이 사진에서 다음 색을 측정해 주세요.",
    "- skinHex: 볼과 이마의 그늘지지 않은 부분의 평균 피부색",
    "- hairHex: 빛 반사를 제외한 모발의 중간 톤",
    "- eyeHex: 홍채의 중간 톤",
    "- lipHex: 입술 중앙(립스틱을 발랐다면 그 색이라고 note에 적어주세요)",
    "- undertone: 피부의 언더톤(노란기 우세=warm, 푸른기·붉은기 우세=cool)",
    "- contrast: 피부와 모발·눈동자 밝기 차이",
  ].join("\n");

  const parsed = faceSchema.safeParse(
    await askJson({ system, userText, imageDataUrl, model: VISION_MODEL }),
  );
  if (!parsed.success) throw new Error("사진에서 색을 읽지 못했습니다. 다른 사진으로 시도해 주세요.");

  const clean = (hex?: string) => normalizeHex(hex ?? "") ?? undefined;
  const skin = clean(parsed.data.skinHex);
  if (!skin) throw new Error("피부색을 인식하지 못했습니다. 얼굴이 크게 나온 사진을 사용해 주세요.");

  return {
    ...parsed.data,
    skinHex: skin,
    hairHex: clean(parsed.data.hairHex),
    eyeHex: clean(parsed.data.eyeHex),
    lipHex: clean(parsed.data.lipHex),
  };
}

// ── 전신 사진에서 신체 비율 추정 ─────────────────────────────────────────────

const bodySchema = z.object({
  headLengthRatio: z.number().min(0.05).max(0.25), // 키 대비 머리 길이
  faceLengthRatio: z.number().min(0.04).max(0.2).optional(),
  legLengthRatio: z.number().min(0.3).max(0.6), // 키 대비 다리(골반~바닥) 길이
  armLengthRatio: z.number().min(0.2).max(0.45).optional(),
  shoulderWidthRatio: z.number().min(0.15).max(0.35).optional(), // 키 대비 어깨너비
  shoulderToHipWidth: z.number().min(0.5).max(2).optional(), // 어깨 폭 ÷ 골반 폭
  waistToHipWidth: z.number().min(0.5).max(1.5).optional(),
  poseWarning: z.string().optional(),
  note: z.string().optional(),
});

export type BodyReading = z.infer<typeof bodySchema>;

export async function readBodyPhoto(imageDataUrl: string): Promise<BodyReading> {
  const system = [
    "당신은 전신 사진에서 인체 비율을 추정하는 측정 도구입니다.",
    "체형을 평가하거나 외모를 품평하지 말고, 길이 비율만 숫자로 보고하세요.",
    "모든 값은 '키(머리 끝~발바닥)를 1'로 놓았을 때의 비율입니다.",
    "카메라 각도로 왜곡이 있으면 poseWarning에 적어주세요.",
    "반드시 JSON으로만 답합니다.",
  ].join("\n");

  const userText = [
    "이 전신 사진에서 다음 비율을 추정해 주세요(키=1 기준).",
    "- headLengthRatio: 정수리에서 턱끝까지 (보통 0.12~0.15)",
    "- faceLengthRatio: 헤어라인에서 턱끝까지",
    "- legLengthRatio: 다리가 시작되는 골반 지점에서 바닥까지 (보통 0.43~0.48)",
    "- armLengthRatio: 어깨 끝에서 손목까지 (보통 0.29~0.32)",
    "- shoulderWidthRatio: 어깨 좌우 폭",
    "- shoulderToHipWidth: 어깨 폭 ÷ 골반 폭",
    "- waistToHipWidth: 허리 폭 ÷ 골반 폭",
  ].join("\n");

  const parsed = bodySchema.safeParse(
    await askJson({ system, userText, imageDataUrl, model: VISION_MODEL }),
  );
  if (!parsed.success)
    throw new Error("전신 사진에서 비율을 읽지 못했습니다. 전신이 모두 나온 사진을 사용해 주세요.");
  return parsed.data;
}

// 사진에서 읽은 비율을 실제 cm 계측값으로 환산한다.
export function bodyReadingToMeasurements(reading: BodyReading, height: number) {
  const cm = (ratio?: number) => (typeof ratio === "number" ? Number((ratio * height).toFixed(1)) : undefined);
  const shoulderWidth = cm(reading.shoulderWidthRatio);
  // 폭 비율만 알 수 있으므로 둘레는 어깨너비를 기준으로 상대 환산한다(절대 수치가 아닌 균형용).
  const hip =
    shoulderWidth && reading.shoulderToHipWidth
      ? Number(((shoulderWidth * 2.2) / reading.shoulderToHipWidth).toFixed(1))
      : undefined;
  const waist = hip && reading.waistToHipWidth ? Number((hip * reading.waistToHipWidth).toFixed(1)) : undefined;

  return {
    headLength: cm(reading.headLengthRatio),
    faceLength: cm(reading.faceLengthRatio),
    legLength: cm(reading.legLengthRatio),
    armLength: cm(reading.armLengthRatio),
    shoulderWidth,
    hip,
    waist,
  };
}

// ── 스타일리스트 코멘트 ─────────────────────────────────────────────────────

const noteSchema = z.object({
  summary: z.string(),
  shoppingTips: z.array(z.string()).max(6).optional(),
});

export async function stylistNote(params: {
  colorType: PersonalColorType;
  body: BodyDiagnosis;
  recommendation: StyleRecommendation;
}): Promise<{ summary: string; shoppingTips: string[] }> {
  const { colorType, body, recommendation } = params;

  const system = [
    "당신은 한국어로 조언하는 퍼스널 스타일리스트입니다.",
    "주어진 진단 수치는 이미 확정된 값이므로 바꾸지 말고, 그 수치를 근거로 설명하세요.",
    "몸에 대해 평가·비하하는 표현을 쓰지 말고, 무엇을 입으면 되는지만 담백하게 알려주세요.",
    "새로운 색을 지어내지 말고 반드시 주어진 팔레트의 HEX만 인용하세요.",
    '반드시 JSON으로만 답합니다: {"summary":"6~8문장 요약","shoppingTips":["쇼핑할 때 확인할 것 4~6개"]}',
  ].join("\n");

  const payload = {
    퍼스널컬러: {
      타입: colorType.name,
      설명: colorType.subtitle,
      베스트: colorType.best.slice(0, 8).map((c) => `${c.name} ${c.hex}`),
      피할색: colorType.avoid.slice(0, 4).map((c) => `${c.name} ${c.hex}`),
      메탈: colorType.metal.map((c) => c.name),
    },
    체형: {
      키: body.height,
      등신: body.headUnits,
      체형: body.shape.name,
      골격: body.frame.name,
      상하체비율: body.upperLower.join(" : "),
      비율표: body.ratios.map((r) => `${r.label}: ${r.display} (${r.bandLabel})`),
    },
    계산된치수: recommendation.sizing.map((s) => `${s.label}: ${s.value}`),
    규칙: recommendation.silhouetteRules.slice(0, 6),
  };

  const parsed = noteSchema.safeParse(
    await askJson({
      system,
      userText: `아래 진단 결과를 바탕으로 이 사람이 옷을 살 때 바로 쓸 수 있는 요약을 써주세요.\n${JSON.stringify(
        payload,
        null,
        2,
      )}`,
      model: TEXT_MODEL,
    }),
  );

  if (!parsed.success) throw new Error("스타일 코멘트를 생성하지 못했습니다.");
  return { summary: parsed.data.summary, shoppingTips: parsed.data.shoppingTips ?? [] };
}
