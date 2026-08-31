import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { bodyReadingToMeasurements, isAiEnabled, readBodyPhoto, readFacePhoto } from "@/lib/style/ai";

export const maxDuration = 60;

const schema = z.object({
  kind: z.enum(["face", "body"]),
  // 클라이언트에서 긴 변 768px로 줄인 뒤 보내는 data URL.
  image: z.string().startsWith("data:image/").max(6_000_000),
  height: z.number().min(120).max(220).optional(),
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

  if (!isAiEnabled()) {
    return NextResponse.json(
      {
        error:
          "사진 분석은 OPENAI_API_KEY가 있어야 합니다. 키 없이 쓰려면 '사진 없이 문진으로 진단'과 '직접 측정 입력'을 이용해주세요.",
      },
      { status: 503 },
    );
  }

  try {
    if (parsed.data.kind === "face") {
      const reading = await readFacePhoto(parsed.data.image);
      return NextResponse.json({ face: reading });
    }

    if (!parsed.data.height) {
      return NextResponse.json({ error: "전신 사진 분석에는 키(cm)가 필요합니다." }, { status: 400 });
    }
    const reading = await readBodyPhoto(parsed.data.image);
    return NextResponse.json({
      body: reading,
      measurements: bodyReadingToMeasurements(reading, parsed.data.height),
    });
  } catch (error) {
    console.error("[style] 사진 분석 실패:", error);
    const message = error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
