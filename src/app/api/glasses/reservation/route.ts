import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { FACE_SHAPE_IDS } from "@/lib/glasses/faceShapes";
import { findFrame } from "@/lib/glasses/frames";
import { LENS_INDEX_IDS, LENS_OPTION_IDS } from "@/lib/glasses/lenses";
import { buildQuotes, findStore } from "@/lib/glasses/stores";
import type { FaceShapeId, LensIndexId, LensOptionId } from "@/lib/glasses/types";

export const dynamic = "force-dynamic";

const eyeSchema = z.object({
  sph: z.number().min(-25).max(25).nullable(),
  cyl: z.number().min(-10).max(10).nullable(),
  axis: z.number().min(0).max(180).nullable(),
});

const schema = z.object({
  frameId: z.string().min(1),
  storeId: z.string().min(1),
  lensIndex: z.enum(LENS_INDEX_IDS as [LensIndexId, ...LensIndexId[]]),
  lensOptions: z.array(z.enum(LENS_OPTION_IDS as [LensOptionId, ...LensOptionId[]])).max(10),
  contactName: z.string().min(1, "이름을 입력해주세요.").max(30),
  contactPhone: z
    .string()
    .regex(/^01[016789][-]?\d{3,4}[-]?\d{4}$/, "휴대폰 번호 형식을 확인해주세요."),
  face: z
    .object({
      faceShape: z.enum(FACE_SHAPE_IDS as [FaceShapeId, ...FaceShapeId[]]),
      summary: z.string().max(2000),
      metrics: z.record(z.union([z.string(), z.number()])),
    })
    .nullable()
    .optional(),
  // 도수는 민감정보라, 이 동의가 true일 때만 저장한다.
  sensitiveConsent: z.boolean(),
  prescription: z
    .object({
      right: eyeSchema,
      left: eyeSchema,
      add: z.number().min(0).max(4).nullable(),
      pd: z.number().min(45).max(80).nullable(),
      measuredAt: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

/** 사람이 매장에서 부르기 쉬운 6자리 코드. 헷갈리는 글자(0/O/1/I)는 뺀다. */
function reservationCode(): string {
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

  const frame = findFrame(data.frameId);
  const store = findStore(data.storeId);
  if (!frame) return NextResponse.json({ error: "테를 찾을 수 없습니다." }, { status: 404 });
  if (!store) return NextResponse.json({ error: "안경원을 찾을 수 없습니다." }, { status: 404 });

  // 금액은 클라이언트가 보낸 값을 믿지 않고 서버에서 다시 계산한다.
  const quote = buildQuotes({
    frameId: data.frameId,
    lensIndex: data.lensIndex,
    lensOptions: data.lensOptions,
  }).find((q) => q.storeId === data.storeId);
  if (!quote) return NextResponse.json({ error: "견적을 계산하지 못했습니다." }, { status: 500 });

  try {
    // 코드 충돌은 사실상 없지만, 만에 하나 겹치면 몇 번 더 뽑는다.
    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      const code = reservationCode();
      const existing = await prisma.fitReservation.findUnique({ where: { code } });
      if (existing) continue;
      created = await prisma.fitReservation.create({
        data: {
          code,
          faceShape: data.face?.faceShape ?? null,
          faceSummary: data.face?.summary ?? null,
          faceMetrics: data.face?.metrics ?? undefined,
          frameId: data.frameId,
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
        },
      });
    }
    if (!created) {
      return NextResponse.json({ error: "예약 코드를 만들지 못했습니다. 다시 시도해주세요." }, { status: 500 });
    }

    return NextResponse.json({ code: created.code, totalPrice: created.totalPrice });
  } catch (err) {
    console.error("예약 생성 실패:", err);
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: `예약을 저장하지 못했습니다: ${message}` }, { status: 500 });
  }
}
