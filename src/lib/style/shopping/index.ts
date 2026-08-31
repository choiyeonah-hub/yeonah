import { judgeColor } from "../closet";
import { deltaE } from "../color";
import type { PersonalColorType } from "../types";
import { cacheKey, isFresh, readCache, recordCall, remainingCalls, writeCache } from "./cache";
import { colorFromTitle } from "./colorWords";
import { isCoupangEnabled, searchCoupang } from "./coupang";
import type { Product, RankedProduct, SearchOutcome } from "./types";

export { buildShopQueries, shopLinks } from "./queries";
export type { ShopQuery, ShopSlot } from "./queries";
export { isCoupangEnabled } from "./coupang";

// 상품 제목에서 읽은 색을 옷장과 똑같은 기준(ΔE)으로 판정한다.
// 옷장 판정과 쇼핑 판정이 서로 다른 잣대를 쓰면 사용자가 헷갈린다.
export function rankProducts(
  products: Product[],
  colorType: PersonalColorType,
  targetHex?: string,
): RankedProduct[] {
  return products
    .map((product) => {
      const detected = colorFromTitle(product.title);
      const reasons: string[] = [];

      if (!detected) {
        return {
          ...product,
          grade: "unknown" as const,
          reasons: ["상품 제목에 색 이름이 없어 색 판정을 못 했습니다. 상세 이미지를 확인하세요."],
          score: 0,
        };
      }

      const verdict = judgeColor(detected.hex, colorType);
      reasons.push(`제목의 '${detected.matchedWord}' → ${detected.name}(${detected.hex}) 기준 판정`);
      reasons.push(verdict.comment);

      let score = { best: 3, good: 1, caution: -3 }[verdict.grade];
      if (targetHex) {
        // 이 검색어가 노린 팔레트 색과 얼마나 가까운지도 함께 본다.
        const distance = deltaE(detected.hex, targetHex);
        if (distance <= 15) {
          score += 1.5;
          reasons.push(`찾던 색 ${targetHex}과 ΔE ${distance.toFixed(1)} — 의도한 색에 거의 일치합니다.`);
        }
      }
      if (product.isRocket) score += 0.2;

      return {
        ...product,
        detectedHex: detected.hex,
        detectedColorName: detected.name,
        deltaE: verdict.deltaE,
        grade: verdict.grade,
        reasons,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * 키워드로 상품을 찾아 팔레트 기준으로 정렬한다.
 * 호출 제한(시간당 10회)에 걸리면 오래된 캐시라도 돌려주고, 그 사실을 함께 알린다.
 */
export async function searchProducts(
  keyword: string,
  colorType: PersonalColorType,
  options: { limit?: number; targetHex?: string } = {},
): Promise<SearchOutcome> {
  const limit = options.limit ?? 10;
  const key = cacheKey(keyword, limit);
  const cached = await readCache(key);

  if (cached && isFresh(cached)) {
    return {
      products: rankProducts(cached.products, colorType, options.targetHex),
      cached: true,
      fetchedAt: new Date(cached.fetchedAt).toISOString(),
    };
  }

  if (!isCoupangEnabled()) {
    return {
      products: cached ? rankProducts(cached.products, colorType, options.targetHex) : [],
      cached: Boolean(cached),
      unavailable:
        "쿠팡 파트너스 키(COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY)가 없어 상품을 불러오지 못했습니다. 아래 검색어와 쇼핑몰 링크는 키 없이도 그대로 쓸 수 있습니다.",
    };
  }

  const remaining = await remainingCalls();
  if (remaining <= 0) {
    return {
      products: cached ? rankProducts(cached.products, colorType, options.targetHex) : [],
      cached: Boolean(cached),
      fetchedAt: cached ? new Date(cached.fetchedAt).toISOString() : undefined,
      unavailable:
        "쿠팡 검색 API의 시간당 호출 한도(10회)를 다 썼습니다. 다음 시간에 다시 시도하거나, 아래 검색어로 직접 검색해 주세요.",
    };
  }

  try {
    const products = await searchCoupang(keyword, limit);
    recordCall();
    await writeCache(key, products);
    return {
      products: rankProducts(products, colorType, options.targetHex),
      cached: false,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[shop] 상품 검색 실패:", error);
    return {
      products: cached ? rankProducts(cached.products, colorType, options.targetHex) : [],
      cached: Boolean(cached),
      unavailable: error instanceof Error ? error.message : "상품을 불러오지 못했습니다.",
    };
  }
}
