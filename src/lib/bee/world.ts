// 「왕벌의 비행」 — 땅속 벌집 지도.
// 방(chamber)은 손으로 배치하고, 방마다 퀘스트에 쓰이는 물건과 벌들을 놓는다.

export const TILE = 16;
export const WORLD_W = 150;
export const WORLD_H = 132;
export const GROUND_Y = 40; // 이 줄이 잔디, 위쪽은 하늘

export const AIR = 0;
export const SOIL = 1;
export const WAX = 2;
export const GRASS = 3;
export const DOOR = 4; // 왕대로 가는 밀랍 문 (퀘스트를 마치면 열린다)

export type RoomId = "hall" | "vault" | "nursery" | "guard" | "queen";

export type Room = {
  id: RoomId;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Flower = { x: number; y: number; hue: number; used: boolean; sway: number };
export type Cell = { x: number; y: number; filled: boolean };
export type Larva = { x: number; y: number; fed: boolean; wiggle: number };
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

export type Hive = {
  tiles: Uint8Array;
  rooms: Room[];
  flowers: Flower[];
  cells: Cell[];
  larvae: Larva[];
  jelly: { x: number; y: number };
  workers: Worker[];
  hornets: Hornet[];
  queenCell: { x: number; y: number };
  doorTiles: Array<[number, number]>;
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
  if (ty < 0) return AIR; // 하늘은 끝없이 열려 있다
  return h.tiles[ty * WORLD_W + tx];
}

export function setTile(h: Hive, tx: number, ty: number, v: number) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;
  h.tiles[ty * WORLD_W + tx] = v;
}

export function isSolid(v: number) {
  return v !== AIR;
}

export function solidAt(h: Hive, px: number, py: number) {
  return isSolid(tileAt(h, Math.floor(px / TILE), Math.floor(py / TILE)));
}

// 방 배치 (타일 좌표, 내부 크기)
const ROOMS: Room[] = [
  { id: "hall", name: "현관홀", x: 62, y: 52, w: 30, h: 15 },
  { id: "vault", name: "꿀 저장방", x: 20, y: 54, w: 36, h: 17 },
  { id: "nursery", name: "육아방", x: 98, y: 54, w: 36, h: 19 },
  { id: "guard", name: "경비실", x: 46, y: 80, w: 46, h: 17 },
  { id: "queen", name: "왕대방", x: 58, y: 106, w: 38, h: 20 },
];

type Rect = { x: number; y: number; w: number; h: number };

// 방과 방을 잇는 통로
const CORRIDORS: Rect[] = [
  { x: 74, y: GROUND_Y - 1, w: 5, h: 14 }, // 입구 갱도 → 현관홀
  { x: 56, y: 58, w: 7, h: 6 }, // 현관홀 ↔ 저장방
  { x: 91, y: 58, w: 8, h: 6 }, // 현관홀 ↔ 육아방
  { x: 70, y: 66, w: 6, h: 15 }, // 현관홀 ↔ 경비실
  { x: 66, y: 96, w: 6, h: 11 }, // 경비실 ↔ 왕대방 (밀랍 문이 막고 있다)
];

const DOOR_ROW = 100; // 밀랍 문이 놓이는 줄

function carve(h: Hive, r: Rect) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (x < 1 || y < 0 || x >= WORLD_W - 1 || y >= WORLD_H - 2) continue;
      setTile(h, x, y, AIR);
    }
  }
}

export function roomOf(h: Hive, px: number, py: number): Room | null {
  const tx = px / TILE;
  const ty = py / TILE;
  for (const r of h.rooms) {
    if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r;
  }
  return null;
}

export function generateHive(seed: number): Hive {
  const rng = mulberry32(seed);
  const tiles = new Uint8Array(WORLD_W * WORLD_H);

  const h: Hive = {
    tiles,
    rooms: ROOMS.map((r) => ({ ...r })),
    flowers: [],
    cells: [],
    larvae: [],
    jelly: { x: 0, y: 0 },
    workers: [],
    hornets: [],
    queenCell: { x: 0, y: 0 },
    doorTiles: [],
    spawn: { x: 0, y: 0 },
    entrance: { x: 76 * TILE, y: (GROUND_Y - 1) * TILE },
  };

  // 하늘 / 잔디 / 흙
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      tiles[y * WORLD_W + x] = y < GROUND_Y ? AIR : y === GROUND_Y ? GRASS : SOIL;
    }
  }

  for (const r of h.rooms) carve(h, r);
  for (const c of CORRIDORS) carve(h, c);

  // 굴 벽에 밀랍을 두껍게 발라 준다 (빈 칸에서 2칸 이내의 흙)
  const src = Uint8Array.from(tiles);
  for (let y = GROUND_Y; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (src[y * WORLD_W + x] !== SOIL) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny <= GROUND_Y || nx >= WORLD_W || ny >= WORLD_H) continue;
          if (src[ny * WORLD_W + nx] === AIR) {
            near = true;
            break;
          }
        }
      }
      if (near) tiles[y * WORLD_W + x] = WAX;
    }
  }

  // 왕대방으로 내려가는 통로를 밀랍 문으로 막는다
  const doorCorridor = CORRIDORS[CORRIDORS.length - 1];
  for (let x = doorCorridor.x; x < doorCorridor.x + doorCorridor.w; x++) {
    for (let y = DOOR_ROW; y < DOOR_ROW + 2; y++) {
      setTile(h, x, y, DOOR);
      h.doorTiles.push([x, y]);
    }
  }

  // 꽃밭 (지상)
  const hues = [340, 20, 45, 280, 200, 320, 60, 15];
  for (let i = 0; i < 8; i++) {
    const tx = 12 + i * 16 + Math.floor(rng() * 5);
    h.flowers.push({
      x: tx * TILE + TILE / 2,
      y: GROUND_Y * TILE + 2,
      hue: hues[i % hues.length],
      used: false,
      sway: rng() * Math.PI * 2,
    });
  }

  const room = (id: RoomId) => h.rooms.find((r) => r.id === id)!;

  // 저장방: 채워야 할 빈 벌집칸
  const vault = room("vault");
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    h.cells.push({
      x: (vault.x + 7 + col * 8) * TILE,
      y: (vault.y + 5 + row * 6) * TILE,
      filled: false,
    });
  }

  // 육아방: 애벌레와 로열젤리 웅덩이
  const nursery = room("nursery");
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    h.larvae.push({
      x: (nursery.x + 6 + col * 9) * TILE,
      y: (nursery.y + 6 + row * 7) * TILE,
      fed: false,
      wiggle: rng() * Math.PI * 2,
    });
  }
  h.jelly = { x: (nursery.x + nursery.w - 4) * TILE, y: (nursery.y + nursery.h - 3) * TILE };

  // 경비실: 일벌과 말벌
  const guard = room("guard");
  for (let i = 0; i < 4; i++) {
    const wx = (guard.x + 6 + i * 5) * TILE;
    const wy = (guard.y + 4 + (i % 2) * 6) * TILE;
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
    const hx = (guard.x + guard.w - 12 + i * 7) * TILE;
    const hy = (guard.y + 5 + i * 5) * TILE;
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

  // 왕대 (여왕이 될 방)
  const queen = room("queen");
  h.queenCell = {
    x: (queen.x + queen.w / 2) * TILE,
    y: (queen.y + queen.h - 6) * TILE,
  };

  // 시작 위치: 꽃밭 입구 근처 하늘
  h.spawn = { x: h.entrance.x - 6 * TILE, y: (GROUND_Y - 4) * TILE };
  return h;
}
