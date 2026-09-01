import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findFrame } from "@/lib/glasses/frames";
import { LENS_INDEX_IDS, LENS_OPTION_IDS } from "@/lib/glasses/lenses";
import { buildQuotes, STORES } from "@/lib/glasses/stores";
import type { LensIndexId, LensOptionId } from "@/lib/glasses/types";

const schema = z.object({
  frameId: z.string().min(1),
  lensIndex: z.enum(LENS_INDEX_IDS as [LensIndexId, ...LensIndexId[]]),
  lensOptions: z.array(z.enum(LENS_OPTION_IDS as [LensOptionId, ...LensOptionId[]])).max(10),
  region: z.string().nullable().optional(),
  kind: z.enum(["체인", "동네"]).nullable().optional(),
});

/** 선택한 테+렌즈로 매장별 예상 견적을 계산해 싼 순으로 돌려준다. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 }
    );
  }

  const frame = findFrame(parsed.data.frameId);
  if (!frame) return NextResponse.json({ error: "테를 찾을 수 없습니다." }, { status: 404 });

  const quotes = buildQuotes(parsed.data);
  return NextResponse.json({ quotes, stores: STORES, frame });
}
