export type Product = {
  id: string;
  source: "coupang";
  title: string;
  price?: number;
  imageUrl?: string;
  /** 제휴 링크(파트너스 링크). 제휴 계약이 없으면 일반 상품 링크. */
  productUrl: string;
  isAffiliate: boolean;
  isRocket?: boolean;
  categoryName?: string;
};

export type RankedProduct = Product & {
  /** 제목에서 읽어낸 색 */
  detectedHex?: string;
  detectedColorName?: string;
  /** 팔레트 베스트/뉴트럴과의 최소 ΔE */
  deltaE?: number;
  grade: "best" | "good" | "caution" | "unknown";
  reasons: string[];
  score: number;
};

export type SearchOutcome = {
  products: RankedProduct[];
  /** 캐시에서 나온 결과인지 */
  cached: boolean;
  fetchedAt?: string;
  /** 호출 제한/키 없음 등으로 API를 못 쓴 경우의 사유 */
  unavailable?: string;
};
