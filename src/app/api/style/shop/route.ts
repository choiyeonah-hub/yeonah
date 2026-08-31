import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getColorType } from "@/lib/style/personalColor";
import { isCoupangEnabled, searchProducts } from "@/lib/style/shopping";
import type { PersonalColorId } from "@/lib/style/types";

export const maxDuration = 30;

const PERSONAL_COLOR_IDS = [
  "spring-light",
  "spring-bright",
  "spring-warm",
  "summer-light",
  "summer-mute",
  "summer-cool",
  "autumn-mute",
  "autumn-deep",
  "autumn-warm",
  "winter-bright",
  "winter-deep",
  "winter-cool",
] as const;

const schema = z.object({
  keyword: z.string().min(1).max(60),
  colorTypeId: z.enum(PERSONAL_COLOR_IDS),
  targetHex: z
    .string()
    .regex(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  try {
    const colorType = getColorType(parsed.data.colorTypeId as PersonalColorId);
    const outcome = await searchProducts(parsed.data.keyword, colorType, {
      limit: parsed.data.limit,
      targetHex: parsed.data.targetHex,
    });
    return NextResponse.json({ ...outcome, providerEnabled: isCoupangEnabled() });
  } catch (error) {
    console.error("[shop] 검색 실패:", error);
    const message = error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
