// 「마누카 계곡」 — 뉴질랜드 양봉장의 벌통 한 채.
// 실제 벌통 구조를 따른다: 아래가 입구·경비 구역, 가운데가 육아권,
// 위가 꿀 저장권(계상). 왕대는 육아권 소비의 아래 가장자리에 매달린다.

export const TILE = 16;
export const WORLD_W = 130;
export const WORLD_H = 56;
export const GROUND_Y = 44;

export const AIR = 0;
export const SOIL = 1;
export const WAX = 2;
export const GRASS = 3;
export const WOOD = 4;

export type ZoneId = "meadow" | "entrance" | "brood" | "super";

export type Zone = {
  id: ZoneId;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** 육아권 소비의 방 하나. 청소 → 알 → 애벌레 → 성충으로 이어진다. */
export type BroodCell = {
  x: number;
  y: number;
  dirty: boolean;
  larva: boolean;
  fed: boolean;
  wiggle: number;
};

/** 저장권의 방 하나. 짓기 → 꿀 채우기로 이어진다. */
export type HoneyCell = {
  x: number;
  y: number;
  built: boolean;
  filled: boolean;
};

export type Flower = {
  x: number;
  y: number;
  used: boolean;
  sprayed: boolean;
  sway: number;
  regrow: number;
};

export type Worker = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  recruited: boolean;
  phase: number;
  homeX: number;
  homeY: number;
};

export type Hornet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  homeX: number;
  homeY: number;
  wiggle: number;
};

export type QueenCellState = {
  x: number;
  y: number;
  jelly: number; // 로열젤리를 몇 번 먹였는가
  capped: boolean;
};

export type Hive = {
  tiles: Uint8Array;
  zones: Zone[];
  brood: BroodCell[];
  honey: HoneyCell[];
  flowers: Flower[];
  workers: Worker[];
  hornets: Hornet[];
  jellyPool: { x: number; y: number };
  queenCell: QueenCellState;
  spawn: { x: number; y: number };
  entrance: { x: number; y: number };
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tileAt(h: Hive, tx: number, ty: number): number {
  if (tx < 0 || tx >= WORLD_W || ty >= WORLD_H) return SOIL;
  if (ty < 0) return AIR; // 하늘은 끝없이 열려 있다 (혼인비행)
  return h.tiles[ty * WORLD_W + tx];
}

export function isSolid(v: number) {
  return v !== AIR;
}

// 벌통 상자
const BOX = { x: 48, y: 8, w: 36, h: 36 }; // 타일 좌표, y+h 가 지면에 닿는다
const WALL = 2;

const ZONES: Zone[] = [
  { id: "super", name: "꿀 저장권 (계상)", x: BOX.x + WALL, y: BOX.y + WALL, w: BOX.w - WALL * 2, h: 11 },
  { id: "brood", name: "육아권 (소비)", x: BOX.x + WALL, y: BOX.y + WALL + 12, w: BOX.w - WALL * 2, h: 12 },
  { id: "entrance", name: "입구·경비 구역", x: BOX.x + WALL, y: BOX.y + WALL + 25, w: BOX.w - WALL * 2, h: 7 },
];

export function zoneOf(h: Hive, px: number, py: number): Zone | null {
  const tx = px / TILE;
  const ty = py / TILE;
  for (const z of h.zones) {
    if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return z;
  }
  return null;
}

export function isOutside(px: number, py: number) {
  const tx = px / TILE;
  return py / TILE < GROUND_Y && (tx < BOX.x || tx > BOX.x + BOX.w);
}

function fill(tiles: Uint8Array, x: number, y: number, w: number, h: number, v: number) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || yy < 0 || xx >= WORLD_W || yy >= WORLD_H) continue;
      tiles[yy * WORLD_W + xx] = v;
    }
  }
}

export function generateHive(seed: number): Hive {
  const rng = mulberry32(seed);
  const tiles = new Uint8Array(WORLD_W * WORLD_H);

  const h: Hive = {
    tiles,
    zones: ZONES.map((z) => ({ ...z })),
    brood: [],
    honey: [],
    flowers: [],
    workers: [],
    hornets: [],
    jellyPool: { x: 0, y: 0 },
    queenCell: { x: 0, y: 0, jelly: 0, capped: false },
    spawn: { x: 0, y: 0 },
    entrance: { x: 0, y: 0 },
  };

  // 하늘 / 잔디 / 흙
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      tiles[y * WORLD_W + x] = y < GROUND_Y ? AIR : y === GROUND_Y ? GRASS : SOIL;
    }
  }

  // 벌통 상자 (나무) → 속을 파낸다
  fill(tiles, BOX.x, BOX.y, BOX.w, BOX.h, WOOD);
  fill(tiles, BOX.x + WALL, BOX.y + WALL, BOX.w - WALL * 2, BOX.h - WALL * 2, AIR);

  // 층 사이 소비(밀랍) 칸막이 — 양쪽에 통로를 남긴다
  const inX = BOX.x + WALL;
  const inW = BOX.w - WALL * 2;
  const divA = BOX.y + WALL + 11; // 계상 ↔ 육아권
  const divB = BOX.y + WALL + 24; // 육아권 ↔ 입구 구역
  fill(tiles, inX, divA, inW, 1, WAX);
  fill(tiles, inX + 2, divA, 7, 1, AIR); // 왼쪽 통로
  fill(tiles, inX + inW - 9, divA, 7, 1, AIR); // 오른쪽 통로
  fill(tiles, inX, divB, inW, 1, WAX);
  fill(tiles, inX + Math.floor(inW / 2) - 5, divB, 10, 1, AIR); // 가운데 통로

  // 입구 (왼쪽 벽 아래) + 착륙판
  const entryY = BOX.y + BOX.h - 6;
  fill(tiles, BOX.x, entryY, WALL, 4, AIR);
  h.entrance = { x: (BOX.x - 1) * TILE, y: (entryY + 2) * TILE };

  // 마누카 꽃밭 — 벌통 양옆
  const spots: number[] = [];
  for (let i = 0; i < 5; i++) spots.push(6 + i * 8 + Math.floor(rng() * 3));
  for (let i = 0; i < 5; i++) spots.push(BOX.x + BOX.w + 4 + i * 8 + Math.floor(rng() * 3));
  for (const tx of spots) {
    if (tx < 2 || tx > WORLD_W - 3) continue;
    h.flowers.push({
      x: tx * TILE + TILE / 2,
      y: GROUND_Y * TILE + 2,
      used: false,
      sprayed: false,
      sway: rng() * Math.PI * 2,
      regrow: 0,
    });
  }
  // 농약이 뿌려진 꽃 두 송이 (실제 벌 감소 원인 중 하나)
  const sprayIdx = [2 + Math.floor(rng() * 2), 6 + Math.floor(rng() * 3)];
  for (const i of sprayIdx) if (h.flowers[i]) h.flowers[i].sprayed = true;

  // 육아권: 방 8칸 (처음엔 더러운 상태)
  const brood = h.zones.find((z) => z.id === "brood")!;
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    h.brood.push({
      x: (brood.x + 7 + col * 9) * TILE,
      y: (brood.y + 3 + row * 5) * TILE,
      dirty: true,
      larva: false,
      fed: false,
      wiggle: rng() * Math.PI * 2,
    });
  }
  h.jellyPool = { x: (brood.x + brood.w - 3) * TILE, y: (brood.y + brood.h - 2) * TILE };
  // 왕대는 육아권 소비 아래 가장자리에 매달린다
  h.queenCell = {
    x: (brood.x + Math.floor(brood.w / 2)) * TILE,
    y: (brood.y + brood.h - 3) * TILE,
    jelly: 0,
    capped: false,
  };

  // 저장권: 지을 자리 8칸
  const sup = h.zones.find((z) => z.id === "super")!;
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    h.honey.push({
      x: (sup.x + 7 + col * 9) * TILE,
      y: (sup.y + 3 + row * 5) * TILE,
      built: false,
      filled: false,
    });
  }

  // 입구 구역: 동료 일벌과 말벌
  const ent = h.zones.find((z) => z.id === "entrance")!;
  for (let i = 0; i < 3; i++) {
    const wx = (ent.x + 6 + i * 8) * TILE;
    const wy = (ent.y + 3) * TILE;
    h.workers.push({
      x: wx,
      y: wy,
      vx: 0,
      vy: 0,
      recruited: false,
      phase: rng() * Math.PI * 2,
      homeX: wx,
      homeY: wy,
    });
  }
  for (let i = 0; i < 2; i++) {
    const hx = (ent.x + ent.w - 8 + i * 4) * TILE;
    const hy = (ent.y + 2 + i * 2) * TILE;
    h.hornets.push({
      x: hx,
      y: hy,
      vx: 0,
      vy: 0,
      alive: true,
      homeX: hx,
      homeY: hy,
      wiggle: rng() * Math.PI * 2,
    });
  }

  // 시작: 육아권 한가운데 (갓 태어난 청소벌)
  h.spawn = { x: (brood.x + 3) * TILE, y: (brood.y + 6) * TILE };
  return h;
}

export { BOX };
