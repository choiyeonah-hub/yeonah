import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFacePhoto } from "@/lib/vision";

export const runtime = "nodejs";
// 얼굴 사진은 요청 처리 중에만 메모리에 존재하고, 응답 후 그대로 버려진다.
// 어떤 캐시에도 남지 않도록 동적 처리로 못박는다.
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
    const analysis = await analyzeFacePhoto(parsed.data.imageDataUrl);
    return NextResponse.json(
      { analysis },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("얼굴 분석 실패:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      {
        error: `얼굴 분석에 실패했습니다: ${message} 얼굴형을 직접 선택해서 계속 진행할 수 있습니다.`,
      },
      { status: 500 }
    );
  }
}
