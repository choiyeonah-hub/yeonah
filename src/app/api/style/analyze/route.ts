import { NextRequest, NextResponse } from "next/server";

import { analyzeRequestSchema, runAnalysis } from "@/lib/style/analyze";
import { saveProfile } from "@/lib/style/store";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `입력값을 확인해주세요: ${issue?.path.join(".")} ${issue?.message ?? ""}`.trim() },
      { status: 400 },
    );
  }

  try {
    const result = await runAnalysis(parsed.data);
    const id = await saveProfile(result);
    return NextResponse.json({ result: { ...result, id: id ?? undefined }, savedId: id });
  } catch (error) {
    console.error("[style] 진단 실패:", error);
    const message = error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: `진단에 실패했습니다: ${message}` }, { status: 500 });
  }
}
