import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ageTierFromBirthYear } from "@/lib/depth";
import { generateRandomTopic, generateTopicImage } from "@/lib/openai";

const schema = z.object({
  sessionId: z.string().min(1),
  memberId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
  }
  const { sessionId, memberId } = parsed.data;

  const session = await prisma.daySession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });

  let ageTier = "child" as ReturnType<typeof ageTierFromBirthYear>;
  if (memberId) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (member) ageTier = ageTierFromBirthYear(member.birthYear);
  }

  try {
    const topic = await generateRandomTopic({ ageTier });

    let topicImageUrl: string | null = null;
    try {
      const b64 = await generateTopicImage(topic.imagePrompt);
      // 서버리스 배포(Vercel)는 파일시스템에 쓸 수 없으므로 base64 data URL로 DB에 바로 저장한다.
      topicImageUrl = `data:image/png;base64,${b64}`;
    } catch (imgErr) {
      // 이미지 생성에 실패해도(예: 이미지 API 미지원/크레딧 부족) 주제와 질문은 진행한다.
      console.error("이미지 생성 실패:", imgErr);
    }

    const updatedSession = await prisma.daySession.update({
      where: { id: sessionId },
      data: {
        topic: topic.theme,
        topicImageUrl,
        topicSource: "ai-random",
      },
    });

    const aiMessage = await prisma.message.create({
      data: {
        sessionId,
        role: "ai",
        content: topic.openingQuestion,
        depthLevel: topic.depthLevel,
        depthLabel: topic.depthLabel,
      },
    });

    return NextResponse.json({ session: updatedSession, aiMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "주제 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
