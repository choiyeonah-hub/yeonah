import { prisma } from "../../db";
import { isDbConfigured } from "../store";
import type { Product } from "./types";

// 쿠팡 파트너스 검색 API는 시간당 10회 제한이라, 캐시와 호출 카운트가 기능의 전제다.
// Postgres가 있으면 인스턴스 간에 공유되는 캐시를, 없으면 프로세스 메모리를 쓴다.

const TTL_MS = Number(process.env.SHOP_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000); // 기본 6시간
const HOURLY_LIMIT = Number(process.env.COUPANG_SEARCH_HOURLY_LIMIT ?? 10);

type Entry = { products: Product[]; fetchedAt: number };

const memoryCache = new Map<string, Entry>();

export function cacheKey(keyword: string, limit: number): string {
  return `coupang:${keyword.trim().toLowerCase()}:${limit}`;
}

export async function readCache(key: string): Promise<Entry | null> {
  if (isDbConfigured()) {
    try {
      const row = await prisma.productCache.findUnique({ where: { key } });
      if (row) {
        return { products: row.payload as unknown as Product[], fetchedAt: row.fetchedAt.getTime() };
      }
    } catch (error) {
      console.error("[shop] 캐시 조회 실패:", error);
    }
  }
  return memoryCache.get(key) ?? null;
}

export async function writeCache(key: string, products: Product[]): Promise<void> {
  const entry: Entry = { products, fetchedAt: Date.now() };
  memoryCache.set(key, entry);
  if (!isDbConfigured()) return;
  try {
    await prisma.productCache.upsert({
      where: { key },
      create: { key, payload: products as unknown as object },
      update: { payload: products as unknown as object, fetchedAt: new Date() },
    });
  } catch (error) {
    console.error("[shop] 캐시 저장 실패:", error);
  }
}

export function isFresh(entry: Entry): boolean {
  return Date.now() - entry.fetchedAt < TTL_MS;
}

// 최근 1시간 안에 실제로 API를 몇 번 호출했는지 센다.
const memoryCalls: number[] = [];

export async function remainingCalls(): Promise<number> {
  const since = Date.now() - 60 * 60 * 1000;

  if (isDbConfigured()) {
    try {
      const used = await prisma.productCache.count({ where: { fetchedAt: { gte: new Date(since) } } });
      return Math.max(0, HOURLY_LIMIT - used);
    } catch (error) {
      console.error("[shop] 호출 수 확인 실패:", error);
    }
  }

  while (memoryCalls.length > 0 && memoryCalls[0] < since) memoryCalls.shift();
  return Math.max(0, HOURLY_LIMIT - memoryCalls.length);
}

export function recordCall(): void {
  memoryCalls.push(Date.now());
}
