import type { LensIndexId, LensOptionId, Quote, Store } from "./types";
import { lensListPrice } from "./lenses";

/**
 * 제휴 안경원(데모 데이터).
 * 동네 안경원과 전국 체인을 섞어 두고, 매장별 할인율로 가격을 비교한다.
 */
export const STORES: Store[] = [
  {
    id: "s-01",
    name: "밝은눈안경 강남점",
    kind: "체인",
    region: "서울",
    district: "강남구",
    address: "서울 강남구 테헤란로 1길",
    frameDiscount: 0.2,
    lensDiscount: 0.35,
    rating: 4.6,
    reviewCount: 1284,
    freeExam: true,
    turnaround: "당일 1시간",
    services: ["정밀검안", "누진 전문", "당일수령"],
  },
  {
    id: "s-02",
    name: "우리동네안경 성수",
    kind: "동네",
    region: "서울",
    district: "성동구",
    address: "서울 성동구 연무장길",
    frameDiscount: 0.1,
    lensDiscount: 0.2,
    rating: 4.9,
    reviewCount: 213,
    freeExam: true,
    turnaround: "1~2일",
    services: ["세밀한 피팅", "무료 A/S", "단골 할인"],
  },
  {
    id: "s-03",
    name: "다비치안경 홍대점",
    kind: "체인",
    region: "서울",
    district: "마포구",
    address: "서울 마포구 양화로",
    frameDiscount: 0.25,
    lensDiscount: 0.3,
    rating: 4.4,
    reviewCount: 2019,
    freeExam: true,
    turnaround: "당일 2시간",
    services: ["정밀검안", "멤버십", "전국 A/S"],
  },
  {
    id: "s-04",
    name: "송파 시력교정 안경원",
    kind: "동네",
    region: "서울",
    district: "송파구",
    address: "서울 송파구 백제고분로",
    frameDiscount: 0.15,
    lensDiscount: 0.25,
    rating: 4.8,
    reviewCount: 341,
    freeExam: true,
    turnaround: "1일",
    services: ["어린이 시기능", "누진 전문"],
  },
  {
    id: "s-05",
    name: "판교 아이안경",
    kind: "동네",
    region: "경기",
    district: "성남시",
    address: "경기 성남시 분당구 판교역로",
    frameDiscount: 0.12,
    lensDiscount: 0.28,
    rating: 4.7,
    reviewCount: 502,
    freeExam: true,
    turnaround: "당일 3시간",
    services: ["블루라이트 상담", "정밀검안"],
  },
  {
    id: "s-06",
    name: "룩옵티컬 수원역점",
    kind: "체인",
    region: "경기",
    district: "수원시",
    address: "경기 수원시 팔달구 덕영대로",
    frameDiscount: 0.22,
    lensDiscount: 0.32,
    rating: 4.3,
    reviewCount: 890,
    freeExam: false,
    turnaround: "당일 1시간",
    services: ["전국 A/S", "브랜드 다양"],
  },
  {
    id: "s-07",
    name: "해운대 바다안경",
    kind: "동네",
    region: "부산",
    district: "해운대구",
    address: "부산 해운대구 구남로",
    frameDiscount: 0.18,
    lensDiscount: 0.22,
    rating: 4.9,
    reviewCount: 176,
    freeExam: true,
    turnaround: "1일",
    services: ["수제 피팅", "선글라스 도수"],
  },
  {
    id: "s-08",
    name: "대전 둔산 광학",
    kind: "동네",
    region: "대전",
    district: "서구",
    address: "대전 서구 둔산로",
    frameDiscount: 0.14,
    lensDiscount: 0.26,
    rating: 4.6,
    reviewCount: 288,
    freeExam: true,
    turnaround: "1~2일",
    services: ["정밀검안", "노안 상담"],
  },
  {
    id: "s-09",
    name: "광주 충장로 안경나라",
    kind: "체인",
    region: "광주",
    district: "동구",
    address: "광주 동구 충장로",
    frameDiscount: 0.24,
    lensDiscount: 0.29,
    rating: 4.2,
    reviewCount: 615,
    freeExam: true,
    turnaround: "당일 2시간",
    services: ["학생 할인", "전국 A/S"],
  },
  {
    id: "s-10",
    name: "제주 한라안경원",
    kind: "동네",
    region: "제주",
    district: "제주시",
    address: "제주 제주시 중앙로",
    frameDiscount: 0.08,
    lensDiscount: 0.18,
    rating: 4.8,
    reviewCount: 97,
    freeExam: true,
    turnaround: "2일",
    services: ["도수 선글라스", "무료 A/S"],
  },
];

export const REGIONS = Array.from(new Set(STORES.map((s) => s.region)));

export function findStore(id: string): Store | undefined {
  return STORES.find((s) => s.id === id);
}

/** 100원 단위로 내림. 매장 표기 관행에 맞춘다. */
function floor100(n: number): number {
  return Math.floor(n / 100) * 100;
}

/**
 * 선택한 테 + 렌즈 사양으로 매장별 견적을 만들고 싼 순으로 정렬한다.
 *
 * 테와 렌즈는 파는 주체가 다르다.
 *  - 기성 테: 안경원이 재고로 갖고 팔기 때문에 매장 할인이 붙는다.
 *  - 맞춤 테: 플랫폼이 공장에 발주해 파는 물건이라 매장 할인이 붙지 않는다.
 *  - 렌즈: 어느 쪽이든 안경원의 안경사가 조제·판매하므로 매장 할인이 붙는다.
 *
 * 여기 나오는 금액은 "예상 견적"이고, 최종 금액은 매장 검안 후 확정된다.
 */
export function buildQuotes(params: {
  /** 테 정가(기성품) 또는 맞춤 제작 확정가 */
  framePrice: number;
  /** 매장 할인이 적용되는 테인지 (기성품이면 true) */
  frameDiscountable: boolean;
  lensIndex: LensIndexId;
  lensOptions: LensOptionId[];
  region?: string | null;
  kind?: Store["kind"] | null;
}): Quote[] {
  const lensList = lensListPrice(params.lensIndex, params.lensOptions);
  const listTotal = params.framePrice + lensList;

  return STORES.filter((s) => (params.region ? s.region === params.region : true))
    .filter((s) => (params.kind ? s.kind === params.kind : true))
    .map((s) => {
      const framePrice = params.frameDiscountable
        ? floor100(params.framePrice * (1 - s.frameDiscount))
        : params.framePrice;
      const lensPrice = floor100(lensList * (1 - s.lensDiscount));
      const totalPrice = framePrice + lensPrice;
      return {
        storeId: s.id,
        framePrice,
        lensPrice,
        totalPrice,
        saved: listTotal - totalPrice,
      };
    })
    .sort((a, b) => a.totalPrice - b.totalPrice);
}
