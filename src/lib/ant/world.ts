// 개미집(땅속) 월드 생성기.
// 타일 기반 사이드뷰 맵: 지표면 아래로 수직 갱도와 방(chamber)이 이어진다.

export const TILE = 16;
export const WORLD_W = 168;
export const WORLD_H = 150;

export const AIR = 0;
export const DIRT = 1;
export const ROCK = 2;
export const GRASS = 3;
export const SAND = 4;

export type ItemKind = "crumb" | "moss" | "dew";

export type Item = {
  kind: ItemKind;
  x: number;
  y: number;
  taken: boolean;
  bob: number;
};

export type AntKind = "worker" | "soldier";

export type Ant = {
  kind: AntKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  climbing: boolean;
  hurtCooldown: number;
  wiggle: number;
  homeX: number;
  homeY: number;
};

export type Chamber = {
  x: number;
  y: number;
  r: number;
  kind: "shaft" | "food" | "nursery" | "queen" | "pocket";
};

export type World = {
  tiles: Uint8Array;
  surface: Int16Array;
  items: Item[];
  ants: Ant[];
  chambers: Chamber[];
  spawn: { x: number; y: number };
  queen: { x: number; y: number };
  crumbGoal: number;
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

export function tileAt(w: World, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return ROCK;
  return w.tiles[ty * WORLD_W + tx];
}

export function setTile(w: World, tx: number, ty: number, v: number) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;
  w.tiles[ty * WORLD_W + tx] = v;
}

export function isSolid(v: number) {
  return v !== AIR;
}

export function isDiggable(v: number) {
  return v === DIRT || v === GRASS || v === SAND;
}

export function solidAtPixel(w: World, px: number, py: number) {
  return isSolid(tileAt(w, Math.floor(px / TILE), Math.floor(py / TILE)));
}

function carveCircle(w: World, cx: number, cy: number, r: number) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 1 || y < 1 || x >= WORLD_W - 1 || y >= WORLD_H - 2) continue;
      const dx = x - cx;
      const dy = (y - cy) * 1.15; // 방을 살짝 납작하게
      if (dx * dx + dy * dy <= r2) setTile(w, x, y, AIR);
    }
  }
}

function carveTunnel(
  w: World,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  rng: () => number
) {
  // 수직 성분을 먼저, 수평 성분을 나중에 파서 개미집 특유의 갱도 모양을 만든다.
  const midY = y0 + (y1 - y0) * (0.45 + rng() * 0.25);
  const path: Array<[number, number]> = [
    [x0, y0],
    [x0 + (rng() - 0.5) * 4, midY],
    [x1, midY],
    [x1, y1],
  ];
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i];
    const [bx, by] = path[i + 1];
    const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const wobble = Math.sin(t * Math.PI * 3 + rng() * 0.2) * 0.8;
      carveCircle(w, ax + (bx - ax) * t + wobble, ay + (by - ay) * t, r);
    }
  }
}

/** 시작 지점에서 걸어(파지 않고) 닿을 수 있는 빈 칸 집합. */
function floodFill(w: World, sx: number, sy: number) {
  const seen = new Set<string>();
  const stack: Array<[number, number]> = [[sx, sy]];
  seen.add(sx + "," + sy);
  while (stack.length) {
    const cur = stack.pop()!;
    const [x, y] = cur;
    const neighbours: Array<[number, number]> = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of neighbours) {
      if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) continue;
      const key = nx + "," + ny;
      if (seen.has(key)) continue;
      if (tileAt(w, nx, ny) !== AIR) continue;
      seen.add(key);
      stack.push([nx, ny]);
    }
  }
  return seen;
}

function addItem(items: Item[], kind: ItemKind, tx: number, ty: number, rng: () => number) {
  items.push({
    kind,
    x: tx * TILE + TILE / 2 + (rng() - 0.5) * 6,
    y: ty * TILE + TILE / 2,
    taken: false,
    bob: rng() * Math.PI * 2,
  });
}

function floorBelow(w: World, tx: number, ty: number, limit = 12) {
  for (let y = ty; y < ty + limit; y++) {
    if (isSolid(tileAt(w, tx, y + 1)) && !isSolid(tileAt(w, tx, y))) return y;
  }
  return -1;
}

export function generateWorld(seed: number): World {
  const rng = mulberry32(seed);
  const tiles = new Uint8Array(WORLD_W * WORLD_H);
  const surface = new Int16Array(WORLD_W);

  const w: World = {
    tiles,
    surface,
    items: [],
    ants: [],
    chambers: [],
    spawn: { x: 0, y: 0 },
    queen: { x: 0, y: 0 },
    crumbGoal: 12,
  };

  // 1) 지표면 높이
  const base = 12;
  for (let x = 0; x < WORLD_W; x++) {
    const h =
      base +
      Math.round(
        Math.sin(x * 0.07) * 1.6 + Math.sin(x * 0.021 + 2.1) * 2.2 + (rng() - 0.5)
      );
    surface[x] = h;
  }

  // 2) 흙/돌 채우기
  for (let x = 0; x < WORLD_W; x++) {
    for (let y = 0; y < WORLD_H; y++) {
      const s = surface[x];
      let v: number;
      if (y < s) v = AIR;
      else if (y === s) v = GRASS;
      else if (y > WORLD_H - 5) v = ROCK;
      else v = DIRT;
      tiles[y * WORLD_W + x] = v;
    }
  }

  // 돌 덩어리 (파낼 수 없는 장애물)
  const rockBlobs = 90;
  for (let i = 0; i < rockBlobs; i++) {
    const cx = 2 + rng() * (WORLD_W - 4);
    const cy = base + 10 + rng() * (WORLD_H - base - 16);
    const r = 1.5 + rng() * 3.2;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        if (tiles[y * WORLD_W + x] === DIRT) tiles[y * WORLD_W + x] = ROCK;
      }
    }
  }

  // 모래층 (잘 파이는 구간)
  for (let i = 0; i < 26; i++) {
    const cx = rng() * WORLD_W;
    const cy = base + 14 + rng() * (WORLD_H - base - 20);
    const rx = 4 + rng() * 7;
    const ry = 1.5 + rng() * 2.5;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
        if (tiles[y * WORLD_W + x] !== AIR) tiles[y * WORLD_W + x] = SAND;
      }
    }
  }

  // 3) 입구와 갱도 파기
  const entranceX = Math.floor(WORLD_W * 0.16);
  const entranceY = surface[entranceX];
  carveCircle(w, entranceX, entranceY - 1, 2.4);

  const levels = 6;
  let prev: Chamber = { x: entranceX, y: entranceY + 2, r: 2, kind: "shaft" };
  w.chambers.push(prev);

  for (let level = 1; level <= levels; level++) {
    const depth = entranceY + 6 + level * ((WORLD_H - entranceY - 16) / levels);
    const branches = level === levels ? 1 : 2 + Math.floor(rng() * 2);
    const madeThisLevel: Chamber[] = [];

    for (let b = 0; b < branches; b++) {
      const spread = (WORLD_W - 20) * (0.15 + 0.85 * rng());
      const cx = Math.min(WORLD_W - 8, Math.max(8, Math.round(10 + spread)));
      const cy = Math.round(depth + (rng() - 0.5) * 6);
      let kind: Chamber["kind"] = "shaft";
      if (level === levels) kind = "queen";
      else if (b === 0 && level % 2 === 1) kind = "food";
      else if (b === 1 && level % 2 === 0) kind = "nursery";
      else if (rng() < 0.45) kind = "food";

      const r =
        kind === "queen" ? 8 : kind === "nursery" ? 5.5 : kind === "food" ? 5 : 3.4;
      const ch: Chamber = { x: cx, y: cy, r, kind };
      carveCircle(w, cx, cy, r);
      carveTunnel(w, prev.x, prev.y, cx, cy, 1.5 + rng() * 0.6, rng);
      w.chambers.push(ch);
      madeThisLevel.push(ch);
    }

    // 같은 층의 방들끼리도 옆으로 연결
    for (let i = 0; i < madeThisLevel.length - 1; i++) {
      carveTunnel(
        w,
        madeThisLevel[i].x,
        madeThisLevel[i].y,
        madeThisLevel[i + 1].x,
        madeThisLevel[i + 1].y,
        1.4,
        rng
      );
    }

    prev = madeThisLevel[Math.floor(rng() * madeThisLevel.length)];
  }

  // 막다른 주머니 (숨은 보상)
  for (let i = 0; i < 14; i++) {
    const from = w.chambers[1 + Math.floor(rng() * (w.chambers.length - 1))];
    const cx = Math.min(WORLD_W - 6, Math.max(6, from.x + Math.round((rng() - 0.5) * 34)));
    const cy = Math.min(WORLD_H - 8, Math.max(entranceY + 8, from.y + Math.round((rng() - 0.5) * 18)));
    carveTunnel(w, from.x, from.y, cx, cy, 1.2, rng);
    carveCircle(w, cx, cy, 2.2 + rng() * 1.4);
    w.chambers.push({ x: cx, y: cy, r: 2.5, kind: "pocket" });
  }

  // 4) 아이템 & 개미 배치
  const queenChamber = w.chambers.find((c) => c.kind === "queen")!;
  const queenFloor = floorBelow(
    w,
    queenChamber.x,
    Math.round(queenChamber.y - queenChamber.r),
    Math.ceil(queenChamber.r * 2.6) + 4
  );
  w.queen = {
    x: queenChamber.x * TILE + TILE / 2,
    y: (queenFloor < 0 ? queenChamber.y : queenFloor) * TILE + TILE - 2,
  };

  let crumbs = 0;
  for (const c of w.chambers) {
    if (c.kind === "shaft") continue;
    const count =
      c.kind === "food" ? 3 + Math.floor(rng() * 2) : c.kind === "pocket" ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const tx = Math.round(c.x + (rng() - 0.5) * (c.r * 1.3));
      const fy = floorBelow(w, tx, Math.round(c.y - c.r), Math.ceil(c.r * 2.6) + 4);
      if (fy < 0) continue;
      let kind: ItemKind = "crumb";
      if (c.kind === "pocket") kind = rng() < 0.6 ? "moss" : "dew";
      else if (c.kind === "nursery") kind = rng() < 0.5 ? "dew" : "crumb";
      else if (rng() < 0.22) kind = "moss";
      if (kind === "crumb") crumbs++;
      addItem(w.items, kind, tx, fy, rng);
    }
  }
  // 실제로 걸어서 닿을 수 있는 부스러기만 남기고, 목표치도 거기에 맞춘다.
  const reachable = floodFill(w, Math.floor(w.spawn.x / TILE), Math.floor(w.spawn.y / TILE));
  w.items = w.items.filter((it) =>
    reachable.has(Math.floor(it.x / TILE) + "," + Math.floor(it.y / TILE))
  );
  crumbs = w.items.filter((it) => it.kind === "crumb").length;
  w.crumbGoal = Math.max(4, Math.min(12, Math.floor(crumbs * 0.55)));

  for (const c of w.chambers) {
    if (c.kind === "shaft" || c.kind === "pocket") continue;
    const soldiers = c.kind === "queen" ? 2 : c.kind === "nursery" ? 2 : 1;
    const workers = c.kind === "food" ? 3 : 2;
    const push = (kind: AntKind) => {
      const tx = Math.round(c.x + (rng() - 0.5) * (c.r * 1.4));
      const fy = floorBelow(w, tx, Math.round(c.y - c.r), Math.ceil(c.r * 2.6) + 4);
      if (fy < 0) return;
      w.ants.push({
        kind,
        x: tx * TILE + TILE / 2,
        y: fy * TILE + TILE - 1,
        vx: 0,
        vy: 0,
        dir: rng() < 0.5 ? 1 : -1,
        climbing: false,
        hurtCooldown: 0,
        wiggle: rng() * Math.PI * 2,
        homeX: c.x * TILE,
        homeY: c.y * TILE,
      });
    };
    for (let i = 0; i < soldiers; i++) push("soldier");
    for (let i = 0; i < workers; i++) push("worker");
  }

  // 입구 옆 지면에서 시작한다 (해가 보이는 곳).
  const spawnTx = Math.max(2, entranceX - 4);
  w.spawn = { x: spawnTx * TILE + TILE / 2, y: (surface[spawnTx] - 1) * TILE - 1 };
  return w;
}
