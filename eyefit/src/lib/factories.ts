/** 제작 공법. 1개만 만들 수 있는지(금형이 필요한지)가 가장 큰 차이다. */
export type ProductionMethod = "3d-sls" | "cnc-acetate" | "titanium-cut" | "injection" | "metal-press";

export const PRODUCTION_METHODS: Record<
  ProductionMethod,
  { label: string; oneOff: boolean; description: string }
> = {
  "3d-sls": {
    label: "SLS 3D 프린팅 (나일론)",
    oneOff: true,
    description:
      "분말 나일론을 레이저로 굳혀 쌓습니다. 금형이 없어 1개부터 만들 수 있고, 사람마다 다른 치수를 그대로 반영할 수 있어 개인 맞춤에 가장 적합합니다.",
  },
  "cnc-acetate": {
    label: "CNC 아세테이트 절삭",
    oneOff: true,
    description:
      "아세테이트 판을 깎아 만듭니다. 색과 무늬 선택지가 넓고 질감이 좋습니다. 연마·광택에 시간이 걸립니다.",
  },
  "titanium-cut": {
    label: "티타늄 판재 가공",
    oneOff: true,
    description:
      "티타늄 판을 자르고 구부려 만듭니다. 가장 가볍고 금속 알레르기가 적지만 단가가 높습니다.",
  },
  injection: {
    label: "사출 성형 (TR-90)",
    oneOff: false,
    description:
      "금형에 플라스틱을 부어 찍어냅니다. 개당 단가가 가장 싸지만 금형비와 최소 수량이 필요해 양산용입니다.",
  },
  "metal-press": {
    label: "금속 프레스",
    oneOff: false,
    description: "금속을 금형으로 눌러 찍습니다. 양산 단가가 낮지만 금형 투자와 최소 수량이 큽니다.",
  },
};

export type Factory = {
  id: string;
  name: string;
  country: string;
  region: string;
  methods: ProductionMethod[];
  materials: string[];
  /** 1개 맞춤 제작이 가능한 공장인지 */
  oneOffCapable: boolean;
  /** 1개 맞춤 제작 단가(원). 불가하면 null */
  oneOffUnitCost: number | null;
  /** 양산 최소 주문 수량 */
  moq: number;
  /** 양산 시 개당 단가(원) */
  bulkUnitCost: number;
  /** 금형비(원). 금형이 필요 없으면 0 */
  toolingCost: number;
  /** 1개 맞춤 제작 리드타임(일) */
  leadDays: number;
  certifications: string[];
  note: string;
};

/**
 * 제휴 공장(데모 데이터).
 *
 * 실제 안경테 생산지를 기준으로 구성했다. 국내는 대구 안경산업단지가 중심이고,
 * 티타늄 정밀 가공은 일본 사바에, 고급 아세테이트는 이탈리아 벨루노가 강하다.
 * 실제 제휴 시에는 견적서를 받아 unitCost / moq / leadDays만 갈아끼우면 된다.
 */
export const FACTORIES: Factory[] = [
  {
    id: "fac-daegu-1",
    name: "대구 안경산업단지 A공장",
    country: "대한민국",
    region: "대구 북구",
    methods: ["cnc-acetate", "metal-press"],
    materials: ["아세테이트", "메탈"],
    oneOffCapable: true,
    oneOffUnitCost: 86000,
    moq: 300,
    bulkUnitCost: 18000,
    toolingCost: 3500000,
    leadDays: 21,
    certifications: ["KC 공급자적합성확인", "ISO 9001"],
    note: "국내라 샘플 수정이 빠르고, 소량 맞춤과 양산을 한 곳에서 이어갈 수 있습니다.",
  },
  {
    id: "fac-daegu-2",
    name: "대구 3D프린팅 안경 스튜디오",
    country: "대한민국",
    region: "대구 북구",
    methods: ["3d-sls"],
    materials: ["나일론(PA12)"],
    oneOffCapable: true,
    oneOffUnitCost: 64000,
    moq: 1,
    bulkUnitCost: 42000,
    toolingCost: 0,
    leadDays: 10,
    certifications: ["KC 공급자적합성확인"],
    note: "금형이 없어 1개부터 제작됩니다. 사람마다 다른 치수를 그대로 반영할 수 있어 맞춤 제작의 기본 선택지입니다.",
  },
  {
    id: "fac-sabae",
    name: "사바에 티타늄 공방",
    country: "일본",
    region: "후쿠이현 사바에",
    methods: ["titanium-cut"],
    materials: ["베타 티타늄", "순 티타늄"],
    oneOffCapable: true,
    oneOffUnitCost: 168000,
    moq: 50,
    bulkUnitCost: 74000,
    toolingCost: 0,
    leadDays: 35,
    certifications: ["JIS T7331"],
    note: "티타늄 안경테 가공의 본거지입니다. 단가와 리드타임이 높은 대신 무게와 마감이 다릅니다.",
  },
  {
    id: "fac-belluno",
    name: "벨루노 아세테이트 아틀리에",
    country: "이탈리아",
    region: "베네토주 벨루노",
    methods: ["cnc-acetate"],
    materials: ["마촐라토 아세테이트", "비오 아세테이트"],
    oneOffCapable: true,
    oneOffUnitCost: 214000,
    moq: 100,
    bulkUnitCost: 96000,
    toolingCost: 0,
    leadDays: 45,
    certifications: ["CE", "REACH"],
    note: "고급 아세테이트 원단과 손 광택이 강점입니다. 단가가 높아 프리미엄 라인용입니다.",
  },
  {
    id: "fac-wenzhou",
    name: "원저우 프레임 팩토리",
    country: "중국",
    region: "저장성 원저우",
    methods: ["injection", "metal-press", "cnc-acetate"],
    materials: ["TR-90", "메탈", "아세테이트"],
    oneOffCapable: false,
    oneOffUnitCost: null,
    moq: 500,
    bulkUnitCost: 7800,
    toolingCost: 2200000,
    leadDays: 40,
    certifications: ["ISO 9001", "CE"],
    note: "양산 단가가 가장 낮습니다. 1개 맞춤은 받지 않으니, 디자인이 검증된 뒤 양산 단계에서 씁니다.",
  },
];

export function findFactory(id: string): Factory | undefined {
  return FACTORIES.find((f) => f.id === id);
}

/** 1개 맞춤 제작을 받아주는 공장만. */
export function oneOffFactories(): Factory[] {
  return FACTORIES.filter((f) => f.oneOffCapable && f.oneOffUnitCost != null);
}
