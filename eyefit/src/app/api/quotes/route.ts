import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { quoteReportSchema } from "@/lib/schemas";
import { priceStats, type PriceStats } from "@/lib/stats";
import { LENS_INDEX_IDS } from "@/lib/lenses";

export const dynamic = "force-dynamic";

/** 굴절률별(그리고 지역이 주어지면 그 지역의) 렌즈 값 분포. */
export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region");
  const progressive = req.nextUrl.searchParams.get("progressive") === "true";

  try {
    const rows = await prisma.lensQuoteReport.findMany({
      where: {
        ...(region ? { region } : {}),
        progressive,
      },
      select: { lensIndex: true, lensPrice: true, region: true },
    });

    const byIndex: Record<string, PriceStats | null> = {};
    for (const index of LENS_INDEX_IDS) {
      byIndex[index] = priceStats(
        rows.filter((r) => r.lensIndex === index).map((r) => r.lensPrice)
      );
    }

    const regions = Array.from(new Set(rows.map((r) => r.region))).sort();
    return NextResponse.json({ byIndex, total: rows.length, regions });
  } catch (err) {
    console.error("견적 통계 조회 실패:", err);
    return NextResponse.json(
      { error: "제보 통계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}

/** 실제로 지불한 렌즈 값 제보. 도수는 받지 않는다. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = quoteReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 }
    );
  }

  try {
    await prisma.lensQuoteReport.create({ data: parsed.data });
    // 방금 제보한 사람에게 바로 비교를 보여주려고, 같은 굴절률의 분포를 함께 돌려준다.
    const rows = await prisma.lensQuoteReport.findMany({
      where: { lensIndex: parsed.data.lensIndex, progressive: parsed.data.progressive },
      select: { lensPrice: true },
    });
    return NextResponse.json({
      ok: true,
      stats: priceStats(rows.map((r) => r.lensPrice)),
      lensIndex: parsed.data.lensIndex,
    });
  } catch (err) {
    console.error("견적 제보 저장 실패:", err);
    return NextResponse.json({ error: "제보를 저장하지 못했습니다." }, { status: 500 });
  }
}
