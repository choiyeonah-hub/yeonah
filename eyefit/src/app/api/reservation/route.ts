import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveFramePrice } from "@/lib/pricing";
import {
  faceSchema,
  frameSelectionSchema,
  lensIndexSchema,
  lensOptionsSchema,
  prescriptionSchema,
} from "@/lib/schemas";
import { buildQuotes, findStore } from "@/lib/stores";

export const dynamic = "force-dynamic";

const schema = z.intersection(
  frameSelectionSchema,
  z.object({
    storeId: z.string().min(1),
    lensIndex: lensIndexSchema,
    lensOptions: lensOptionsSchema,
    contactName: z.string().min(1, "이름을 입력해주세요.").max(30),
    contactPhone: z
      .string()
      .regex(/^01[016789][-]?\d{3,4}[-]?\d{4}$/, "휴대폰 번호 형식을 확인해주세요."),
    face: faceSchema.nullable().optional(),
    // 도수는 민감정보라, 이 동의가 true일 때만 저장한다.
    sensitiveConsent: z.boolean(),
    prescription: prescriptionSchema.nullable().optional(),
  })
);

/** 사람이 매장에서 부르기 쉬운 6자리 코드. 헷갈리는 글자(0/O/1/I)는 뺀다. */
function orderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const store = findStore(data.storeId);
  if (!store) return NextResponse.json({ error: "안경원을 찾을 수 없습니다." }, { status: 404 });

  // 금액은 클라이언트가 보낸 값을 믿지 않고 서버에서 다시 계산한다.
  const resolved = resolveFramePrice(data);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 404 });
  }

  const quote = buildQuotes({
    framePrice: resolved.framePrice,
    frameDiscountable: resolved.frameDiscountable,
    lensIndex: data.lensIndex,
    lensOptions: data.lensOptions,
  }).find((q) => q.storeId === data.storeId);
  if (!quote) return NextResponse.json({ error: "견적을 계산하지 못했습니다." }, { status: 500 });

  // 기성품은 매장 작업 시간만, 맞춤 제작은 공장 리드타임이 더 붙는다.
  const estimatedDays = resolved.leadDays + (store.kind === "체인" ? 1 : 2);

  try {
    // 코드 충돌은 사실상 없지만, 만에 하나 겹치면 몇 번 더 뽑는다.
    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      const code = orderCode();
      if (await prisma.fitOrder.findUnique({ where: { code } })) continue;
      created = await prisma.fitOrder.create({
        data: {
          code,
          faceShape: data.face?.faceShape ?? null,
          faceSummary: data.face?.summary ?? null,
          faceMetrics: data.face?.metrics ?? undefined,
          frameMode: data.frameMode,
          frameId: data.frameMode === "stock" ? data.frameId : null,
          factoryId: data.frameMode === "custom" ? data.factoryId : null,
          customSpec: data.frameMode === "custom" ? data.customSpec ?? undefined : undefined,
          lensIndex: data.lensIndex,
          lensOptions: data.lensOptions,
          // 동의하지 않으면 도수는 저장하지 않고, 매장에서 직접 검안한다.
          prescription: data.sensitiveConsent ? data.prescription ?? undefined : undefined,
          sensitiveConsent: data.sensitiveConsent,
          storeId: data.storeId,
          framePrice: quote.framePrice,
          lensPrice: quote.lensPrice,
          totalPrice: quote.totalPrice,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          estimatedDays,
        },
      });
    }
    if (!created) {
      return NextResponse.json(
        { error: "예약 코드를 만들지 못했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json({ code: created.code, totalPrice: created.totalPrice });
  } catch (err) {
    console.error("주문 생성 실패:", err);
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: `예약을 저장하지 못했습니다: ${message}` }, { status: 500 });
  }
}
