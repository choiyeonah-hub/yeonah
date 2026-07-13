import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayKstString, dateStringNDaysAgo } from "@/lib/date";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId");
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!familyId) return NextResponse.json({ error: "familyId가 필요합니다." }, { status: 400 });

  const today = todayKstString();

  const [todaySession, familyAgg, memberAgg] = await Promise.all([
    prisma.daySession.findUnique({
      where: { familyId_date: { familyId, date: today } },
      include: { messages: true },
    }),
    prisma.message.aggregate({
      where: { role: "ai", depthLevel: { not: null }, session: { familyId } },
      _avg: { depthLevel: true },
      _count: { depthLevel: true },
    }),
    memberId
      ? prisma.message.aggregate({
          where: { role: "ai", depthLevel: { not: null }, memberId },
          _avg: { depthLevel: true },
          _count: { depthLevel: true },
        })
      : Promise.resolve(null),
  ]);

  const todayAiMessages = (todaySession?.messages ?? []).filter(
    (m) => m.role === "ai" && m.depthLevel != null
  );
  const todayAvgDepth =
    todayAiMessages.length > 0
      ? todayAiMessages.reduce((sum, m) => sum + (m.depthLevel ?? 0), 0) / todayAiMessages.length
      : null;

  // 최근 30일 내에서, 메시지가 있는 날짜들을 기준으로 오늘부터 거꾸로 연속 참여일수를 센다.
  const sessionsWithMessages = await prisma.daySession.findMany({
    where: {
      familyId,
      date: { gte: dateStringNDaysAgo(30) },
      messages: { some: {} },
    },
    select: { date: true },
  });
  const activeDates = new Set(sessionsWithMessages.map((s) => s.date));
  let streakDays = 0;
  for (let i = 0; i < 30; i++) {
    const d = dateStringNDaysAgo(i, today);
    if (activeDates.has(d)) streakDays++;
    else break;
  }

  return NextResponse.json({
    today: {
      date: today,
      avgDepth: todayAvgDepth,
      questionCount: todayAiMessages.length,
    },
    family: {
      avgDepth: familyAgg._avg.depthLevel,
      totalQuestions: familyAgg._count.depthLevel,
      streakDays,
    },
    member: memberAgg
      ? {
          avgDepth: memberAgg._avg.depthLevel,
          totalQuestions: memberAgg._count.depthLevel,
        }
      : null,
  });
}
