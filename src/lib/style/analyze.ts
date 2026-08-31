import { z } from "zod";

import { isAiEnabled, stylistNote } from "./ai";
import { diagnoseBody } from "./body";
import { diagnoseColor, getColorType } from "./personalColor";
import { buildRecommendation } from "./recommend";
import type { StyleProfileResult } from "./types";

const hex = z
  .string()
  .regex(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "HEX 색상 형식이 아닙니다");

export const analyzeRequestSchema = z.object({
  color: z.object({
    source: z.enum(["photo", "quiz"]),
    measured: z
      .object({
        skin: hex.optional(),
        hair: hex.optional(),
        eye: hex.optional(),
        lip: hex.optional(),
      })
      .optional(),
    quizAnswers: z.record(z.string()).optional(),
    aiUndertoneHint: z.enum(["warm", "cool", "neutral"]).optional(),
    aiNote: z.string().max(500).optional(),
  }),
  body: z.object({
    source: z.enum(["manual", "photo"]).default("manual"),
    gender: z.enum(["female", "male", "other"]),
    height: z.number().min(120).max(220),
    weight: z.number().min(25).max(200).optional(),
    headLength: z.number().min(10).max(35).optional(),
    faceLength: z.number().min(8).max(30).optional(),
    faceWidth: z.number().min(8).max(25).optional(),
    shoulderWidth: z.number().min(25).max(60).optional(),
    bust: z.number().min(60).max(150).optional(),
    waist: z.number().min(45).max(150).optional(),
    hip: z.number().min(60).max(160).optional(),
    legLength: z.number().min(50).max(120).optional(),
    armLength: z.number().min(35).max(80).optional(),
    frame: z
      .object({
        wrist: z.enum(["thin", "medium", "thick"]),
        collarbone: z.enum(["hidden", "slight", "prominent"]),
        fleshiness: z.enum(["upper", "even", "lower"]),
      })
      .optional(),
  }),
  useAi: z.boolean().default(true),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// 진단의 본체. AI가 없어도(키 미설정·호출 실패) 결과는 항상 완성된다.
export async function runAnalysis(request: AnalyzeRequest): Promise<StyleProfileResult> {
  const notes: string[] = [];

  const color = diagnoseColor({
    source: request.color.source,
    measured: request.color.measured,
    quizAnswers: request.color.quizAnswers,
    aiNote: request.color.aiNote,
    aiUndertoneHint: request.color.aiUndertoneHint,
  });
  const colorType = getColorType(color.typeId);

  const { source, ...bodyInput } = request.body;
  const body = diagnoseBody(bodyInput, source);
  const recommendation = buildRecommendation(colorType, color, body);

  if (body.estimatedFields.length > 0) {
    notes.push(
      `직접 재지 않은 항목(${body.estimatedFields.join(", ")})은 키·성별 평균으로 추정했습니다. 실제 치수를 넣으면 결과가 더 정확해집니다.`,
    );
  }
  if (color.confidence < 60) {
    notes.push(
      `퍼스널컬러 확신도가 ${color.confidence}%로 낮습니다. 2순위 타입(${getColorType(
        color.runnerUpId,
      ).name})의 팔레트도 함께 비교해 보세요.`,
    );
  }

  let aiUsed = false;
  if (request.useAi && isAiEnabled()) {
    try {
      const note = await stylistNote({ colorType, body, recommendation });
      recommendation.aiStylistNote = note.summary;
      if (note.shoppingTips.length > 0) {
        recommendation.silhouetteRules.push(...note.shoppingTips.map((tip) => `쇼핑 팁 · ${tip}`));
      }
      aiUsed = true;
    } catch (error) {
      console.error("[style] 스타일 코멘트 생성 실패:", error);
      notes.push("AI 스타일 코멘트는 생성하지 못했지만, 진단과 추천은 모두 계산된 결과입니다.");
    }
  } else if (request.useAi && !isAiEnabled()) {
    notes.push("OPENAI_API_KEY가 없어 AI 코멘트 없이 계산 결과만 보여줍니다.");
  }

  return { color, colorType, body, recommendation, aiUsed, notes };
}
