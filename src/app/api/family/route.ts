import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateFamilyCode } from "@/lib/familyCode";

const createSchema = z.object({
  action: z.literal("create"),
  familyName: z.string().min(1).max(30),
  nickname: z.string().min(1).max(20),
  role: z.enum(["parent", "child"]),
  birthYear: z.number().int().min(1930).max(new Date().getFullYear()).nullable().optional(),
});

const joinSchema = z.object({
  action: z.literal("join"),
  code: z.string().min(4).max(10),
  nickname: z.string().min(1).max(20),
  role: z.enum(["parent", "child"]),
  birthYear: z.number().int().min(1930).max(new Date().getFullYear()).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  if (body.action === "create") {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
    }
    const { familyName, nickname, role, birthYear } = parsed.data;

    let code = generateFamilyCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = await prisma.family.findUnique({ where: { code } });
      if (!existing) break;
      code = generateFamilyCode();
    }

    const family = await prisma.family.create({
      data: {
        name: familyName,
        code,
        members: {
          create: { nickname, role, birthYear: birthYear ?? null },
        },
      },
      include: { members: true },
    });

    return NextResponse.json({ family, member: family.members[0] });
  }

  if (body.action === "join") {
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
    }
    const { code, nickname, role, birthYear } = parsed.data;

    const family = await prisma.family.findUnique({ where: { code: code.toUpperCase() } });
    if (!family) {
      return NextResponse.json({ error: "가족 코드를 찾을 수 없습니다. 코드를 다시 확인해주세요." }, { status: 404 });
    }

    const member = await prisma.member.create({
      data: { familyId: family.id, nickname, role, birthYear: birthYear ?? null },
    });

    return NextResponse.json({ family, member });
  }

  return NextResponse.json({ error: "action은 create 또는 join이어야 합니다." }, { status: 400 });
}
