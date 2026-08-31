import crypto from "node:crypto";

import type { Product } from "./types";

// 쿠팡 파트너스 Open API 클라이언트.
// 인증은 CEA(HmacSHA256) 방식: 서명 메시지 = datetime + METHOD + path + query(물음표 제외),
// datetime 포맷은 yyMMdd'T'HHmmss'Z' (GMT).
// 경로는 쿠팡이 바꿀 수 있어 환경변수로 덮어쓸 수 있게 열어 둔다.

const HOST = process.env.COUPANG_API_HOST ?? "https://api-gateway.coupang.com";
const SEARCH_PATH =
  process.env.COUPANG_SEARCH_PATH ?? "/v2/providers/affiliate_open_api/apis/openapi/products/search";
const DEEPLINK_PATH =
  process.env.COUPANG_DEEPLINK_PATH ?? "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

export function isCoupangEnabled(): boolean {
  return Boolean(process.env.COUPANG_ACCESS_KEY && process.env.COUPANG_SECRET_KEY);
}

function signedHeaders(method: string, path: string, query: string): Record<string, string> {
  const accessKey = process.env.COUPANG_ACCESS_KEY!;
  const secretKey = process.env.COUPANG_SECRET_KEY!;

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const datetime =
    `${pad(now.getUTCFullYear() % 100)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const message = datetime + method.toUpperCase() + path + query;
  const signature = crypto.createHmac("sha256", secretKey).update(message).digest("hex");

  return {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`,
    "Content-Type": "application/json;charset=UTF-8",
  };
}

type CoupangResponse<T> = { rCode?: string; rMessage?: string; data?: T };

type CoupangProduct = {
  productId?: number | string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  productUrl?: string;
  categoryName?: string;
  isRocket?: boolean;
};

/**
 * 키워드로 상품을 검색한다.
 * 이 호출은 시간당 10회 제한이 있으므로 cache.ts의 잔여 호출 수를 확인한 뒤에만 부를 것.
 */
export async function searchCoupang(keyword: string, limit = 10): Promise<Product[]> {
  const query = `keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
  const response = await fetch(`${HOST}${SEARCH_PATH}?${query}`, {
    method: "GET",
    headers: signedHeaders("GET", SEARCH_PATH, query),
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`쿠팡 검색 실패 (${response.status}): ${text.slice(0, 200)}`);
  }

  let parsed: CoupangResponse<{ productData?: CoupangProduct[] } | CoupangProduct[]>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("쿠팡 응답을 해석하지 못했습니다.");
  }

  if (parsed.rCode && parsed.rCode !== "0") {
    throw new Error(`쿠팡 오류(${parsed.rCode}): ${parsed.rMessage ?? "알 수 없는 오류"}`);
  }

  const raw = Array.isArray(parsed.data) ? parsed.data : (parsed.data?.productData ?? []);

  return raw
    .filter((item) => item.productName && item.productUrl)
    .map((item) => ({
      id: String(item.productId ?? item.productUrl),
      source: "coupang" as const,
      title: item.productName!,
      price: typeof item.productPrice === "number" ? item.productPrice : undefined,
      imageUrl: item.productImage,
      productUrl: item.productUrl!,
      isAffiliate: true, // 파트너스 API가 돌려주는 링크에는 추적 파라미터가 포함된다
      isRocket: item.isRocket,
      categoryName: item.categoryName,
    }));
}

/** 일반 쿠팡 URL을 파트너스 링크로 바꾼다. */
export async function toDeeplinks(urls: string[]): Promise<Record<string, string>> {
  if (urls.length === 0) return {};
  const body = JSON.stringify({ coupangUrls: urls });

  const response = await fetch(`${HOST}${DEEPLINK_PATH}`, {
    method: "POST",
    headers: signedHeaders("POST", DEEPLINK_PATH, ""),
    body,
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`딥링크 생성 실패 (${response.status})`);

  const parsed = (await response.json()) as CoupangResponse<
    { originalUrl?: string; shortenUrl?: string; landingUrl?: string }[]
  >;

  const map: Record<string, string> = {};
  for (const entry of parsed.data ?? []) {
    if (entry.originalUrl) map[entry.originalUrl] = entry.shortenUrl ?? entry.landingUrl ?? entry.originalUrl;
  }
  return map;
}
