import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ageTierFromBirthYear, DepthLevel } from "@/lib/depth";
import { ConversationTurn, generateFollowUpQuestion } from "@/lib/openai";

const schema = z.object({
  sessionId: z.string().min(1),
  memberId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
  }
  const { sessionId, memberId, content } = parsed.data;

  let session, member, userMessage;
  try {
    [session, member] = await Promise.all([
      prisma.daySession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: "asc" }, include: { member: true } } },
      }),
      prisma.member.findUnique({ where: { id: memberId } }),
    ]);

    if (!session) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
    if (!member) return NextResponse.json({ error: "가족 구성원을 찾을 수 없습니다." }, { status: 404 });

    userMessage = await prisma.message.create({
      data: { sessionId, memberId, role: "user", content },
    });

    if (!session.topic) {
      await prisma.daySession.update({
        where: { id: sessionId },
        data: { topic: content.slice(0, 40) },
      });
    }
  } catch (err) {
    console.error("답변 저장 실패:", err);
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: `답변을 저장하지 못했습니다: ${message}` }, { status: 500 });
  }

  const ageTier = ageTierFromBirthYear(member.birthYear);
  const history: ConversationTurn[] = session.messages.map((m) => ({
    speaker: m.member?.nickname ?? "AI",
    role: m.role === "ai" ? "ai" : "user",
    content: m.content,
  }));
  history.push({ speaker: member.nickname, role: "user", content });

  const lastAiMessage = [...session.messages].reverse().find((m) => m.role === "ai");
  const lastDepth = (lastAiMessage?.depthLevel ?? null) as DepthLevel | null;

  let aiMessage;
  try {
    const result = await generateFollowUpQuestion({
      ageTier,
      nickname: member.nickname,
      topic: session.topic,
      history,
      lastDepth,
    });

    aiMessage = await prisma.message.create({
      data: {
        sessionId,
        memberId,
        role: "ai",
        content: result.question,
        depthLevel: result.depthLevel,
        depthLabel: result.depthLabel,
      },
    });
  } catch (err) {
    console.error("질문 생성 실패:", err);
    const message = err instanceof Error ? err.message : "AI 질문 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ userMessage, error: message }, { status: 502 });
  }

  return NextResponse.json({ userMessage, aiMessage });
}
