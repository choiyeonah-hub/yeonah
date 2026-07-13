import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId가 필요합니다." }, { status: 400 });

  const sessions = await prisma.daySession.findMany({
    where: { familyId, messages: { some: {} } },
    orderBy: { date: "desc" },
    include: { messages: true },
    take: 60,
  });

  const list = sessions.map((s) => {
    const aiDepths = s.messages.filter((m) => m.role === "ai" && m.depthLevel != null).map((m) => m.depthLevel!);
    const avgDepth = aiDepths.length ? aiDepths.reduce((a, b) => a + b, 0) / aiDepths.length : null;
    return {
      id: s.id,
      date: s.date,
      topic: s.topic,
      topicImageUrl: s.topicImageUrl,
      topicSource: s.topicSource,
      messageCount: s.messages.length,
      avgDepth,
    };
  });

  return NextResponse.json({ sessions: list });
}
