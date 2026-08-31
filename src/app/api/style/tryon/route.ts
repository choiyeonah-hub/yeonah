import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isTryOnEnabled, runTryOn } from "@/lib/style/tryon";

export const maxDuration = 60;

const image = z
  .string()
  .max(8_000_000)
  .refine((value) => value.startsWith("data:image/") || /^https?:\/\//.test(value), {
    message: "이미지는 data URL 또는 http(s) 주소여야 합니다.",
  });

const schema = z.object({
  modelImage: image,
  garmentImage: image,
  category: z.enum(["auto", "tops", "bottoms", "one-pieces"]).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "이미지를 확인해주세요." },
      { status: 400 },
    );
  }

  if (!isTryOnEnabled()) {
    return NextResponse.json(
      {
        error:
          "가상 피팅은 FASHN_API_KEY가 있어야 동작합니다. 이미지 1장당 과금되는 외부 API라 키를 직접 발급해 넣어야 합니다.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await runTryOn({
      modelImage: parsed.data.modelImage,
      garmentImage: parsed.data.garmentImage,
      category: parsed.data.category,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[tryon] 실패:", error);
    const message = error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
