import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readPrescription } from "@/lib/vision";

export const runtime = "nodejs";
// 처방전 이미지는 민감정보다. 저장하지 않고, 응답도 캐시하지 않는다.
export const dynamic = "force-dynamic";

const schema = z.object({
  imageDataUrl: z
    .string()
    .startsWith("data:image/", "이미지 파일만 업로드할 수 있습니다.")
    .max(8_000_000, "이미지가 너무 큽니다. 더 작게 줄여서 올려주세요."),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 }
    );
  }

  try {
    const prescription = await readPrescription(parsed.data.imageDataUrl);
    return NextResponse.json(
      { prescription },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("처방전 판독 실패:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `처방전을 읽지 못했습니다: ${message} 도수를 직접 입력할 수 있습니다.` },
      { status: 500 }
    );
  }
}
