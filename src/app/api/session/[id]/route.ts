import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await prisma.daySession.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { member: true } },
    },
  });
  if (!session) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ session });
}
