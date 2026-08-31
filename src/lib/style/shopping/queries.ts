import { searchWordForHex } from "./colorWords";
import type { StyleProfileResult } from "../types";

// 진단 결과를 "실제로 검색창에 넣을 수 있는 문장"으로 바꾼다.
// 제휴 API 키가 없어도 이 부분은 항상 동작하고, 키가 있으면 그대로 검색어로 쓰인다.

export type ShopSlot = "top" | "bottom" | "outer" | "dress" | "shoes" | "bag";

export type ShopQuery = {
  slot: ShopSlot;
  slotLabel: string;
  /** 검색창에 넣을 문장 */
  keyword: string;
  /** 이 검색어가 노리는 팔레트 색 */
  targetHex: string;
  targetName: string;
  /** 상품 상세에서 확인해야 할 수치 */
  checkList: string[];
};

const SLOT_LABEL: Record<ShopSlot, string> = {
  top: "상의",
  bottom: "하의",
  outer: "아우터",
  dress: "원피스",
  shoes: "구두",
  bag: "가방",
};

export function buildShopQueries(profile: StyleProfileResult): ShopQuery[] {
  const { recommendation } = profile;
  const sizing = Object.fromEntries(recommendation.sizing.map((hint) => [hint.label, hint.value]));
  const queries: ShopQuery[] = [];

  const seen = new Set<string>();
  const push = (slot: ShopSlot, searchTerm: string, hex: string, colorName: string, checkList: string[]) => {
    const keyword = `${searchWordForHex(hex)} ${searchTerm}`;
    if (seen.has(keyword)) return; // 같은 검색어를 두 번 보여줄 이유가 없다
    seen.add(keyword);
    queries.push({
      slot,
      slotLabel: SLOT_LABEL[slot],
      keyword,
      targetHex: hex,
      targetName: colorName,
      checkList,
    });
  };

  const topLength = sizing["상의 총장 (목옆점 기준)"] ?? "";
  const skirtLength = sizing["스커트·원피스 총장 (허리 기준)"] ?? "";
  const heel = sizing["구두 굽 높이"] ?? "";
  const bagWidth = sizing["가방 가로 사이즈"] ?? "";
  const outerLength = sizing["아우터 총장"] ?? "";
  const hem = sizing["팬츠 밑단 (굽 신은 상태)"] ?? "";

  for (const item of recommendation.clothes) {
    const slot = item.slot as ShopSlot;
    const checkList =
      slot === "top"
        ? [`총장: ${topLength}`, ...item.spec.slice(1, 3)]
        : slot === "bottom"
          ? [`밑단: ${hem}`, ...item.spec.slice(1, 3)]
          : slot === "dress"
            ? [`총장: ${skirtLength}`, ...item.spec.slice(1, 3)]
            : [`총장: ${outerLength}`, ...item.spec.slice(1, 3)];

    // 아이템마다 베스트 색 2개까지 서로 다른 검색어로 만든다.
    item.colors.slice(0, 2).forEach((color) => {
      push(slot, item.searchTerm, color.hex, color.name, checkList);
    });
  }

  recommendation.shoes.slice(0, 2).forEach((item) => {
    item.colors.slice(0, 1).forEach((color) => {
      push("shoes", item.searchTerm, color.hex, color.name, [`굽 높이: ${heel}`, ...item.spec.slice(1, 3)]);
    });
  });

  recommendation.bags.slice(0, 2).forEach((item) => {
    item.colors.slice(0, 1).forEach((color) => {
      push("bag", item.searchTerm, color.hex, color.name, [`가로: ${bagWidth}`, ...item.spec.slice(1, 3)]);
    });
  });

  return queries;
}

export type ShopLink = { site: string; url: string };

// 제휴 계약 없이도 쓸 수 있는 각 쇼핑몰의 공개 검색 URL.
export function shopLinks(keyword: string): ShopLink[] {
  const encoded = encodeURIComponent(keyword);
  return [
    { site: "쿠팡", url: `https://www.coupang.com/np/search?q=${encoded}` },
    { site: "무신사", url: `https://www.musinsa.com/search/goods?keyword=${encoded}` },
    { site: "29CM", url: `https://www.29cm.co.kr/search?keyword=${encoded}` },
    { site: "네이버쇼핑", url: `https://search.shopping.naver.com/search/all?query=${encoded}` },
    { site: "지그재그", url: `https://zigzag.kr/search?keyword=${encoded}` },
  ];
}
