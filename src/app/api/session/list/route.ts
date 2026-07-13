import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId가 필요합니다." }, { status: 400 });

  try {
    const sessions = await prisma.daySession.findMany({
      where: { familyId, messages: { some: {} } },
      orderBy: { date: "desc" },
      take: 60,
      select: {
        id: true,
        date: true,
        topic: true,
        topicSource: true,
        // 목록은 이미지 원본(base64)을 내려보내지 않는다 — 응답 크기를 작게 유지하기 위함.
        _count: { select: { messages: true } },
        messages: { select: { role: true, depthLevel: true } },
      },
    });

    const list = sessions.map((s) => {
      const aiDepths = s.messages.filter((m) => m.role === "ai" && m.depthLevel != null).map((m) => m.depthLevel!);
      const avgDepth = aiDepths.length ? aiDepths.reduce((a, b) => a + b, 0) / aiDepths.length : null;
      return {
        id: s.id,
        date: s.date,
        topic: s.topic,
        topicSource: s.topicSource,
        messageCount: s._count.messages,
        avgDepth,
      };
    });

    return NextResponse.json({ sessions: list });
  } catch (err) {
    console.error("기록 목록 조회 실패:", err);
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: `기록을 불러오지 못했습니다: ${message}` }, { status: 500 });
  }
}
