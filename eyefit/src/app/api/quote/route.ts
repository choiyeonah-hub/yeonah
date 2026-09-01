import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveFramePrice } from "@/lib/pricing";
import {
  frameSelectionSchema,
  lensIndexSchema,
  lensOptionsSchema,
} from "@/lib/schemas";
import { buildQuotes, STORES } from "@/lib/stores";

const schema = z.intersection(
  frameSelectionSchema,
  z.object({
    lensIndex: lensIndexSchema,
    lensOptions: lensOptionsSchema,
    region: z.string().max(20).nullable().optional(),
    kind: z.enum(["체인", "동네"]).nullable().optional(),
  })
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 }
    );
  }

  const resolved = resolveFramePrice(parsed.data);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 404 });
  }

  const quotes = buildQuotes({
    framePrice: resolved.framePrice,
    frameDiscountable: resolved.frameDiscountable,
    lensIndex: parsed.data.lensIndex,
    lensOptions: parsed.data.lensOptions,
    region: parsed.data.region,
    kind: parsed.data.kind,
  });

  return NextResponse.json({ quotes, stores: STORES, leadDays: resolved.leadDays });
}
