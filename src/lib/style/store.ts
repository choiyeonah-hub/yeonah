import { prisma } from "../db";
import type { StyleProfileResult } from "./types";

// DB 없이도 앱이 동작해야 하므로(로컬에서 키만 넣고 바로 써보는 경우),
// Postgres가 설정되지 않았으면 저장은 조용히 건너뛴다.
export function isDbConfigured(): boolean {
  return Boolean(process.env.POSTGRES_PRISMA_URL);
}

export async function saveProfile(result: StyleProfileResult): Promise<string | null> {
  if (!isDbConfigured()) return null;
  try {
    const saved = await prisma.styleProfile.create({
      data: {
        colorTypeId: result.colorType.id,
        colorTypeKo: result.colorType.name,
        height: Math.round(result.body.height),
        bodyShape: result.body.shape.name,
        payload: result as unknown as object,
      },
      select: { id: true },
    });
    return saved.id;
  } catch (error) {
    console.error("[style] 결과 저장 실패:", error);
    return null;
  }
}

export async function loadProfile(id: string): Promise<StyleProfileResult | null> {
  if (!isDbConfigured()) return null;
  try {
    const found = await prisma.styleProfile.findUnique({ where: { id } });
    if (!found) return null;
    const payload = found.payload as unknown as StyleProfileResult;
    return { ...payload, id: found.id, createdAt: found.createdAt.toISOString() };
  } catch (error) {
    console.error("[style] 결과 조회 실패:", error);
    return null;
  }
}
