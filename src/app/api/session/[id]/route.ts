import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await prisma.daySession.findUnique({
      where: { id: params.id },
      include: {
        messages: { orderBy: { createdAt: "asc" }, include: { member: true } },
      },
    });
    if (!session) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ session });
  } catch (err) {
    console.error("세션 상세 조회 실패:", err);
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: `기록을 불러오지 못했습니다: ${message}` }, { status: 500 });
  }
}
