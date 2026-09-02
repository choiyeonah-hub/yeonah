// 「왕벌의 비행 — 마누카 계곡」 엔진.
// 실제 꿀벌의 일령별 직무(temporal polyethism)를 그대로 스테이지로 삼는다.
// 청소벌 → 육아벌 → 건축벌 → 경비벌 → 채집벌 → (내가 기른 왕대에서 나온) 처녀왕.
import { BeeAudio } from "./music";
import { REGIONS, Region, nextRegion, regionById } from "./regions";
import { BEE, BLOSSOM, BLOSSOM_DROOP, BLOSSOM_SMALL, DRONE, HORNET, LARVA, QUEEN, Sprite } from "./sprites";
import {
  BOX,
  GROUND_Y,
  GRASS,
  LAYOUT,
  Hive,
  TILE,
  WAX,
  WOOD,
  WORLD_H,
  WORLD_W,
  Zone,
  generateHive,
  isSolid,
  tileAt,
  zoneOf,
} from "./world";

export const VIEW_W = 480;
export const VIEW_H = 320;

const ACCEL = 0.32;
const DRAG = 0.9;
const GRAVITY = 0.05;
const MAX_SPEED = 3.5;
const BEE_W = 16;
const BEE_H = 12;
/** 왕대 몸통의 중심(앵커에서 아래로)과 접촉 반경 — 그림과 판정을 반드시 같이 움직인다. */
const QUEEN_CELL_MID = 17;
const QUEEN_CELL_R = 42;

export type Status = "playing" | "wedding" | "ending";

export type Stage = {
  job: string;
  age: string;
  task: string;
  where: string;
  target: number;
  /** 스테이지를 마치면 뜨는 사실 카드 */
  fact: { title: string; body: string };
};

export const STAGES: Stage[] = [
  {
    job: "청소벌",
    age: "1~2일령",
    task: "갓 나온 방을 청소하자",
    where: "육아권",
    target: 6,
    fact: {
      title: "일벌의 첫 일은 청소다",
      body: "갓 태어난 일벌이 맨 처음 맡는 일은 자기가 나온 방을 닦는 것. 방이 깨끗해야 여왕이 그 자리에 다시 알을 낳는다.",
    },
  },
  {
    job: "육아벌",
    age: "3~11일령",
    task: "애벌레를 먹이고, 왕대(여왕이 될 방)에 로열젤리를 주자",
    where: "육아권",
    target: 9,
    fact: {
      title: "여왕은 태어나는 게 아니라 먹여서 만들어진다",
      body: "모든 애벌레는 같은 수정란에서 나온다. 처음 3일은 다 로열젤리를 먹지만, 그 뒤로도 로열젤리만 먹는 애벌레 하나만 여왕으로 자란다. 방금 네가 그 아이를 골랐다.",
    },
  },
  {
    job: "건축벌",
    age: "12~17일령",
    task: "밀랍을 내어 저장권에 방을 짓자",
    where: "꿀 저장권",
    target: 6,
    fact: {
      title: "밀랍은 배에서 나온다",
      body: "일벌은 배 아래 밀랍샘에서 얇은 밀랍 비늘을 뽑아낸다. 밀랍 100g을 만들려면 꿀을 1kg 가까이 먹어야 한다. 그래서 벌집 한 장이 비싸다.",
    },
  },
  {
    job: "경비벌",
    age: "18~21일령",
    task: "동료를 모아 말벌을 열구로 밀어내자",
    where: "입구·경비 구역",
    target: 2,
    fact: {
      title: "열구 — 체온으로 이기는 방어",
      body: "토종꿀벌은 말벌을 수백 마리가 공처럼 둘러싸고 날개근육을 떨어 온도를 47도까지 올린다. 벌은 견디고 말벌은 못 견디는 온도다.",
    },
  },
  {
    job: "채집벌",
    age: "22일령~",
    task: "마누카 꽃의 꿀을 저장권까지 나르자",
    where: "마누카 계곡",
    target: 6,
    fact: {
      title: "평생 모으는 꿀은 티스푼 한 술이 안 된다",
      body: "채집벌 한 마리가 평생 모으는 꿀은 티스푼 1/12쯤. 마누카는 한 해에 2~6주만 피기 때문에, 그 짧은 기간이 계곡 전체의 한 해를 결정한다.",
    },
  },
  {
    job: "처녀왕",
    age: "출방 직후",
    task: "하늘 높이 올라 혼인비행을 하자",
    where: "마누카 계곡 상공",
    target: 1,
    fact: {
      title: "혼인비행은 평생 한 번",
      body: "처녀왕은 딱 한 번 하늘로 올라 수벌들과 짝짓기하고, 그때 받은 정자로 평생 알을 낳는다. 수벌은 그 비행이 생의 마지막이다.",
    },
  },
];

export type BeeState = {
  hp: number;
  wing: number;
  nectar: number;
  jelly: number;
  wax: number;
  crew: number;
  stage: number;
  progress: number;
  target: number;
  isQueen: boolean;
  status: Status;
  message: string;
  zone: string;
  elapsed: number;
  fact: { title: string; body: string } | null;
  dizzy: boolean;
  regionId: string;
  regionName: string;
  regionCountry: string;
  climate: string;
  /** 다음 왕국이 열렸는가 (엔딩에서 분봉 안내) */
  nextRegionName: string | null;
};

export type InputName = "left" | "right" | "up" | "down" | "boost";

type Box = { x: number; y: number; w: number; h: number };

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  kind: "dot" | "heart" | "ring";
};

type Drone = { angle: number; radius: number; phase: number; x: number; y: number; dir: number };

function near(ax: number, ay: number, bx: number, by: number, r: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy < r * r;
}

function collides(hive: Hive, box: Box) {
  const x0 = Math.floor(box.x / TILE);
  const x1 = Math.floor((box.x + box.w - 0.001) / TILE);
  const y0 = Math.floor(box.y / TILE);
  const y1 = Math.floor((box.y + box.h - 0.001) / TILE);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (isSolid(tileAt(hive, x, y))) return true;
    }
  }
  return false;
}

/** 축을 나눠 조금씩 밀어 이동시킨다. 한 번에 크게 옮기면 벽을 파고든다. */
function moveBox(hive: Hive, box: Box, vx: number, vy: number) {
  const hit = { x: false, y: false };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) / 3));
  const sx = vx / steps;
  const sy = vy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      if (collides(hive, { ...box, x: box.x + sx })) {
        hit.x = true;
        const dir = Math.sign(sx);
        let guard = 0;
        while (guard++ < 8 && !collides(hive, { ...box, x: box.x + dir })) box.x += dir;
      } else box.x += sx;
    }
    if (sy !== 0) {
      if (collides(hive, { ...box, y: box.y + sy })) {
        hit.y = true;
        const dir = Math.sign(sy);
        let guard = 0;
        while (guard++ < 8 && !collides(hive, { ...box, y: box.y + dir })) box.y += dir;
      } else box.y += sy;
    }
  }
  return hit;
}

/** 어쩌다 벽에 박혔을 때 가장 가까운 빈 곳으로 밀어낸다. 없으면 영원히 갇힌다. */
function unstick(hive: Hive, box: Box) {
  if (!collides(hive, box)) return false;
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  for (let r = 2; r <= 40; r += 2) {
    for (const [dx, dy] of dirs) {
      const cand = { ...box, x: box.x + dx * r, y: box.y + dy * r };
      if (!collides(hive, cand)) {
        box.x = cand.x;
        box.y = cand.y;
        return true;
      }
    }
  }
  return false;
}

/** 화소 하나. 좌표를 반올림해 격자에 딱 맞춘다 — 안 그러면 움직일 때 떨린다. */
function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** 도트 스프라이트를 찍는다. dir 이 -1 이면 좌우로 뒤집는다. */
function blit(
  ctx: CanvasRenderingContext2D,
  sp: Sprite,
  palette: Record<string, string | undefined>,
  cx: number,
  cy: number,
  dir: number,
  zoom = 1
) {
  const ox = Math.round(cx - (sp.w * zoom) / 2);
  const oy = Math.round(cy - (sp.h * zoom) / 2);
  for (let r = 0; r < sp.h; r++) {
    const row = sp.rows[r];
    for (let c = 0; c < sp.w; c++) {
      const key = row[c];
      if (key === ".") continue;
      const color = palette[key];
      if (!color) continue;
      const col = dir < 0 ? sp.w - 1 - c : c;
      ctx.fillStyle = color;
      ctx.fillRect(ox + col * zoom, oy + r * zoom, zoom, zoom);
    }
  }
}

/** 계단식 육각형 — 곡선을 쓰면 픽셀아트가 뭉개진다. */
function pixelHex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  edge: string
) {
  const h = Math.round(r);
  const wide = Math.round(r * 0.866);
  for (let dy = -h; dy <= h; dy++) {
    const a = Math.abs(dy);
    // 가운데 절반은 곧은 옆면, 위아래 절반은 꼭짓점으로 좁아진다
    const half = a <= h / 2 ? wide : Math.round((wide * (h - a)) / (h / 2));
    if (half <= 0) continue;
    const y = cy + dy;
    px(ctx, cx - half, y, half * 2, 1, fill);
    px(ctx, cx - half, y, 1, 1, edge);
    px(ctx, cx + half - 1, y, 1, 1, edge);
  }
  // 위아래 꼭짓점 근처의 빗변을 또렷하게
  px(ctx, cx - 1, cy - h, 2, 1, edge);
  px(ctx, cx - 1, cy + h, 2, 1, edge);
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as [number, number, number];
}

/** 두 색을 t 만큼 섞는다 */
function mixHex(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(
    b1 + (b2 - b1) * k
  )})`;
}

/** 밝기만 올리거나 내린다 (-1 ~ 1) */
function shade(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function hash2(x: number, y: number) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

export class BeeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private vw = VIEW_W;
  private vh = VIEW_H;
  /** 게임 좌표 → 화면 픽셀 배율 */
  private scale = 1;
  private lastCssWidth = 0;
  private bgCache: HTMLCanvasElement | null = null;
  private bgCacheKey = "";
  private onState: (s: BeeState) => void;
  readonly audio = new BeeAudio();

  private hive!: Hive;
  private region: Region = REGIONS[0];
  private seed: number;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;
  private stateTick = 0;

  private input: Record<InputName, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  };

  private box: Box = { x: 0, y: 0, w: BEE_W, h: BEE_H };
  private vx = 0;
  private vy = 0;
  private facing: 1 | -1 = 1;
  private wingPhase = 0;

  private hp = 100;
  private wing = 100;
  private nectar = 0;
  private jelly = 0;
  private wax = 0;
  private isQueen = false;
  private invuln = 0;
  private hurtFlash = 0;
  private actCooldown = 0;
  private dizzy = 0;

  private stage = 0;
  private status: Status = "playing";
  private message = "";
  private messageTimer = 0;
  private elapsed = 0;
  private zoneLabel = "";
  private zoneTimer = 0;
  private lastZone = "";

  private pendingFact: Stage["fact"] | null = null;
  private factTimer = 0;

  private particles: Particle[] = [];
  private drones: Drone[] = [];
  private weddingTime = 0;
  private climateNoted = false;

  private camX = 0;
  private camY = 0;
  private combCache = new Map<string, HTMLCanvasElement>();

  constructor(
    canvas: HTMLCanvasElement,
    opts: { onState: (s: BeeState) => void; seed?: number; regionId?: string }
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.vw = canvas.width || VIEW_W;
    this.vh = canvas.height || VIEW_H;
    this.onState = opts.onState;
    this.seed = opts.seed ?? Math.floor(Math.random() * 1e9);
    this.region = regionById(opts.regionId ?? REGIONS[0].id);
    this.reset(this.seed, this.region.id);
  }

  get currentRegion() {
    return this.region;
  }

  reset(seed = Math.floor(Math.random() * 1e9), regionId = this.region.id) {
    this.seed = seed;
    this.region = regionById(regionId);
    this.hive = generateHive(seed, this.region);
    this.combCache.clear();
    this.box = { x: this.hive.spawn.x, y: this.hive.spawn.y, w: BEE_W, h: BEE_H };
    this.vx = 0;
    this.vy = 0;
    this.hp = 100;
    this.wing = 100;
    this.nectar = 0;
    this.jelly = 0;
    this.wax = 0;
    this.isQueen = false;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.dizzy = 0;
    this.stage = 0;
    this.status = "playing";
    this.elapsed = 0;
    this.particles = [];
    this.drones = [];
    this.weddingTime = 0;
    this.climateNoted = false;
    this.pendingFact = null;
    this.factTimer = 0;
    this.zoneTimer = 0;
    this.lastZone = "";
    this.audio.stopFlight();
    this.say(`${this.region.country} · ${this.region.name}. 나는 방금 방에서 나온 일벌이다.`, 4.5);
    this.updateCamera(true);
    this.emit();
    this.draw();
  }

  /** 분봉 — 무리를 데리고 다음 꿀 왕국으로 옮겨 간다. */
  swarm(): Region | null {
    const next = nextRegion(this.region.id);
    if (!next) return null;
    this.clearInput();
    this.reset(Math.floor(Math.random() * 1e9), next.id);
    return next;
  }

  /** 공유 카드에 쓸 한 판의 기록 */
  summary() {
    return {
      region: this.region,
      seconds: Math.floor(this.elapsed),
      cleaned: this.hive.brood.filter((c) => !c.dirty).length,
      fed: this.hive.brood.filter((c) => c.fed).length,
      built: this.hive.honey.filter((c) => c.built).length,
      filled: this.hive.honey.filter((c) => c.filled).length,
      predators: this.hive.hornets.filter((h) => !h.alive).length,
      predatorName: this.region.predator.name,
      done: this.status === "ending",
    };
  }

  /**
   * 공유용 결과 카드를 PNG 데이터 URL 로 그린다.
   * 꿀단지 라벨처럼 — 어디에 올려도 한눈에 무슨 게임인지 읽히게.
   */
  shareCard(): string {
    const S = 1080;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const c = cv.getContext("2d");
    if (!c) return "";
    const r = this.region;
    const sum = this.summary();

    // 바탕 — 그 지역의 하늘에서 밀랍색으로
    const bg = c.createLinearGradient(0, 0, 0, S);
    bg.addColorStop(0, r.sky[0]);
    bg.addColorStop(0.42, r.sky[1]);
    bg.addColorStop(0.42, "#1b1408");
    bg.addColorStop(1, "#0f0b04");
    c.fillStyle = bg;
    c.fillRect(0, 0, S, S);

    // 능선
    c.fillStyle = r.hills[1];
    c.beginPath();
    c.moveTo(0, S * 0.42);
    for (let x = 0; x <= S; x += 24) {
      c.lineTo(x, S * 0.42 - 60 - Math.sin(x * 0.006) * 46 - Math.sin(x * 0.017) * 18);
    }
    c.lineTo(S, S * 0.42);
    c.closePath();
    c.fill();

    // 육각 격자 (아래쪽 밀랍 영역)
    c.save();
    c.beginPath();
    c.rect(0, S * 0.42, S, S * 0.58);
    c.clip();
    const hr = 46;
    c.strokeStyle = "rgba(243,201,105,0.09)";
    c.lineWidth = 2;
    for (let row = 0; row * hr * 1.5 < S * 0.62; row++) {
      for (let col = -1; col * hr * 1.74 < S + hr * 2; col++) {
        const hx = col * hr * 1.74 + (row % 2 ? hr * 0.87 : 0);
        const hy = S * 0.42 + row * hr * 1.5;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          const px = hx + Math.cos(a) * hr;
          const py = hy + Math.sin(a) * hr;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
        c.stroke();
      }
    }
    c.restore();

    // 여왕벌 — 엔진의 벌 그리기를 그대로 빌려 쓴다
    const beeY = S * 0.3;
    const keep = this.ctx;
    this.ctx = c;
    c.save();
    c.translate(S / 2, beeY);
    c.scale(7.4, 7.4);
    c.translate(-S / 2, -beeY);
    this.drawBee(S / 2, beeY, 1, 1, 0.8, sum.done ? "queen" : "player");
    c.restore();
    this.ctx = keep;

    c.textAlign = "center";
    // 위쪽에 게임 이름
    c.fillStyle = "rgba(24,16,4,0.5)";
    c.font = "700 34px 'Gowun Batang', serif";
    c.fillText("왕벌의 비행", S / 2, 78);
    c.fillStyle = "rgba(24,16,4,0.34)";
    c.font = "400 21px 'IBM Plex Sans KR', system-ui, sans-serif";
    c.fillText("다섯 개의 꿀 왕국", S / 2, 112);
    // 왕국 이름
    c.fillStyle = "#f3c969";
    c.font = "700 74px 'Gowun Batang', serif";
    c.fillText(r.name, S / 2, S * 0.585);
    c.fillStyle = "rgba(240,224,190,0.7)";
    c.font = "500 30px 'IBM Plex Sans KR', system-ui, sans-serif";
    c.fillText(`${r.country} · ${r.honey}`, S / 2, S * 0.63);

    // 성적
    const stats: Array<[string, string]> = [
      ["청소한 방", `${sum.cleaned}`],
      ["돌본 애벌레", `${sum.fed}`],
      ["지은 방", `${sum.built}`],
      ["채운 꿀", `${sum.filled}`],
      [`${sum.predatorName} 격퇴`, `${sum.predators}`],
      ["걸린 시간", `${Math.floor(sum.seconds / 60)}:${String(sum.seconds % 60).padStart(2, "0")}`],
    ];
    const cols = 3;
    const x0 = S * 0.5 - (cols - 1) * 150;
    stats.forEach(([label, val], i) => {
      const cx = x0 + (i % cols) * 300;
      const cy = S * 0.71 + Math.floor(i / cols) * 108;
      c.fillStyle = "#f6ecd8";
      c.font = "600 46px 'IBM Plex Sans KR', system-ui, sans-serif";
      c.fillText(val, cx, cy);
      c.fillStyle = "rgba(200,180,140,0.72)";
      c.font = "400 24px 'IBM Plex Sans KR', system-ui, sans-serif";
      c.fillText(label, cx, cy + 32);
    });

    // 아래 띠 — 제목과 한 줄
    c.fillStyle = "rgba(243,201,105,0.14)";
    c.fillRect(0, S - 118, S, 118);
    c.fillStyle = "#f3c969";
    c.font = "700 40px 'Gowun Batang', serif";
    c.fillText(
      sum.done ? "👑 새 여왕이 태어났다" : `${r.name}에서 일하는 중`,
      S / 2,
      S - 66
    );
    c.fillStyle = "rgba(240,224,190,0.66)";
    c.font = "400 25px 'IBM Plex Sans KR', system-ui, sans-serif";
    c.fillText("왕벌의 비행 — 꿀벌 한 마리의 일생을 사는 게임", S / 2, S - 28);

    return cv.toDataURL("image/png");
  }

  setInput(name: InputName, down: boolean) {
    if (down && this.pendingFact) this.dismissFact();
    this.input[name] = down;
  }

  clearInput() {
    (Object.keys(this.input) as InputName[]).forEach((k) => (this.input[k] = false));
  }

  setMuted(muted: boolean) {
    this.audio.setMuted(muted);
  }

  dismissFact() {
    this.pendingFact = null;
    this.factTimer = 0;
    this.emit();
  }

  /**
   * vw/vh 는 게임이 쓰는 좌표계, 캔버스는 화면 픽셀만큼 크게 잡는다.
   * 저해상도로 그려 뻥튀기하면 옛날 오락실 화면이 된다.
   */
  resize(width: number, height: number, cssWidth?: number, force = false) {
    const w = Math.max(240, Math.round(width));
    const h = Math.max(200, Math.round(height));
    if (cssWidth && cssWidth > 0) this.lastCssWidth = cssWidth;
    const dpr = Math.min(2.5, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
    const css = this.lastCssWidth;
    // 화소 하나가 화면 픽셀 정수 배가 되게 한다. 소수 배율은 픽셀이 들쭉날쭉해진다.
    const target = css > 0 ? (css * dpr) / w : this.scale;
    const scale = Math.max(1, Math.min(4, Math.round(target)));
    if (!force && w === this.vw && h === this.vh && scale === this.scale) return;
    this.vw = w;
    this.vh = h;
    this.scale = scale;
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    this.canvas.style.imageRendering = "pixelated";
    this.ctx.imageSmoothingEnabled = false;
    this.combCache.clear();
    this.bgCache = null;
    this.updateCamera(true);
    this.draw();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (t - this.last) / 1000);
      this.last = t;
      this.acc += dt;
      const step = 1 / 60;
      let guard = 0;
      while (this.acc >= step && guard < 5) {
        this.update(step);
        this.acc -= step;
        guard++;
      }
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.audio.stopFlight();
    this.audio.setWing(0);
  }

  private say(text: string, seconds = 2.6) {
    this.message = text;
    this.messageTimer = seconds;
  }

  /** 벌통 밖(들판·하늘)에 있는가 */
  private isOutdoors() {
    const tx = this.cx / TILE;
    return tx < BOX.x || tx > BOX.x + BOX.w;
  }

  private get cx() {
    return this.box.x + this.box.w / 2;
  }
  private get cy() {
    return this.box.y + this.box.h / 2;
  }

  private progress() {
    const h = this.hive;
    switch (this.stage) {
      case 0:
        return h.brood.filter((c) => !c.dirty).length;
      case 1:
        return h.brood.filter((c) => c.fed).length + h.queenCell.jelly;
      case 2:
        return h.honey.filter((c) => c.built).length;
      case 3:
        return h.hornets.filter((x) => !x.alive).length;
      case 4:
        return h.honey.filter((c) => c.filled).length;
      default:
        return this.status === "playing" ? 0 : 1;
    }
  }

  private emit() {
    const st = STAGES[Math.min(this.stage, STAGES.length - 1)];
    this.onState({
      hp: Math.max(0, Math.round(this.hp)),
      wing: Math.round(this.wing),
      nectar: this.nectar,
      jelly: this.jelly,
      wax: Math.round(this.wax),
      crew: this.hive.workers.filter((w) => w.recruited).length,
      stage: this.stage,
      progress: Math.min(this.progress(), st.target),
      target: st.target,
      isQueen: this.isQueen,
      status: this.status,
      message: this.messageTimer > 0 ? this.message : "",
      zone: this.zoneTimer > 0 ? this.zoneLabel : "",
      elapsed: this.elapsed,
      fact: this.pendingFact,
      dizzy: this.dizzy > 0,
      regionId: this.region.id,
      regionName: this.region.name,
      regionCountry: this.region.country,
      climate: this.region.climate.label,
      nextRegionName: nextRegion(this.region.id)?.name ?? null,
    });
  }

  // -------------------------------------------------------------- 업데이트

  private update(dt: number) {
    if (this.pendingFact) {
      this.factTimer -= dt;
      if (this.factTimer <= 0) this.dismissFact();
      this.updateParticles(dt);
      return;
    }

    this.elapsed += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.zoneTimer > 0) this.zoneTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.actCooldown > 0) this.actCooldown -= dt;
    if (this.dizzy > 0) this.dizzy -= dt;

    this.updateBee(dt);
    this.updateWorkers(dt);
    this.updateHornets(dt);
    this.updateFlowers(dt);
    this.updateActions();
    this.updateStage();
    this.updateParticles(dt);
    if (this.status !== "playing") this.updateWedding(dt);
    this.updateCamera(false);
    this.updateZoneLabel();

    this.stateTick += dt;
    if (this.stateTick > 0.1) {
      this.stateTick = 0;
      this.emit();
    }
  }

  private updateBee(dt: number) {
    const inp = this.input;
    const tired = this.wing <= 1;
    const boosting = inp.boost && this.wing > 5;
    const thrusting = inp.left || inp.right || inp.up || inp.down;
    const flip = this.dizzy > 0 ? -1 : 1; // 농약에 취하면 방향 감각이 뒤집힌다

    let accel = ACCEL * (tired ? 0.4 : 1) * (boosting ? 1.7 : 1);
    if (this.isQueen) accel *= 1.1;

    if (inp.left) this.vx -= accel * flip;
    if (inp.right) this.vx += accel * flip;
    if (inp.up) this.vy -= accel * flip;
    if (inp.down) this.vy += accel * flip;

    if (this.vx < -0.15) this.facing = -1;
    if (this.vx > 0.15) this.facing = 1;

    this.vy += GRAVITY * (tired ? 2.6 : 1);
    this.vx *= DRAG;
    this.vy *= DRAG;

    const speed = Math.hypot(this.vx, this.vy);
    const max = MAX_SPEED * (boosting ? 1.3 : 1);
    if (speed > max) {
      this.vx = (this.vx / speed) * max;
      this.vy = (this.vy / speed) * max;
    }

    const outside = this.isOutdoors();
    const climate = this.region.climate.kind;
    // 혹서: 바깥에 있으면 날개 힘이 빨리 마른다
    const heat = outside && climate === "heat" ? 2.3 : 1;
    if (thrusting) this.wing = Math.max(0, this.wing - (boosting ? 24 : 10) * heat * dt);
    else this.wing = Math.min(100, this.wing + (outside && climate === "heat" ? 14 : 26) * dt);

    // 해풍: 바깥에서는 옆으로 계속 밀린다
    if (outside && climate === "wind") {
      this.vx += (Math.sin(this.elapsed * 0.55) * 0.5 + 0.28) * 0.34;
    }

    // 바깥에 처음 나갔을 때 그 땅의 기후를 한 번 알려 준다
    if (outside && !this.climateNoted) {
      this.climateNoted = true;
      this.say(`${this.region.climate.label} — ${this.region.climate.note}`, 5);
    }

    // 건축벌은 날개 힘을 밀랍으로 바꾼다
    if (this.stage === 2 && !thrusting) this.wax = Math.min(6, this.wax + 1.1 * dt);

    this.wingPhase += dt * (26 + speed * 8);

    if (unstick(this.hive, this.box)) {
      this.vx = 0;
      this.vy = 0;
    }
    const hit = moveBox(this.hive, this.box, this.vx, this.vy);
    if (hit.x) this.vx *= -0.3;
    if (hit.y) this.vy *= -0.3;

    this.box.x = Math.max(TILE, Math.min(WORLD_W * TILE - TILE - this.box.w, this.box.x));
    this.box.y = Math.max(-640, Math.min(WORLD_H * TILE - TILE, this.box.y));

    this.audio.setWing(Math.min(1, speed / MAX_SPEED));

    if (speed > 1.6 && Math.random() < 0.14) {
      this.particles.push({
        x: this.cx,
        y: this.cy,
        vx: -this.vx * 0.15,
        vy: -this.vy * 0.15 - 0.12,
        life: 0.4,
        maxLife: 0.4,
        color: this.dizzy > 0 ? "rgba(180,255,180,0.8)" : "rgba(255,224,130,0.8)",
        size: 1.6,
        kind: "dot",
      });
    }
  }

  private updateWorkers(dt: number) {
    const crew = this.hive.workers.filter((w) => w.recruited);
    crew.forEach((w, i) => {
      w.phase += dt * 6;
      const behind = (i + 1) * 20;
      const tx = this.cx - this.facing * behind + Math.cos(w.phase) * 5;
      const ty = this.cy - 12 + Math.sin(w.phase * 1.3) * 6;
      w.vx += (tx - w.x) * 0.06;
      w.vy += (ty - w.y) * 0.06;
      w.vx *= 0.85;
      w.vy *= 0.85;
      w.x += w.vx;
      w.y += w.vy;
    });
    for (const w of this.hive.workers) {
      if (w.recruited) continue;
      w.phase += dt * 2.2;
      w.x = w.homeX + Math.cos(w.phase) * 18;
      w.y = w.homeY + Math.sin(w.phase * 1.7) * 9;
    }
  }

  private updateHornets(dt: number) {
    for (const hn of this.hive.hornets) {
      if (!hn.alive) continue;
      hn.wiggle += dt * 8;
      const dx = this.cx - hn.x;
      const dy = this.cy - hn.y;
      const dist = Math.hypot(dx, dy);
      const chase = dist < 170 && this.stage >= 3 && this.status === "playing";
      if (chase) {
        hn.vx += (dx / (dist || 1)) * 0.085;
        hn.vy += (dy / (dist || 1)) * 0.085;
      } else {
        hn.vx += (hn.homeX - hn.x) * 0.005 + Math.cos(hn.wiggle * 0.4) * 0.03;
        hn.vy += (hn.homeY - hn.y) * 0.005 + Math.sin(hn.wiggle * 0.5) * 0.03;
      }
      hn.vx *= 0.94;
      hn.vy *= 0.94;
      const sp = Math.hypot(hn.vx, hn.vy);
      const cap = (chase ? 2.1 : 1) * this.region.predator.speed;
      if (sp > cap) {
        hn.vx = (hn.vx / sp) * cap;
        hn.vy = (hn.vy / sp) * cap;
      }
      const b: Box = { x: hn.x - 9, y: hn.y - 7, w: 18, h: 13 };
      unstick(this.hive, b);
      const hit = moveBox(this.hive, b, hn.vx, hn.vy);
      if (hit.x) hn.vx *= -0.6;
      if (hit.y) hn.vy *= -0.6;
      hn.x = b.x + 9;
      hn.y = b.y + 7;
    }
  }

  private updateFlowers(dt: number) {
    for (const f of this.hive.flowers) {
      f.sway += dt;
      if (f.used) {
        f.regrow -= dt * (this.region.climate.kind === "shortBloom" ? 0.55 : 1);
        if (f.regrow <= 0) f.used = false;
      }
    }
  }

  private updateActions() {
    const h = this.hive;
    const px = this.cx;
    const py = this.cy;
    if (this.actCooldown > 0) return;

    // 0. 청소벌 — 더러운 방 닦기
    if (this.stage === 0) {
      for (const c of h.brood) {
        if (!c.dirty || !near(px, py, c.x, c.y, 27)) continue;
        c.dirty = false;
        this.actCooldown = 0.2;
        this.audio.sfx("deposit");
        this.burst(c.x, c.y, "#cbb18a", 10);
        this.say("방 하나를 닦았다", 1.1);
        return;
      }
    }

    // 1. 육아벌 — 젤리를 떠서 애벌레와 왕대에
    if (this.stage === 1) {
      if (this.jelly < 3 && near(px, py, h.jellyPool.x, h.jellyPool.y, 32)) {
        this.jelly++;
        this.actCooldown = 0.22;
        this.audio.sfx("sip");
        this.say(`로열젤리를 떴다 (${this.jelly}/3)`, 1.2);
        this.burst(h.jellyPool.x, h.jellyPool.y - 6, "#fff4d0", 8);
        return;
      }
      // 빈손으로 애벌레를 건드리면 왜 안 되는지 알려 준다
      if (this.jelly <= 0 && this.messageTimer <= 0) {
        const hungry =
          h.brood.some((c) => c.larva && !c.fed && near(px, py, c.x, c.y, 30)) ||
          (h.queenCell.jelly < 3 &&
            near(px, py, h.queenCell.x, h.queenCell.y + QUEEN_CELL_MID, QUEEN_CELL_R));
        if (hungry) this.say("로열젤리가 없다! 젤리 웅덩이에서 떠 오자", 2);
      }
      if (this.jelly > 0) {
        for (const c of h.brood) {
          if (c.dirty || !c.larva || c.fed || !near(px, py, c.x, c.y, 30)) continue;
          c.fed = true;
          this.jelly--;
          this.actCooldown = 0.25;
          this.audio.sfx("feed");
          this.say("애벌레가 먹었다", 1.1);
          this.burst(c.x, c.y - 4, "#fff1c9", 10);
          return;
        }
        const q = h.queenCell;
        // 왕대는 q.y 에서 아래로 늘어지게 그려진다. 판정도 그 몸통 한가운데에 둔다.
        if (q.jelly < 3 && near(px, py, q.x, q.y + QUEEN_CELL_MID, QUEEN_CELL_R)) {
          q.jelly++;
          this.jelly--;
          this.actCooldown = 0.35;
          this.audio.sfx("crown");
          this.burst(q.x, q.y, "#ffe9a3", 16);
          this.say(
            q.jelly >= 3
              ? "왕대의 애벌레는 로열젤리만 먹었다. 이 아이가 여왕이 된다."
              : `여왕이 될 애벌레에게 로열젤리 (${q.jelly}/3)`,
            q.jelly >= 3 ? 3.5 : 1.4
          );
          if (q.jelly >= 3) q.capped = true;
          return;
        }
      }
    }

    // 2. 건축벌 — 밀랍으로 방 짓기
    if (this.stage === 2 && this.wax >= 1) {
      for (const c of h.honey) {
        if (c.built || !near(px, py, c.x, c.y, 27)) continue;
        c.built = true;
        this.wax -= 1;
        this.actCooldown = 0.25;
        this.audio.sfx("deposit");
        this.burst(c.x, c.y, "#ffdf9a", 12);
        this.say("육각방 하나를 지었다", 1.2);
        return;
      }
    }

    // 3. 경비벌 — 동료 모으고 말벌 밀어내기
    if (this.stage === 3) {
      for (const w of h.workers) {
        if (w.recruited || !near(px, py, w.x, w.y, 28)) continue;
        w.recruited = true;
        this.audio.sfx("recruit");
        this.say("동료가 따라온다!", 1.2);
        this.burst(w.x, w.y, "#ffe9a3", 8);
        return;
      }
    }

    // 4. 채집벌 — 마누카 꿀을 떠서 지어 둔 방에 채우기
    if (this.stage === 4) {
      if (this.nectar < 3) {
        for (const f of h.flowers) {
          if (f.used || !near(px, py, f.x, f.y - 10, 26)) continue;
          f.used = true;
          f.regrow = 14;
          this.actCooldown = 0.25;
          if (f.sprayed) {
            this.dizzy = 4.5;
            this.audio.sfx("hit");
            this.say("농약이 묻은 꽃이다! 방향 감각이 흐려진다...", 3);
            this.burst(f.x, f.y - 12, "#b6ff9e", 14);
          } else {
            this.nectar++;
            this.wing = Math.min(100, this.wing + 14);
            this.audio.sfx("sip");
            this.say(`마누카 꿀 (${this.nectar}/3)`, 1.2);
            this.burst(f.x, f.y - 12, "#ffd76a", 10);
          }
          return;
        }
      }
      if (this.nectar > 0) {
        for (const c of h.honey) {
          if (!c.built || c.filled || !near(px, py, c.x, c.y, 27)) continue;
          c.filled = true;
          this.nectar--;
          this.actCooldown = 0.25;
          this.audio.sfx("deposit");
          this.burst(c.x, c.y, "#ffbe3d", 12);
          this.say("저장권에 꿀을 채웠다", 1.2);
          return;
        }
      }
    }

    // 말벌 접촉 (경비 단계 이후 항상)
    if (this.stage >= 3) {
      const crew = h.workers.filter((w) => w.recruited).length;
      for (const hn of h.hornets) {
        if (!hn.alive || !near(px, py, hn.x, hn.y, 26)) continue;
        if (crew >= 2) {
          hn.alive = false;
          this.audio.sfx("defeat");
          this.say("동료들이 열구를 만들어 말벌을 밀어냈다!", 2.6);
          this.burst(hn.x, hn.y, "#ffd166", 26);
          this.particles.push({
            x: hn.x,
            y: hn.y,
            vx: 0,
            vy: 0,
            life: 0.6,
            maxLife: 0.6,
            color: "#ffb703",
            size: 30,
            kind: "ring",
          });
        } else if (this.invuln <= 0) {
          this.hurt(14, hn.x, hn.y);
        }
        return;
      }
    }
  }

  private hurt(amount: number, fromX: number, fromY: number) {
    this.hp -= amount;
    this.invuln = 1.2;
    this.hurtFlash = 0.3;
    const dx = this.cx - fromX;
    const dy = this.cy - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.vx = (dx / d) * 3.4;
    this.vy = (dy / d) * 3.4;
    this.audio.sfx("hit");
    this.burst(this.cx, this.cy, "#ff8a7a", 12);
    if (this.hp <= 0) {
      const z = this.hive.zones.find((r) => r.id === "brood")!;
      this.box.x = (z.x + 3) * TILE;
      this.box.y = (z.y + 4) * TILE;
      this.vx = 0;
      this.vy = 0;
      this.hp = 60;
      this.wing = 60;
      this.invuln = 2;
      this.hive.workers.forEach((w) => (w.recruited = false));
      this.say("쫓겨났다가 육아권에서 정신을 차렸다...", 3);
    }
    this.emit();
  }

  private updateStage() {
    const st = STAGES[this.stage];
    if (!st) return;

    if (this.stage === 5) {
      if (this.status === "playing" && this.cy < 2 * TILE) this.beginWedding();
      return;
    }

    if (this.progress() < st.target) return;

    this.pendingFact = st.fact;
    this.factTimer = 7;
    this.stage++;
    this.audio.sfx("quest");
    this.onStageStart();
    this.emit();
  }

  /** 새 스테이지가 열릴 때의 연출과 준비 */
  private onStageStart() {
    const h = this.hive;
    switch (this.stage) {
      case 1:
        // 닦아 둔 방에 여왕이 알을 낳았다 → 애벌레
        h.brood.forEach((c) => {
          if (!c.dirty) c.larva = true;
        });
        this.say(
          "여왕이 닦아 둔 방마다 알을 낳았다. 젤리 웅덩이에서 젤리를 떠서 애벌레에게 가자.",
          5
        );
        break;
      case 2:
        this.say("밀랍샘이 자랐다. 가만히 있으면 밀랍이 모인다.", 4);
        break;
      case 3:
        this.say("입구를 지킬 차례. 동료 둘 이상을 데리고 부딪치자.", 4);
        break;
      case 4:
        this.say("드디어 바깥이다. 왼쪽 입구로 나가 마누카 꽃을 찾자.", 4.5);
        break;
      case 5: {
        // 시점 전환 — 내가 로열젤리를 먹인 그 애벌레가 여왕이 되어 나온다
        this.isQueen = true;
        this.box.x = h.queenCell.x - this.box.w / 2;
        this.box.y = h.queenCell.y - 24;
        this.vx = 0;
        this.vy = 0;
        this.hp = 100;
        this.wing = 100;
        this.audio.sfx("crown");
        this.burst(h.queenCell.x, h.queenCell.y, "#ffe9a3", 40);
        this.say("네가 로열젤리를 먹인 그 애벌레가 여왕이 되어 나왔다. 이제 그 여왕이 너다.", 6);
        break;
      }
    }
  }

  private beginWedding() {
    this.status = "wedding";
    this.weddingTime = 0;
    this.audio.startFlight();
    this.say("수벌들이 몰려온다 — 혼인비행이다!", 5);
    this.drones = [];
    for (let i = 0; i < 9; i++) {
      this.drones.push({
        angle: (i / 9) * Math.PI * 2,
        radius: 70 + (i % 3) * 26,
        phase: Math.random() * Math.PI * 2,
        x: this.cx,
        y: this.cy,
        dir: 1,
      });
    }
    this.emit();
  }

  private updateWedding(dt: number) {
    this.weddingTime += dt;
    const t = this.weddingTime;
    for (const d of this.drones) {
      const spin = t * 1.15 + d.angle;
      const px = this.cx + Math.cos(spin) * d.radius;
      const py = this.cy + Math.sin(spin * 2 + d.phase) * d.radius * 0.42 + Math.sin(t * 2) * 6;
      d.dir = px > d.x ? 1 : -1;
      d.x += (px - d.x) * 0.16;
      d.y += (py - d.y) * 0.16;
    }
    if (Math.random() < dt * 14) {
      const d = this.drones[Math.floor(Math.random() * this.drones.length)];
      if (d) {
        this.particles.push({
          x: d.x,
          y: d.y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.5 - Math.random() * 0.5,
          life: 1.6,
          maxLife: 1.6,
          color: "#ff9ec7",
          size: 5,
          kind: "heart",
        });
      }
    }
    if (this.status === "wedding" && t > 11) {
      this.status = "ending";
      this.pendingFact = this.region.fact;
      this.factTimer = 9;
      this.emit();
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind === "dot") p.vy += 0.03;
    }
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.4 + Math.random() * 1.8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color,
        size: 1.4 + Math.random() * 1.8,
        kind: "dot",
      });
    }
  }

  private updateZoneLabel() {
    const z = zoneOf(this.hive, this.cx, this.cy);
    const id = z ? z.id : this.cy < GROUND_Y * TILE ? "meadow" : "";
    if (id && id !== this.lastZone) {
      this.lastZone = id;
      this.zoneLabel = z ? z.name : this.region.name;
      this.zoneTimer = 2.2;
    } else if (!id) this.lastZone = "";
  }

  private updateCamera(snap: boolean) {
    const tx = this.cx - this.vw / 2 + this.vx * 12;
    const ty = this.cy - this.vh / 2 + this.vy * 8;
    const cx = Math.max(0, Math.min(WORLD_W * TILE - this.vw, tx));
    const cy = Math.max(-640, Math.min(WORLD_H * TILE - this.vh, ty));
    if (snap) {
      this.camX = cx;
      this.camY = cy;
    } else {
      this.camX += (cx - this.camX) * 0.11;
      this.camY += (cy - this.camY) * 0.11;
    }
    // 카메라가 소수 자리에 있으면 배경 전체가 미세하게 떤다
    this.camX = Math.round(this.camX);
    this.camY = Math.round(this.camY);
  }

  private target(): { x: number; y: number } | null {
    const h = this.hive;
    const nearest = <T extends { x: number; y: number }>(list: T[]) => {
      let best: T | null = null;
      let bd = Infinity;
      for (const it of list) {
        const d = (it.x - this.cx) ** 2 + (it.y - this.cy) ** 2;
        if (d < bd) {
          bd = d;
          best = it;
        }
      }
      return best;
    };
    switch (this.stage) {
      case 0:
        return nearest(h.brood.filter((c) => c.dirty));
      case 1:
        if (this.jelly <= 0) return h.jellyPool;
        return (
          nearest(h.brood.filter((c) => c.larva && !c.fed)) ??
          (h.queenCell.jelly < 3
            ? { x: h.queenCell.x, y: h.queenCell.y + QUEEN_CELL_MID }
            : null)
        );
      case 2:
        return nearest(h.honey.filter((c) => !c.built));
      case 3:
        return h.workers.filter((w) => w.recruited).length >= 2
          ? nearest(h.hornets.filter((x) => x.alive))
          : nearest(h.workers.filter((w) => !w.recruited));
      case 4:
        return this.nectar > 0
          ? nearest(h.honey.filter((c) => c.built && !c.filled))
          : nearest(h.flowers.filter((f) => !f.used && !f.sprayed));
      default:
        return { x: this.cx, y: -500 };
    }
  }

  // ------------------------------------------------------------------ 렌더

  private draw() {
    const ctx = this.ctx;
    const camX = Math.round(this.camX);
    const camY = Math.round(this.camY);

    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.drawSky(camY);

    ctx.save();
    ctx.translate(-camX, -camY);
    this.drawClouds(camX, camY);
    this.drawHills(camX, camY);
    this.drawTerrain(camX, camY);
    this.drawHiveShell();
    this.drawCombZones(camX, camY);
    this.drawDividers();
    this.drawFlowers(camX, camY);
    this.drawProps(camX, camY);
    this.drawWorkers();
    this.drawHornets();
    if (this.status !== "playing") this.drawDrones();
    this.drawPlayer();
    this.drawParticles();
    ctx.restore();

    this.drawVignette();
    this.drawCompass(camX, camY);

    if (this.dizzy > 0) {
      ctx.fillStyle = `rgba(150,255,150,${0.1 + Math.sin(this.elapsed * 8) * 0.05})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
    }
    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,70,70,${this.hurtFlash * 0.45})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
    }
  }

  private drawSky(camY: number) {
    const ctx = this.ctx;
    const high = Math.max(0, Math.min(1, -camY / 640));
    const g = ctx.createLinearGradient(0, 0, 0, this.vh);
    // 높이 오를수록 하늘이 짙어진다
    g.addColorStop(0, mixHex(this.region.sky[0], "#0d2246", high * 0.72));
    g.addColorStop(1, mixHex(this.region.sky[1], "#20406e", high * 0.62));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.vw, this.vh);

    const sunY = 60 - camY * 0.05;
    if (sunY > -70 && sunY < this.vh + 70) {
      const sx = this.vw * 0.8;
      const rg = ctx.createRadialGradient(sx, sunY, 4, sx, sunY, 74);
      rg.addColorStop(0, "rgba(255,248,216,0.95)");
      rg.addColorStop(1, "rgba(255,248,216,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(sx, sunY, 74, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawClouds(camX: number, camY: number) {
    const ctx = this.ctx;
    for (let i = 0; i < 10; i++) {
      const n = hash2(i, 3);
      const cx = ((i * 311 + this.elapsed * 5) % (WORLD_W * TILE + 400)) - 200 + camX * 0.4;
      const cy = -300 + n * 560 + camY * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${0.45 + n * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 44 + n * 30, 14 + n * 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 26, cy + 5, 28 + n * 15, 10 + n * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 먼 능선 — 4칸짜리 계단으로 찍는다 */
  private drawHills(camX: number, camY: number) {
    const ctx = this.ctx;
    const baseY = GROUND_Y * TILE;
    const step = 4;
    for (let layer = 0; layer < 2; layer++) {
      const p = 0.55 + layer * 0.2;
      const amp = 44 - layer * 16;
      const off = camX * (1 - p);
      ctx.fillStyle = this.region.hills[layer];
      const x0 = Math.floor((camX - 20) / step) * step;
      for (let x = x0; x < camX + this.vw + 20; x += step) {
        const t = (x + off) * 0.006 + layer * 2.3;
        const top = Math.round(
          (baseY - 40 - layer * 26 + Math.sin(t) * amp + Math.sin(t * 2.7) * amp * 0.35) / 3
        ) * 3;
        px(ctx, x, top, step, baseY + 10 - top, this.region.hills[layer]);
      }
    }
    void camY;
  }

  /** 땅 — 몇 개의 평평한 띠와 디더로. 그라디언트는 픽셀아트에서 지저분해진다. */
  private drawTerrain(camX: number, camY: number) {
    const ctx = this.ctx;
    const gy = GROUND_Y * TILE;
    const bottom = WORLD_H * TILE;
    if (camY + this.vh < gy) return;
    const left = Math.round(camX) - 20;
    const wide = this.vw + 40;

    // 흙 — 위에서 아래로 세 단계
    const soils = [shade(this.region.soil, 0.04), this.region.soil, shade(this.region.soil, -0.3)];
    px(ctx, left, gy + 6, wide, 26, soils[0]);
    px(ctx, left, gy + 32, wide, 40, soils[1]);
    px(ctx, left, gy + 72, wide, bottom - gy - 72, soils[2]);
    // 단 사이 디더 (한 칸씩 건너뛰며 찍는다)
    for (let x = left - (left % 4); x < left + wide; x += 4) {
      px(ctx, x, gy + 30, 2, 2, soils[1]);
      px(ctx, x + 2, gy + 70, 2, 2, soils[2]);
    }
    // 흙 속 돌
    for (let i = 0; i < 30; i++) {
      const n = hash2(i, 11);
      const x = left + ((n * 1600 + i * 137) % wide);
      const y = gy + 20 + ((hash2(i, 21) * 900) % (bottom - gy - 26));
      px(ctx, Math.round(x / 2) * 2, Math.round(y / 2) * 2, 4 + (n > 0.6 ? 2 : 0), 2, shade(this.region.soil, -0.45));
    }

    // 잔디 — 밝은 윗줄, 본체, 그늘
    px(ctx, left, gy, wide, 3, shade(this.region.grass, 0.3));
    px(ctx, left, gy + 3, wide, 3, this.region.grass);
    px(ctx, left, gy + 6, wide, 2, shade(this.region.grass, -0.3));
    // 풀잎
    for (let x = left - (left % 6); x < left + wide; x += 6) {
      const n = hash2(x, 5);
      const h = n > 0.66 ? 5 : n > 0.33 ? 3 : 2;
      const lean = Math.sin(this.elapsed * 1.1 + x * 0.05) > 0 ? 1 : 0;
      px(ctx, x + lean, gy - h, 1, h, shade(this.region.grass, 0.34));
    }
  }

  /** 벌통 — 평평한 판과 또렷한 테두리로 */
  private drawHiveShell() {
    const ctx = this.ctx;
    const hv = this.region.hive;
    const bx = LAYOUT.box.x * TILE;
    const by = LAYOUT.box.y * TILE;
    const bw = LAYOUT.box.w * TILE;
    const bh = LAYOUT.box.h * TILE;

    px(ctx, bx, by, bw, bh, hv.wall);
    px(ctx, bx, by, bw, 3, shade(hv.wall, 0.28)); // 위쪽 빛
    px(ctx, bx, by + bh - 4, bw, 4, hv.wallDark); // 아래 그늘
    px(ctx, bx, by, 3, bh, shade(hv.wall, 0.14));
    px(ctx, bx + bw - 3, by, 3, bh, hv.wallDark);

    // 재료의 결
    for (let y = by + 14; y < by + bh - 6; y += 14) {
      if (hv.material === "clay") {
        for (let x = bx + 4; x < bx + bw - 4; x += 8) px(ctx, x, y, 4, 1, hv.wallDark + "aa");
      } else if (hv.material === "stone") {
        for (let x = bx + ((y / 14) % 2 ? 10 : 2); x < bx + bw - 4; x += 20) {
          px(ctx, x, y, 1, 12, hv.wallDark + "88");
        }
        px(ctx, bx + 2, y, bw - 4, 1, hv.wallDark + "88");
      } else {
        px(ctx, bx + 2, y, bw - 4, 1, hv.wallDark + "66");
      }
    }

    // 속을 파낸다
    const ix = LAYOUT.interior.x * TILE;
    const iy = LAYOUT.interior.y * TILE;
    const iw = LAYOUT.interior.w * TILE;
    const ih = LAYOUT.interior.h * TILE;
    px(ctx, ix, iy, iw, ih, "#2c1c0b");
    px(ctx, ix, iy, iw, 2, "#1a1005");

    // 입구와 착륙판
    const e = LAYOUT.entry;
    px(ctx, e.x * TILE - 2, e.y * TILE, e.w * TILE + 4, e.h * TILE, "#120b04");
    px(ctx, e.x * TILE - 2, e.y * TILE, e.w * TILE + 4, 2, "#000000");
    px(ctx, e.x * TILE - 28, (e.y + e.h) * TILE - 4, 30, 4, shade(hv.wall, -0.08));
    px(ctx, e.x * TILE - 28, (e.y + e.h) * TILE - 4, 30, 1, shade(hv.wall, 0.2));
  }

  /** 층을 나누는 소비 칸막이 */
  private drawDividers() {
    const ctx = this.ctx;
    const ix = LAYOUT.interior.x * TILE;
    const iw = LAYOUT.interior.w * TILE;
    for (const d of LAYOUT.dividers) {
      const y = d.y * TILE;
      const segs: Array<[number, number]> = [];
      let cur = LAYOUT.interior.x;
      for (const g of [...d.gaps].sort((a, b) => a.x - b.x)) {
        if (g.x > cur) segs.push([cur, g.x]);
        cur = g.x + g.w;
      }
      if (cur < LAYOUT.interior.x + LAYOUT.interior.w) {
        segs.push([cur, LAYOUT.interior.x + LAYOUT.interior.w]);
      }
      for (const [a, b] of segs) {
        const x = a * TILE;
        const w = (b - a) * TILE;
        px(ctx, x, y, w, TILE, "#d9a441");
        px(ctx, x, y, w, 3, "#f0c268");
        px(ctx, x, y + TILE - 4, w, 4, "#8d6420");
      }
      // 통로 가장자리
      for (const gp of d.gaps) {
        px(ctx, gp.x * TILE - 2, y, 2, TILE, "#6f4c15");
        px(ctx, (gp.x + gp.w) * TILE, y, 2, TILE, "#6f4c15");
      }
      void ix;
      void iw;
    }
  }

  private combCanvas(zone: Zone) {
    const cached = this.combCache.get(zone.id);
    if (cached) return cached;
    const w = zone.w * TILE;
    const h = zone.h * TILE;
    const k = this.scale;
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * k);
    cv.height = Math.round(h * k);
    const c = cv.getContext("2d");
    if (!c) return cv;
    c.scale(k, k);
    c.fillStyle = "#4a2f12";
    c.fillRect(0, 0, w, h);
    const r = 13;
    const stepX = Math.sqrt(3) * r;
    const stepY = 1.5 * r;
    for (let row = 0; row * stepY < h + r; row++) {
      for (let col = 0; col * stepX < w + stepX; col++) {
        const cx = col * stepX + (row % 2 ? stepX / 2 : 0);
        const cy = row * stepY;
        const n = hash2(col, row);
        const tone = n > 0.62 ? 12 : n > 0.3 ? 0 : -12;
        pixelHex(
          c,
          Math.round(cx),
          Math.round(cy),
          r - 1,
          `rgb(${(110 + tone) | 0},${(78 + tone * 0.8) | 0},${(32 + tone * 0.6) | 0})`,
          "rgb(150,108,44)"
        );
      }
    }
    this.combCache.set(zone.id, cv);
    return cv;
  }

  private drawCombZones(camX: number, camY: number) {
    const ctx = this.ctx;
    for (const z of this.hive.zones) {
      const rx = z.x * TILE;
      const ry = z.y * TILE;
      const rw = z.w * TILE;
      const rh = z.h * TILE;
      if (rx > camX + this.vw || rx + rw < camX || ry > camY + this.vh || ry + rh < camY) continue;
      ctx.drawImage(this.combCanvas(z), rx, ry, rw, rh);
    }
  }

  /** 지역마다 꽃송이가 달린 모양이 다르다. [x, y, 크기, 꽃잎 수] */
  private flowerHeads(): Array<[number, number, number, number]> {
    switch (this.region.flower.form) {
      case "almond": // 가지에 큼직하게 두어 송이
        return [
          [0, -2, 1.5, 5],
          [-11, 8, 1.25, 5],
        ];
      case "sidr": // 자잘한 꽃이 뭉쳐 핀다
        return [
          [0, 0, 0.6, 5],
          [-7, 4, 0.55, 5],
          [7, 3, 0.55, 5],
          [-3, 10, 0.5, 5],
          [4, 11, 0.5, 5],
        ];
      case "thyme": // 이삭처럼 위로 층층이
        return [
          [0, -6, 0.7, 5],
          [-3, 2, 0.75, 5],
          [3, 9, 0.7, 5],
        ];
      case "acacia": // 아래로 늘어지는 송이
        return [
          [0, 0, 0.85, 4],
          [-4, 9, 0.8, 4],
          [3, 17, 0.75, 4],
          [-2, 25, 0.65, 4],
        ];
      default: // 마누카 — 잔가지에 작은 꽃 여럿
        return [
          [0, 0, 1, 5],
          [-8, 6, 0.9, 5],
          [8, 5, 0.9, 5],
        ];
    }
  }

  private drawFlowers(camX: number, camY: number) {
    const ctx = this.ctx;
    const fl = this.region.flower;
    const droop = fl.form === "acacia";
    const heads = this.flowerHeads();
    const sp =
      fl.form === "acacia" ? BLOSSOM_DROOP : fl.form === "sidr" ? BLOSSOM_SMALL : BLOSSOM;

    for (const f of this.hive.flowers) {
      if (f.x < camX - 40 || f.x > camX + this.vw + 40) continue;
      if (f.y < camY - 80 || f.y > camY + this.vh + 40) continue;
      const sway = Math.round(Math.sin(f.sway) * 2);
      const topY = Math.round(f.y - (droop ? 44 : 32));
      const fx = Math.round(f.x);

      // 줄기 — 두 칸짜리 계단
      const stem = f.sprayed ? "#6b7a52" : fl.stem;
      const steps = Math.round((f.y - topY) / 3);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        px(ctx, fx + Math.round(sway * t) - 1, f.y - i * 3, 2, 3, stem);
      }
      px(ctx, fx + sway + 2, topY + 16, 5, 2, stem);
      px(ctx, fx + sway + 6, topY + 15, 2, 2, stem);

      const palette: Record<string, string | undefined> = f.sprayed
        ? { p: "#cfe0c0", q: "#b9cfaa", o: "#8fa06a" }
        : f.used
          ? { p: "#d8d2c4", q: "#c4bdad", o: "#b9ac8a" }
          : { p: fl.petal, q: fl.petal2, o: fl.center };

      for (const [ox, oy, scale] of heads) {
        blit(ctx, sp, palette, fx + sway + ox, topY + oy, 1, Math.max(1, Math.round(scale * 2)));
      }

      if (f.sprayed) {
        // 농약 — 초록 안개와 표시
        const t = Math.sin(this.elapsed * 3 + f.sway) > 0 ? 1 : 0;
        ctx.fillStyle = "rgba(150,235,140,0.18)";
        ctx.fillRect(fx + sway - 14, topY - 8 - t, 28, 26);
        ctx.fillStyle = "rgba(190,255,180,0.9)";
        ctx.font = "9px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("농약", fx + sway, topY - 14);
      } else if (!f.used) {
        // 꿀이 남아 있으면 반짝인다
        const t = Math.floor(this.elapsed * 3 + f.sway) % 2;
        px(ctx, fx + sway - 10 + t * 20, topY - 6, 2, 2, "rgba(255,246,200,0.9)");
        px(ctx, fx + sway + 6 - t * 14, topY + 12, 2, 2, "rgba(255,246,200,0.7)");
      }
    }
  }

  private hex(x: number, y: number, r: number, fill: string, stroke: string) {
    pixelHex(this.ctx, Math.round(x), Math.round(y), r, fill, stroke);
  }

  private drawProps(camX: number, camY: number) {
    const ctx = this.ctx;
    const vis = (x: number, y: number) =>
      x > camX - 60 && x < camX + this.vw + 60 && y > camY - 60 && y < camY + this.vh + 60;

    // 육아권 방
    for (const c of this.hive.brood) {
      if (!vis(c.x, c.y)) continue;
      if (c.dirty) {
        this.hex(c.x, c.y, 15, "rgba(64,48,28,0.9)", "rgba(150,120,70,0.7)");
        ctx.fillStyle = "rgba(120,100,70,0.9)";
        for (let i = 0; i < 4; i++) {
          const n = hash2(c.x + i, c.y);
          ctx.fillRect(c.x - 7 + n * 14, c.y - 6 + ((n * 13) % 12), 2.6, 2.2);
        }
      } else if (c.larva) {
        this.hex(c.x, c.y, 15, "rgba(58,38,14,0.85)", "rgba(226,176,84,0.8)");
        const wig = Math.sin(this.elapsed * 3 + c.wiggle) > 0 ? 1 : 0;
        blit(
          ctx,
          LARVA,
          {
            L: c.fed ? "#fff6dd" : "#f0dfb6",
            m: c.fed ? "#e4d3ac" : "#d6c49a",
            E: "#5b4327",
          },
          c.x + wig,
          c.y + 2,
          1,
          2
        );
        if (c.fed) {
          ctx.fillStyle = "rgba(255,236,168,0.9)";
          ctx.font = "9px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("♪", c.x, c.y - 12);
        } else if (this.stage === 1 && this.jelly > 0) {
          if (Math.floor(this.elapsed * 4 + c.x) % 2 === 0) {
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2;
              px(ctx, c.x + Math.cos(a) * 22, c.y + Math.sin(a) * 22, 3, 3, "#ffe296");
            }
          }
        }
      } else {
        this.hex(c.x, c.y, 15, "rgba(96,66,28,0.75)", "rgba(226,176,84,0.6)");
      }
    }

    // 로열젤리 웅덩이
    const j = this.hive.jellyPool;
    if (vis(j.x, j.y) && this.stage <= 1) {
      const bob = Math.sin(this.elapsed * 2) > 0 ? 1 : 0;
      const jx = Math.round(j.x);
      const jy = Math.round(j.y);
      // 계단으로 쌓은 웅덩이
      const rows: Array<[number, number]> = [
        [10, 3],
        [15, 3],
        [17, 3],
        [15, 3],
        [10, 3],
      ];
      let ry = jy - 7;
      for (const [half, hgt] of rows) {
        px(ctx, jx - half, ry + bob, half * 2, hgt, "#fdf3d3");
        ry += hgt;
      }
      px(ctx, jx - 17, jy - 7 + bob, 34, 2, "#ffffff");
      px(ctx, jx - 8, jy - 4 + bob, 6, 2, "rgba(255,255,255,0.9)");
      px(ctx, jx - 20, jy + 9 + bob, 40, 2, "rgba(255,245,214,0.3)");
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      const jw = ctx.measureText("로열젤리").width;
      ctx.fillStyle = "rgba(12,7,2,0.7)";
      ctx.beginPath();
      ctx.roundRect(j.x - jw / 2 - 6, j.y - 26, jw + 12, 15, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(255,247,220,0.95)";
      ctx.fillText("로열젤리", j.x, j.y - 15);
    }

    // 왕대 (소비 아래 가장자리에 매달린 땅콩 모양)
    const q = this.hive.queenCell;
    if (vis(q.x, q.y)) {
      ctx.save();
      ctx.translate(q.x, q.y);
      const glow = ctx.createRadialGradient(0, 8, 3, 0, 8, 46);
      glow.addColorStop(0, `rgba(255,226,150,${q.capped ? 0.42 : 0.18})`);
      glow.addColorStop(1, "rgba(255,226,150,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 8, 46, 0, Math.PI * 2);
      ctx.fill();
      const qc = q.capped ? "#e0ae46" : "#c9963c";
      const qd = "#8d6420";
      // 아래로 늘어진 왕대 — 폭이 줄어드는 계단
      const seg: Array<[number, number, number]> = [
        [-6, 11, 6],
        [0, 12, 6],
        [6, 12, 6],
        [12, 11, 6],
        [18, 10, 6],
        [24, 8, 5],
      ];
      for (const [oy, half, hgt] of seg) {
        px(ctx, -half, oy, half * 2, hgt, qc);
        px(ctx, -half, oy, 2, hgt, qd);
        px(ctx, half - 2, oy, 2, hgt, qd);
      }
      px(ctx, -11, -6, 22, 2, shade(qc, 0.24));
      for (let i = 0; i < 4; i++) px(ctx, -9, 2 + i * 7, 18, 1, qd);

      if (q.capped) {
        px(ctx, -8, 29, 16, 5, qc);
        px(ctx, -8, 29, 16, 2, shade(qc, 0.2));
      } else {
        // 안의 애벌레가 내다본다
        const wig = Math.sin(this.elapsed * 4) > 0 ? 1 : 0;
        blit(
          ctx,
          LARVA,
          { L: "#f7e9c4", m: "#e0d0a4", E: "#5b4327" },
          wig,
          31,
          1,
          2
        );
      }
      const label = q.capped ? "왕대 · 봉인됨" : `왕대 — 여왕이 될 애벌레 ${q.jelly}/3`;
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      const lw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(12,7,2,0.72)";
      ctx.beginPath();
      ctx.roundRect(-lw / 2 - 6, 44, lw + 12, 15, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(255,244,206,0.95)";
      ctx.fillText(label, 0, 55);
      ctx.restore();
    }

    // 저장권 방
    for (const c of this.hive.honey) {
      if (!vis(c.x, c.y)) continue;
      if (!c.built) {
        ctx.setLineDash([4, 4]);
        this.hex(c.x, c.y, 15, "rgba(40,26,10,0.5)", "rgba(240,196,110,0.5)");
        ctx.setLineDash([]);
      } else if (c.filled) {
        this.hex(c.x, c.y, 15, "#f0a92a", "#ffdf9a");
        ctx.fillStyle = "rgba(255,240,190,0.55)";
        ctx.beginPath();
        ctx.ellipse(c.x - 3, c.y - 4, 4.5, 2.6, -0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        this.hex(c.x, c.y, 15, "rgba(48,30,12,0.75)", "rgba(240,196,110,0.8)");
      }
    }
  }

  /** 벌 한 마리. 도트 스프라이트를 격자에 딱 맞춰 찍는다. */
  private drawBee(
    x: number,
    y: number,
    dir: number,
    scale: number,
    wingPhase: number,
    kind: "player" | "queen" | "worker" | "drone" | "hornet"
  ) {
    const ctx = this.ctx;
    const zoom = Math.max(1, Math.round(scale * 2));
    const flap = Math.sin(wingPhase) > 0;
    const pred = this.region.predator;

    const sp: Sprite =
      kind === "queen" ? QUEEN : kind === "drone" ? DRONE : kind === "hornet" ? HORNET : BEE;

    const body = kind === "hornet" ? pred.body : "#f6c343";
    const stripe = kind === "hornet" ? pred.dark : "#3d2c10";
    const palette: Record<string, string | undefined> = {
      Y: body,
      d: stripe,
      f: kind === "hornet" ? mixHex(pred.body, "#ffffff", 0.2) : "#e8b13a",
      H: kind === "hornet" ? pred.dark : "#3d2c10",
      e: "#f4ead2",
      E: "#241a2e",
      a: stripe,
      L: stripe,
      s: "#d8d0c0",
      c: "#ffd75e",
      j: "#ff7ea8",
      // 날개는 퍼덕임에 따라 두 줄이 번갈아 보인다
      w: flap ? "rgba(226,242,255,0.75)" : "rgba(226,242,255,0.4)",
    };

    // 날갯짓 — 짝수 프레임엔 위쪽 한 줄을 지운다
    if (!flap) palette.w = "rgba(214,234,255,0.34)";

    blit(ctx, sp, palette, x, y, dir, zoom);
    void scale;
  }

  private drawWorkers() {
    const ctx = this.ctx;
    for (const w of this.hive.workers) {
      this.drawBee(w.x, w.y, w.recruited ? this.facing : 1, 0.6, this.elapsed * 30 + w.phase, "worker");
      if (!w.recruited && this.stage === 3) {
        ctx.fillStyle = "rgba(255,236,168,0.6)";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", w.x, w.y - 13);
      }
    }
  }

  private drawHornets() {
    for (const h of this.hive.hornets) {
      if (!h.alive) continue;
      this.drawBee(h.x, h.y, h.vx >= 0 ? 1 : -1, 1, this.elapsed * 34 + h.wiggle, "hornet");
    }
  }

  private drawDrones() {
    for (const d of this.drones) {
      this.drawBee(d.x, d.y, d.dir, 1, this.elapsed * 30 + d.phase, "drone");
    }
  }

  private drawPlayer() {
    if (this.invuln > 0 && Math.floor(this.elapsed * 20) % 2 === 0) return;
    this.drawBee(
      this.cx,
      this.cy,
      this.facing,
      this.isQueen ? 1 : 1,
      this.wingPhase,
      this.isQueen ? "queen" : "player"
    );
    const ctx = this.ctx;
    if (this.nectar > 0) {
      ctx.fillStyle = "#ffcf4d";
      ctx.beginPath();
      ctx.arc(this.cx - this.facing * 12, this.cy + 6, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.jelly > 0) {
      ctx.fillStyle = "#fdf3d3";
      ctx.beginPath();
      ctx.arc(this.cx - this.facing * 12, this.cy - 7, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.stage === 2 && this.wax >= 1) {
      ctx.fillStyle = "rgba(255,240,205,0.9)";
      for (let i = 0; i < Math.min(3, Math.floor(this.wax)); i++) {
        ctx.fillRect(this.cx - 6 + i * 4, this.cy + 8, 3, 2);
      }
    }
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = a;
      if (p.kind === "heart") {
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + s * 0.6);
        ctx.bezierCurveTo(p.x - s, p.y - s * 0.2, p.x - s * 0.4, p.y - s, p.x, p.y - s * 0.35);
        ctx.bezierCurveTo(p.x + s * 0.4, p.y - s, p.x + s, p.y - s * 0.2, p.x, p.y + s * 0.6);
        ctx.fill();
      } else if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.4 - a), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawVignette() {
    const ctx = this.ctx;
    const inside =
      this.cx / TILE > BOX.x && this.cx / TILE < BOX.x + BOX.w && this.cy / TILE < GROUND_Y;
    const px = this.cx - this.camX;
    const py = this.cy - this.camY;
    const r = Math.max(this.vw, this.vh) * (inside ? 0.66 : 0.95);
    const g = ctx.createRadialGradient(px, py, r * 0.25, px, py, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, inside ? "rgba(30,16,2,0.66)" : "rgba(10,20,40,0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.vw, this.vh);
  }

  private drawCompass(camX: number, camY: number) {
    if (this.status !== "playing" || this.pendingFact) return;
    const t = this.target();
    if (!t) return;
    const tx = t.x - camX;
    const ty = t.y - camY;
    if (tx > 24 && tx < this.vw - 24 && ty > 24 && ty < this.vh - 24) return;
    const cx = this.vw / 2;
    const cy = this.vh / 2;
    const a = Math.atan2(ty - cy, tx - cx);
    const rx = this.vw / 2 - 20;
    const ry = this.vh / 2 - 20;
    const k = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(this.elapsed * 4) * 0.18;
    ctx.translate(cx + Math.cos(a) * k, cy + Math.sin(a) * k);
    ctx.rotate(a);
    ctx.fillStyle = "#ffd75e";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
