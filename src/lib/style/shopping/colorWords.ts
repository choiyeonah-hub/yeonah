import { deltaE, hexToLab } from "../color";

// 상품 제목에서 색을 읽어내기 위한 사전.
// 어필리에이트 API는 상품 색을 따로 주지 않고, 이미지의 색을 서버에서 디코딩하려면
// 네이티브 이미지 라이브러리가 필요하다. 한국 쇼핑몰 제목에는 색 이름이 거의 항상
// 들어 있어서, 제목에서 색을 뽑는 쪽이 훨씬 싸고 안정적이다.

type ColorWord = { words: string[]; hex: string; name: string };

const COLOR_WORDS: ColorWord[] = [
  { words: ["블랙", "검정", "검은", "black"], hex: "#0B0B0B", name: "블랙" },
  { words: ["차콜", "챠콜", "charcoal"], hex: "#3A3A3A", name: "차콜" },
  { words: ["그레이", "회색", "그레이지", "gray", "grey"], hex: "#8C8C90", name: "그레이" },
  { words: ["화이트", "흰색", "white"], hex: "#FFFFFF", name: "화이트" },
  { words: ["아이보리", "ivory"], hex: "#FFFBF2", name: "아이보리" },
  { words: ["크림", "cream"], hex: "#FFF3D6", name: "크림" },
  { words: ["베이지", "beige"], hex: "#E3C9A6", name: "베이지" },
  { words: ["오트밀", "샌드"], hex: "#DCCBB0", name: "오트밀" },
  { words: ["토프", "taupe"], hex: "#9A8B77", name: "토프" },
  { words: ["카멜", "camel"], hex: "#C08A4E", name: "카멜" },
  { words: ["브라운", "갈색", "brown"], hex: "#6F4E37", name: "브라운" },
  { words: ["초콜릿", "초코", "chocolate"], hex: "#5B3A29", name: "초콜릿" },
  { words: ["모카", "코코아"], hex: "#8A6A55", name: "모카" },
  { words: ["카키", "khaki"], hex: "#6B5B3E", name: "카키" },
  { words: ["올리브", "olive"], hex: "#6B7A31", name: "올리브" },
  { words: ["네이비", "감청", "navy"], hex: "#14213D", name: "네이비" },
  { words: ["블루", "파랑", "파란", "blue"], hex: "#2F80ED", name: "블루" },
  { words: ["스카이", "하늘", "소라"], hex: "#A9C9E8", name: "스카이블루" },
  { words: ["인디고", "indigo"], hex: "#22456E", name: "인디고" },
  { words: ["데님", "denim", "청"], hex: "#4A7FB5", name: "데님" },
  { words: ["민트", "mint"], hex: "#8ED0C0", name: "민트" },
  { words: ["그린", "초록", "green"], hex: "#2E7D32", name: "그린" },
  { words: ["세이지", "sage"], hex: "#A3B5A0", name: "세이지" },
  { words: ["에메랄드", "emerald"], hex: "#00A170", name: "에메랄드" },
  { words: ["레드", "빨강", "빨간", "red"], hex: "#D0021B", name: "레드" },
  { words: ["버건디", "burgundy"], hex: "#5C0A2B", name: "버건디" },
  { words: ["와인", "wine"], hex: "#6B1030", name: "와인" },
  { words: ["브릭", "벽돌"], hex: "#8C3A2B", name: "브릭" },
  { words: ["테라코타", "terracotta"], hex: "#B5715A", name: "테라코타" },
  { words: ["핑크", "분홍", "pink"], hex: "#F48FB1", name: "핑크" },
  { words: ["로즈", "rose"], hex: "#E7B3C0", name: "로즈" },
  { words: ["코럴", "코랄", "coral"], hex: "#FF7F50", name: "코럴" },
  { words: ["살몬", "연어", "salmon"], hex: "#F7B7A3", name: "살몬" },
  { words: ["피치", "복숭아", "peach"], hex: "#F9C9A0", name: "피치" },
  { words: ["애프리콧", "살구", "apricot"], hex: "#F6A96B", name: "애프리콧" },
  { words: ["오렌지", "주황", "orange"], hex: "#FF7A45", name: "오렌지" },
  { words: ["옐로우", "옐로", "노랑", "노란", "yellow"], hex: "#FFD400", name: "옐로우" },
  { words: ["머스타드", "머스터드", "mustard"], hex: "#C99700", name: "머스타드" },
  { words: ["퍼플", "보라", "purple"], hex: "#5B2C8D", name: "퍼플" },
  { words: ["라벤더", "lavender"], hex: "#D6CCE8", name: "라벤더" },
  { words: ["라일락", "lilac"], hex: "#E0D3EA", name: "라일락" },
  { words: ["플럼", "자두", "plum"], hex: "#7E4F73", name: "플럼" },
  { words: ["모브", "mauve"], hex: "#A98BA3", name: "모브" },
  { words: ["누드", "nude"], hex: "#E4C8B8", name: "누드" },
  { words: ["실버", "은색", "silver"], hex: "#C0C0C8", name: "실버" },
  { words: ["골드", "금색", "gold"], hex: "#D9A441", name: "골드" },
  { words: ["터콰이즈", "터키석", "turquoise"], hex: "#35B0AB", name: "터콰이즈" },
];

// "연/라이트", "진/딥/다크" 같은 수식어는 명도를 움직인다.
const LIGHTEN = ["연", "라이트", "파스텔", "light", "페일", "밝은", "파우더", "베이비", "소프트", "pale"];
const DARKEN = ["진", "딥", "다크", "deep", "dark", "어두운"];

function shift(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const next = amount > 0 ? channel + (255 - channel) * amount : channel * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(next)));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export type TitleColor = { hex: string; name: string; matchedWord: string };

/** 상품 제목에서 색을 추출한다. 못 찾으면 null. */
export function colorFromTitle(title: string): TitleColor | null {
  const lower = title.toLowerCase();

  for (const entry of COLOR_WORDS) {
    for (const word of entry.words) {
      const index = lower.indexOf(word.toLowerCase());
      if (index === -1) continue;

      // 색 단어 바로 앞 4글자에서 수식어를 찾는다.
      const prefix = lower.slice(Math.max(0, index - 4), index);
      let hex = entry.hex;
      let name = entry.name;
      if (LIGHTEN.some((modifier) => prefix.includes(modifier))) {
        hex = shift(hex, 0.35);
        name = `라이트 ${name}`;
      } else if (DARKEN.some((modifier) => prefix.includes(modifier))) {
        hex = shift(hex, -0.35);
        name = `딥 ${name}`;
      }
      return { hex, name, matchedWord: word };
    }
  }
  return null;
}

/** 팔레트 색과 가장 가까운 색 이름을 찾아 검색어에 쓸 한국어 단어로 바꾼다. */
export function searchWordForHex(hex: string): string {
  let best = COLOR_WORDS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of COLOR_WORDS) {
    const distance = deltaE(hex, entry.hex);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }

  // 사전의 기준색보다 확실히 밝거나 어두우면 수식어를 붙여야 검색 결과가 맞는다.
  const lightnessGap = hexToLab(hex).L - hexToLab(best.hex).L;
  if (lightnessGap > 14) return `연${best.name}`;
  if (lightnessGap < -14) return `진${best.name}`;
  return best.name;
}
