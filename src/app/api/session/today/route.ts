import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayKstString } from "@/lib/date";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId가 필요합니다." }, { status: 400 });

  const date = todayKstString();

  let session = await prisma.daySession.findUnique({
    where: { familyId_date: { familyId, date } },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { member: true } },
    },
  });

  if (!session) {
    session = await prisma.daySession.create({
      data: { familyId, date, topicSource: "user" },
      include: {
        messages: { orderBy: { createdAt: "asc" }, include: { member: true } },
      },
    });
  }

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: { members: true },
  });

  if (!family) return NextResponse.json({ error: "가족을 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json({ session, family });
}
