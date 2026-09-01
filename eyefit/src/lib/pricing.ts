import { customFrameQuoteById } from "./custom";
import { findFrame } from "./frames";
import type { CustomSpec, FrameMode } from "./types";

export type ResolvedFrame =
  | { framePrice: number; frameDiscountable: boolean; leadDays: number }
  | { error: string };

/**
 * 테 값을 서버에서 다시 계산한다. 클라이언트가 보낸 금액은 믿지 않는다.
 *
 * 기성 테는 안경원이 재고로 팔기 때문에 매장 할인이 붙고,
 * 맞춤 테는 플랫폼이 공장에 발주해 파는 물건이라 매장 할인이 붙지 않는다.
 */
export function resolveFramePrice(input: {
  frameMode: FrameMode;
  frameId?: string | null;
  factoryId?: string | null;
  customSpec?: CustomSpec | null;
}): ResolvedFrame {
  if (input.frameMode === "stock") {
    const frame = input.frameId ? findFrame(input.frameId) : undefined;
    if (!frame) return { error: "테를 찾을 수 없습니다." };
    return { framePrice: frame.price, frameDiscountable: true, leadDays: 0 };
  }

  if (!input.factoryId || !input.customSpec) {
    return { error: "맞춤 제작은 공장과 설계 치수가 필요합니다." };
  }
  const quote = customFrameQuoteById(input.factoryId, input.customSpec);
  if (!quote) return { error: "이 공장은 1개 맞춤 제작을 받지 않습니다." };
  return { framePrice: quote.framePrice, frameDiscountable: false, leadDays: quote.leadDays };
}
