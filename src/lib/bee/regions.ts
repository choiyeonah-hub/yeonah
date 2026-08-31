// 다섯 개의 꿀 왕국. 지역마다 꽃, 천적, 기후, 벌통 재료, 하늘빛이 다르다.
// 위협은 모두 그 지역에서 실제로 벌을 괴롭히는 것들로 골랐다.

export type FlowerForm = "manuka" | "almond" | "sidr" | "thyme" | "acacia";
export type HiveMaterial = "wood" | "clay" | "stone" | "log";
export type ClimateKind = "shortBloom" | "monoculture" | "heat" | "wind" | "invasive";

export type Region = {
  id: string;
  name: string;
  country: string;
  honey: string;
  blurb: string;
  /** 하늘 (위, 아래) */
  sky: [string, string];
  /** 먼 능선 (먼 것, 가까운 것) */
  hills: [string, string];
  grass: string;
  soil: string;
  hive: {
    material: HiveMaterial;
    label: string;
    wall: string;
    wallDark: string;
  };
  flower: {
    name: string;
    form: FlowerForm;
    petal: string;
    petal2: string;
    center: string;
    stem: string;
  };
  predator: {
    name: string;
    body: string;
    dark: string;
    /** 추격 속도 배수 */
    speed: number;
    count: number;
  };
  climate: {
    kind: ClimateKind;
    label: string;
    /** 플레이 중 한 번 뜨는 설명 */
    note: string;
  };
  fact: { title: string; body: string };
};

export const REGIONS: Region[] = [
  {
    id: "manuka",
    name: "마누카 계곡",
    country: "뉴질랜드",
    honey: "마누카 꿀",
    blurb: "짧게 피고 지는 마누카. 이 2~6주가 계곡의 한 해를 정한다.",
    sky: ["#60a4e4", "#c0e0ee"],
    hills: ["rgba(108,142,116,0.55)", "rgba(84,118,96,0.7)"],
    grass: "#5c9640",
    soil: "#60442e",
    hive: { material: "wood", label: "나무 벌통", wall: "#a07040", wallDark: "#603e1e" },
    flower: {
      name: "마누카",
      form: "manuka",
      petal: "#ffffff",
      petal2: "#ffeef2",
      center: "#5a3b2a",
      stem: "#4f7a3c",
    },
    predator: { name: "말벌", body: "#e2861f", dark: "#3a2408", speed: 1, count: 2 },
    climate: {
      kind: "shortBloom",
      label: "짧은 개화",
      note: "마누카는 2~6주만 핀다. 진 꽃은 한참 뒤에야 다시 핀다.",
    },
    fact: {
      title: "뉴질랜드는 꿀을 국가가 검사한다",
      body: "수출용 마누카꿀은 정부가 인정한 시험기관의 검사를 거친다. 한 종류의 꿀이 나라의 이름이 된 드문 경우다.",
    },
  },
  {
    id: "almond",
    name: "아몬드 농장",
    country: "미국 캘리포니아",
    honey: "아몬드 꽃꿀",
    blurb: "지평선까지 아몬드 한 종류뿐. 꽃은 넘치는데 먹을 게 모자란다.",
    sky: ["#7ab0dc", "#e8d8bc"],
    hills: ["rgba(150,150,120,0.45)", "rgba(120,124,92,0.6)"],
    grass: "#8a9450",
    soil: "#6e5a3e",
    hive: { material: "wood", label: "이동 양봉통", wall: "#b8b0a0", wallDark: "#6e685c" },
    flower: {
      name: "아몬드 꽃",
      form: "almond",
      petal: "#ffd9e4",
      petal2: "#ffffff",
      center: "#c98a2e",
      stem: "#7a6a4a",
    },
    predator: { name: "살포 드론", body: "#9aa3ad", dark: "#2c3238", speed: 1.15, count: 2 },
    climate: {
      kind: "monoculture",
      label: "단일 재배",
      note: "한 종류 꽃만 있는 땅. 농약을 뒤집어쓴 꽃이 유난히 많다.",
    },
    fact: {
      title: "미국 아몬드밭에는 벌통이 트럭으로 온다",
      body: "캘리포니아 아몬드 개화기에는 전국에서 벌통 수백만 개가 트럭에 실려 모인다. 벌에게는 긴 이동과 단일 식단이 함께 온다.",
    },
  },
  {
    id: "sidr",
    name: "시드르 골짜기",
    country: "예멘",
    honey: "시드르 꿀",
    blurb: "낮의 열기가 벌통을 삶는다. 물을 날라 집을 식혀야 한다.",
    sky: ["#e8a860", "#f6dcae"],
    hills: ["rgba(196,150,102,0.5)", "rgba(160,116,74,0.65)"],
    grass: "#b89a5e",
    soil: "#8a6a42",
    hive: { material: "clay", label: "진흙 벌통", wall: "#c69a6a", wallDark: "#7e5836" },
    flower: {
      name: "시드르 (대추야자 계열)",
      form: "sidr",
      petal: "#e8e08a",
      petal2: "#fff4c0",
      center: "#8a6a20",
      stem: "#6e7a3a",
    },
    predator: { name: "벌잡이새", body: "#3fa87a", dark: "#1c4a38", speed: 1.35, count: 2 },
    climate: {
      kind: "heat",
      label: "혹서",
      note: "바깥이 뜨겁다. 벌통 밖에 오래 있으면 날개 힘이 빨리 마른다.",
    },
    fact: {
      title: "벌은 물을 날라 에어컨을 튼다",
      body: "더운 날 벌은 물을 물어와 벌집에 뿌리고 날개로 부친다. 증발하며 온도가 떨어진다. 벌통 안은 한여름에도 35도 근처로 유지된다.",
    },
  },
  {
    id: "thyme",
    name: "타임 절벽",
    country: "그리스",
    honey: "타임 꿀",
    blurb: "바위 틈에 지은 집. 에게해의 바람이 비행을 밀어낸다.",
    sky: ["#3f86d8", "#bfe4ee"],
    hills: ["rgba(170,170,178,0.5)", "rgba(132,134,144,0.66)"],
    grass: "#7e8c4e",
    soil: "#8e8a80",
    hive: { material: "stone", label: "바위 틈 벌집", wall: "#a8a49c", wallDark: "#5e5c58" },
    flower: {
      name: "야생 타임",
      form: "thyme",
      petal: "#c89ae0",
      petal2: "#e6c8f4",
      center: "#6a4a80",
      stem: "#6a7c44",
    },
    predator: { name: "말벌", body: "#d8741c", dark: "#3a2408", speed: 1.1, count: 3 },
    climate: {
      kind: "wind",
      label: "해풍",
      note: "바깥에는 바람이 분다. 방향이 계속 밀린다.",
    },
    fact: {
      title: "그리스 사람들은 3천 년 전부터 벌을 쳤다",
      body: "크레타의 미노아 유적에서 토기 벌통이 나온다. 타임이 자라는 마른 언덕은 지금도 세계에서 손꼽히는 꿀 산지다.",
    },
  },
  {
    id: "acacia",
    name: "아카시아 숲",
    country: "대한민국",
    honey: "아카시아 꿀",
    blurb: "온 산이 하얗게 피는 보름. 그리고 등검은말벌이 왔다.",
    sky: ["#74aede", "#d6ead4"],
    hills: ["rgba(96,132,104,0.5)", "rgba(66,102,78,0.68)"],
    grass: "#4e8c3e",
    soil: "#5a4632",
    hive: { material: "log", label: "통나무 벌통", wall: "#8a6440", wallDark: "#4e3620" },
    flower: {
      name: "아까시나무 꽃",
      form: "acacia",
      petal: "#fffdf4",
      petal2: "#f4f0d8",
      center: "#c8b45a",
      stem: "#5a7c3a",
    },
    predator: { name: "등검은말벌", body: "#2e2a26", dark: "#e0a83c", speed: 1.3, count: 3 },
    climate: {
      kind: "invasive",
      label: "외래 천적",
      note: "등검은말벌은 빠르고 수가 많다. 동료를 먼저 모으자.",
    },
    fact: {
      title: "한국 꿀의 70%가 이 나무 한 그루에서 나온다",
      body: "아까시나무는 5월에 보름 남짓 핀다. 그 짧은 기간이 한 해 꿀 농사를 좌우한다. 2003년 이후 등검은말벌이 들어와 토종벌을 위협하고 있다.",
    },
  },
];

export function regionById(id: string): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

export function nextRegion(id: string): Region | null {
  const i = REGIONS.findIndex((r) => r.id === id);
  return i >= 0 && i < REGIONS.length - 1 ? REGIONS[i + 1] : null;
}
