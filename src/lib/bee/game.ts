// 「왕벌의 비행」 엔진: 날아다니는 공주벌, 방마다 놓인 퀘스트, 마지막 혼인비행.
import { BeeAudio } from "./music";
import {
  AIR,
  DOOR,
  GRASS,
  GROUND_Y,
  Hive,
  Room,
  TILE,
  WAX,
  WORLD_H,
  WORLD_W,
  generateHive,
  isSolid,
  roomOf,
  setTile,
  tileAt,
} from "./world";

export const VIEW_W = 480;
export const VIEW_H = 320;

const ACCEL = 0.3;
const DRAG = 0.905;
const GRAVITY = 0.055;
const MAX_SPEED = 3.4;
const BEE_W = 18;
const BEE_H = 13;

export type Status = "playing" | "wedding" | "ending";

export type Quest = {
  title: string;
  detail: string;
  where: string;
  target: number;
};

export const QUESTS: Quest[] = [
  {
    title: "꽃밭의 꿀",
    detail: "꽃 위로 날아가 꿀을 모아 오자.",
    where: "꽃밭 (지상)",
    target: 6,
  },
  {
    title: "저장방 채우기",
    detail: "모아 온 꿀을 빈 벌집칸에 넣자.",
    where: "꿀 저장방",
    target: 6,
  },
  {
    title: "애벌레 돌보기",
    detail: "젤리 웅덩이에서 로열젤리를 떠서 애벌레에게 먹이자.",
    where: "육아방",
    target: 6,
  },
  {
    title: "말벌 쫓아내기",
    detail: "일벌을 2마리 이상 데리고 말벌에게 부딪혀 열구를 만들자.",
    where: "경비실",
    target: 2,
  },
  {
    title: "여왕 즉위",
    detail: "로열젤리를 들고 왕대 안으로 들어가자.",
    where: "왕대방",
    target: 1,
  },
  {
    title: "혼인비행",
    detail: "벌집 밖 하늘 높이 날아오르자. 수벌들이 기다린다.",
    where: "하늘",
    target: 1,
  },
];

export type BeeState = {
  hp: number;
  wing: number;
  nectar: number;
  jelly: number;
  crew: number;
  questIndex: number;
  progress: number;
  target: number;
  isQueen: boolean;
  status: Status;
  message: string;
  room: string;
  elapsed: number;
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

function overlapsCircle(ax: number, ay: number, bx: number, by: number, r: number) {
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
  private onState: (s: BeeState) => void;
  readonly audio = new BeeAudio();

  private hive!: Hive;
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
  private isQueen = false;
  private invuln = 0;
  private hurtFlash = 0;
  private sipCooldown = 0;

  private questIndex = 0;
  private status: Status = "playing";
  private message = "";
  private messageTimer = 0;
  private elapsed = 0;
  private roomLabel = "";
  private roomLabelTimer = 0;
  private lastRoomId = "";

  private particles: Particle[] = [];
  private drones: Drone[] = [];
  private weddingTime = 0;
  private doorOpening = 0;

  private camX = 0;
  private camY = 0;
  private combCache = new Map<string, HTMLCanvasElement>();

  constructor(
    canvas: HTMLCanvasElement,
    opts: { onState: (s: BeeState) => void; seed?: number }
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
    this.reset(this.seed);
  }

  reset(seed = Math.floor(Math.random() * 1e9)) {
    this.seed = seed;
    this.hive = generateHive(seed);
    this.combCache.clear();
    this.box = { x: this.hive.spawn.x, y: this.hive.spawn.y, w: BEE_W, h: BEE_H };
    this.vx = 0;
    this.vy = 0;
    this.hp = 100;
    this.wing = 100;
    this.nectar = 0;
    this.nectarTotal = 0;
    this.jelly = 0;
    this.isQueen = false;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.questIndex = 0;
    this.status = "playing";
    this.elapsed = 0;
    this.particles = [];
    this.drones = [];
    this.weddingTime = 0;
    this.doorOpening = 0;
    this.roomLabelTimer = 0;
    this.lastRoomId = "";
    this.audio.stopFlight();
    this.say("나는 갓 태어난 공주벌. 여왕이 되려면 할 일이 있다!", 4.5);
    this.updateCamera(true);
    this.emit();
    this.draw();
  }

  setInput(name: InputName, down: boolean) {
    this.input[name] = down;
  }

  clearInput() {
    (Object.keys(this.input) as InputName[]).forEach((k) => (this.input[k] = false));
  }

  setMuted(muted: boolean) {
    this.audio.setMuted(muted);
  }

  resize(width: number, height: number) {
    const w = Math.max(240, Math.round(width));
    const h = Math.max(200, Math.round(height));
    if (w === this.vw && h === this.vh) return;
    this.vw = w;
    this.vh = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
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

  private progressOf(index: number) {
    const h = this.hive;
    switch (index) {
      case 0:
        return this.nectarTotal;
      case 1:
        return h.cells.filter((c) => c.filled).length;
      case 2:
        return h.larvae.filter((l) => l.fed).length;
      case 3:
        return h.hornets.filter((x) => !x.alive).length;
      case 4:
        return this.isQueen ? 1 : 0;
      default:
        return this.status === "playing" ? 0 : 1;
    }
  }

  private nectarTotal = 0;

  private emit() {
    const q = QUESTS[Math.min(this.questIndex, QUESTS.length - 1)];
    this.onState({
      hp: Math.max(0, Math.round(this.hp)),
      wing: Math.round(this.wing),
      nectar: this.nectar,
      jelly: this.jelly,
      crew: this.hive.workers.filter((w) => w.recruited).length,
      questIndex: this.questIndex,
      progress: Math.min(this.progressOf(this.questIndex), q.target),
      target: q.target,
      isQueen: this.isQueen,
      status: this.status,
      message: this.messageTimer > 0 ? this.message : "",
      room: this.roomLabelTimer > 0 ? this.roomLabel : "",
      elapsed: this.elapsed,
    });
  }

  // ------------------------------------------------------------- 업데이트

  private update(dt: number) {
    this.elapsed += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.roomLabelTimer > 0) this.roomLabelTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.sipCooldown > 0) this.sipCooldown -= dt;

    this.updateBee(dt);
    this.updateWorkers(dt);
    this.updateHornets(dt);
    this.updateInteractions(dt);
    this.updateFlowers(dt);
    this.updateQuest();
    this.updateParticles(dt);
    this.updateDoor(dt);
    if (this.status !== "playing") this.updateWedding(dt);
    this.updateCamera(false);
    this.updateRoomLabel();

    this.stateTick += dt;
    if (this.stateTick > 0.1) {
      this.stateTick = 0;
      this.emit();
    }
  }

  private updateBee(dt: number) {
    const inp = this.input;
    const tired = this.wing <= 1;
    const boosting = inp.boost && !tired && this.wing > 5;
    const thrusting = inp.left || inp.right || inp.up || inp.down;

    let accel = ACCEL * (tired ? 0.4 : 1) * (boosting ? 1.75 : 1);
    if (this.isQueen) accel *= 1.12; // 여왕은 더 크고 힘차다

    if (inp.left) this.vx -= accel;
    if (inp.right) this.vx += accel;
    if (inp.up) this.vy -= accel;
    if (inp.down) this.vy += accel;

    if (inp.left && !inp.right) this.facing = -1;
    if (inp.right && !inp.left) this.facing = 1;

    this.vy += GRAVITY * (tired ? 2.6 : 1);
    this.vx *= DRAG;
    this.vy *= DRAG;

    const speed = Math.hypot(this.vx, this.vy);
    const max = MAX_SPEED * (boosting ? 1.35 : 1);
    if (speed > max) {
      this.vx = (this.vx / speed) * max;
      this.vy = (this.vy / speed) * max;
    }

    if (thrusting) this.wing = Math.max(0, this.wing - (boosting ? 26 : 11) * dt);
    else this.wing = Math.min(100, this.wing + 24 * dt);

    this.wingPhase += dt * (26 + speed * 8);

    // 벽에 부딪히면 살짝 튕긴다
    const nx = { ...this.box, x: this.box.x + this.vx };
    if (collides(this.hive, nx)) {
      const dir = Math.sign(this.vx) || 1;
      while (!collides(this.hive, { ...this.box, x: this.box.x + dir })) this.box.x += dir;
      this.vx *= -0.28;
    } else {
      this.box.x = nx.x;
    }
    const ny = { ...this.box, y: this.box.y + this.vy };
    if (collides(this.hive, ny)) {
      const dir = Math.sign(this.vy) || 1;
      while (!collides(this.hive, { ...this.box, y: this.box.y + dir })) this.box.y += dir;
      this.vy *= -0.28;
    } else {
      this.box.y = ny.y;
    }

    this.box.x = Math.max(TILE, Math.min(WORLD_W * TILE - TILE - this.box.w, this.box.x));
    this.box.y = Math.max(-620, Math.min(WORLD_H * TILE - TILE, this.box.y));

    this.audio.setWing(Math.min(1, speed / MAX_SPEED));

    // 꽃가루 자국
    if (speed > 1.6 && Math.random() < 0.16) {
      this.particles.push({
        x: this.cx,
        y: this.cy,
        vx: -this.vx * 0.16,
        vy: -this.vy * 0.16 - 0.15,
        life: 0.42,
        maxLife: 0.42,
        color: "rgba(255,224,130,0.8)",
        size: 1.6,
        kind: "dot",
      });
    }
  }

  private get cx() {
    return this.box.x + this.box.w / 2;
  }
  private get cy() {
    return this.box.y + this.box.h / 2;
  }

  private updateWorkers(dt: number) {
    const crew = this.hive.workers.filter((w) => w.recruited);
    crew.forEach((w, i) => {
      w.phase += dt * 6;
      const behind = (i + 1) * 22;
      const tx = this.cx - this.facing * behind + Math.cos(w.phase) * 5;
      const ty = this.cy - 14 + Math.sin(w.phase * 1.3) * 7;
      w.vx += (tx - w.x) * 0.055;
      w.vy += (ty - w.y) * 0.055;
      w.vx *= 0.86;
      w.vy *= 0.86;
      w.x += w.vx;
      w.y += w.vy;
    });
    for (const w of this.hive.workers) {
      if (w.recruited) continue;
      w.phase += dt * 2.4;
      w.x = w.homeX + Math.cos(w.phase) * 22;
      w.y = w.homeY + Math.sin(w.phase * 1.7) * 12;
    }
  }

  private updateHornets(dt: number) {
    for (const hn of this.hive.hornets) {
      if (!hn.alive) continue;
      hn.wiggle += dt * 8;
      const dx = this.cx - hn.x;
      const dy = this.cy - hn.y;
      const dist = Math.hypot(dx, dy);
      const chase = dist < 190 && this.status === "playing";
      if (chase) {
        hn.vx += (dx / (dist || 1)) * 0.09;
        hn.vy += (dy / (dist || 1)) * 0.09;
      } else {
        hn.vx += (hn.homeX - hn.x) * 0.004 + Math.cos(hn.wiggle * 0.4) * 0.03;
        hn.vy += (hn.homeY - hn.y) * 0.004 + Math.sin(hn.wiggle * 0.5) * 0.03;
      }
      hn.vx *= 0.94;
      hn.vy *= 0.94;
      const sp = Math.hypot(hn.vx, hn.vy);
      const cap = chase ? 2.3 : 1.1;
      if (sp > cap) {
        hn.vx = (hn.vx / sp) * cap;
        hn.vy = (hn.vy / sp) * cap;
      }
      const box: Box = { x: hn.x - 8, y: hn.y - 6, w: 16, h: 12 };
      const nx = { ...box, x: box.x + hn.vx };
      if (collides(this.hive, nx)) hn.vx *= -0.6;
      else hn.x += hn.vx;
      const ny = { ...box, y: box.y + hn.vy };
      if (collides(this.hive, ny)) hn.vy *= -0.6;
      else hn.y += hn.vy;
    }
  }

  private updateFlowers(dt: number) {
    for (const f of this.hive.flowers) {
      f.sway += dt;
      // 꿀은 시간이 지나면 다시 고인다 (막히지 않도록)
      if (f.used && Math.random() < dt * 0.05) f.used = false;
    }
  }

  private updateInteractions(dt: number) {
    const h = this.hive;
    const px = this.cx;
    const py = this.cy;

    // 꽃에서 꿀 모으기
    if (this.sipCooldown <= 0) {
      for (const f of h.flowers) {
        if (f.used) continue;
        if (!overlapsCircle(px, py, f.x, f.y - 10, 18)) continue;
        f.used = true;
        this.nectar++;
        this.nectarTotal++;
        this.sipCooldown = 0.25;
        this.wing = Math.min(100, this.wing + 18);
        this.audio.sfx("sip");
        this.say(`꿀 한 모금! (가진 꿀 ${this.nectar})`, 1.4);
        this.burst(f.x, f.y - 12, "#ffd76a", 10);
        break;
      }
    }

    // 빈 벌집칸에 꿀 넣기
    if (this.nectar > 0) {
      for (const c of h.cells) {
        if (c.filled) continue;
        if (!overlapsCircle(px, py, c.x, c.y, 17)) continue;
        c.filled = true;
        this.nectar--;
        this.audio.sfx("deposit");
        this.say("꿀을 벌집칸에 채웠다", 1.3);
        this.burst(c.x, c.y, "#ffbe3d", 12);
        break;
      }
    }

    // 로열젤리 뜨기
    if (this.jelly < 3 && overlapsCircle(px, py, h.jelly.x, h.jelly.y, 26) && this.sipCooldown <= 0) {
      this.jelly++;
      this.sipCooldown = 0.4;
      this.audio.sfx("sip");
      this.say(`로열젤리를 떴다 (${this.jelly}/3)`, 1.3);
      this.burst(h.jelly.x, h.jelly.y - 6, "#fff4d0", 10);
    }

    // 애벌레 먹이기
    if (this.jelly > 0) {
      for (const l of h.larvae) {
        if (l.fed) continue;
        if (!overlapsCircle(px, py, l.x, l.y, 18)) continue;
        l.fed = true;
        this.jelly--;
        this.audio.sfx("feed");
        this.say("애벌레가 배부르게 먹었다!", 1.4);
        this.burst(l.x, l.y - 4, "#fff1c9", 12);
        break;
      }
    }

    // 일벌 합류
    for (const w of h.workers) {
      if (w.recruited) continue;
      if (!overlapsCircle(px, py, w.x, w.y, 20)) continue;
      w.recruited = true;
      this.audio.sfx("recruit");
      this.say("일벌이 따라온다!", 1.3);
      this.burst(w.x, w.y, "#ffe9a3", 8);
    }

    // 말벌
    const crew = h.workers.filter((w) => w.recruited).length;
    for (const hn of h.hornets) {
      if (!hn.alive) continue;
      if (!overlapsCircle(px, py, hn.x, hn.y, 18)) continue;
      if (crew >= 2) {
        hn.alive = false;
        this.audio.sfx("defeat");
        this.say("일벌들이 열구를 만들어 말벌을 쫓아냈다!", 2.4);
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
        this.hurt(15, hn.x, hn.y);
      }
    }

    // 왕대
    if (
      !this.isQueen &&
      this.questIndex === 4 &&
      this.jelly > 0 &&
      overlapsCircle(px, py, h.queenCell.x, h.queenCell.y, 30)
    ) {
      this.jelly--;
      this.isQueen = true;
      this.audio.sfx("crown");
      this.say("로열젤리를 먹었다 — 나는 이제 여왕벌이다!", 4);
      this.burst(h.queenCell.x, h.queenCell.y, "#ffe9a3", 40);
    }

    void dt;
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
      // 기절했다가 현관홀에서 깨어난다 (진행한 퀘스트는 그대로)
      const hall = this.hive.rooms.find((r) => r.id === "hall")!;
      this.box.x = (hall.x + hall.w / 2) * TILE;
      this.box.y = (hall.y + 3) * TILE;
      this.vx = 0;
      this.vy = 0;
      this.hp = 60;
      this.wing = 60;
      this.invuln = 2;
      this.hive.workers.forEach((w) => (w.recruited = false));
      this.say("기절했다가 현관홀에서 깨어났다...", 3);
    }
    this.emit();
  }

  private updateQuest() {
    const q = QUESTS[this.questIndex];
    if (!q) return;

    if (this.questIndex === 5) {
      // 혼인비행: 하늘 높이 오르면 시작
      if (this.status === "playing" && this.cy < 4 * TILE) this.beginWedding();
      return;
    }

    if (this.progressOf(this.questIndex) >= q.target) {
      this.questIndex++;
      this.audio.sfx("quest");
      const next = QUESTS[this.questIndex];
      this.say(`「${q.title}」 완료! 다음: ${next.title} — ${next.where}`, 4);
      if (this.questIndex === 4) this.openDoor();
      this.emit();
    }
  }

  private openDoor() {
    if (this.doorOpening > 0 || this.hive.doorTiles.length === 0) return;
    this.doorOpening = 1.2;
    this.audio.sfx("door");
    this.say("밀랍 문이 열렸다. 왕대방으로 내려가자!", 4);
  }

  private updateDoor(dt: number) {
    if (this.doorOpening <= 0) return;
    this.doorOpening -= dt;
    const tiles = this.hive.doorTiles;
    const remove = Math.max(1, Math.ceil(tiles.length * dt * 1.4));
    for (let i = 0; i < remove && tiles.length; i++) {
      const t = tiles.splice(Math.floor(Math.random() * tiles.length), 1)[0];
      setTile(this.hive, t[0], t[1], AIR);
      this.burst(t[0] * TILE + 8, t[1] * TILE + 8, "#f6c453", 6);
    }
    if (tiles.length === 0) this.doorOpening = 0;
  }

  private beginWedding() {
    this.status = "wedding";
    this.weddingTime = 0;
    this.audio.startFlight();
    this.say("수벌들이 몰려온다 — 구애의 춤이 시작된다!", 5);
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
      // 구애춤: 여왕 둘레를 8자로 돈다
      const px = this.cx + Math.cos(spin) * d.radius;
      const py =
        this.cy + Math.sin(spin * 2 + d.phase) * d.radius * 0.42 + Math.sin(t * 2 + d.phase) * 6;
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

  private updateRoomLabel() {
    const r = roomOf(this.hive, this.cx, this.cy);
    const id = r ? r.id : this.cy < GROUND_Y * TILE ? "sky" : "";
    if (id && id !== this.lastRoomId) {
      this.lastRoomId = id;
      this.roomLabel = r ? r.name : "꽃밭";
      this.roomLabelTimer = 2.2;
    } else if (!id) {
      this.lastRoomId = "";
    }
  }

  private updateCamera(snap: boolean) {
    const tx = this.cx - this.vw / 2 + this.vx * 12;
    const ty = this.cy - this.vh / 2 + this.vy * 8;
    const cx = Math.max(0, Math.min(WORLD_W * TILE - this.vw, tx));
    const cy = Math.max(-620, Math.min(WORLD_H * TILE - this.vh, ty));
    if (snap) {
      this.camX = cx;
      this.camY = cy;
    } else {
      this.camX += (cx - this.camX) * 0.11;
      this.camY += (cy - this.camY) * 0.11;
    }
  }

  /** 지금 퀘스트가 가리키는 목표 지점 (나침반용) */
  private questTarget(): { x: number; y: number } | null {
    const h = this.hive;
    const near = <T extends { x: number; y: number }>(list: T[]) => {
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
    switch (this.questIndex) {
      case 0:
        return near(h.flowers.filter((f) => !f.used));
      case 1:
        return this.nectar > 0
          ? near(h.cells.filter((c) => !c.filled))
          : near(h.flowers.filter((f) => !f.used));
      case 2:
        return this.jelly > 0 ? near(h.larvae.filter((l) => !l.fed)) : h.jelly;
      case 3: {
        const crew = h.workers.filter((w) => w.recruited).length;
        return crew >= 2
          ? near(h.hornets.filter((x) => x.alive))
          : near(h.workers.filter((w) => !w.recruited));
      }
      case 4:
        return this.jelly > 0 ? h.queenCell : h.jelly;
      default:
        return { x: this.cx, y: -400 };
    }
  }

  // ---------------------------------------------------------------- 렌더

  private draw() {
    const ctx = this.ctx;
    const camX = Math.round(this.camX);
    const camY = Math.round(this.camY);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawSky(camY);

    ctx.save();
    ctx.translate(-camX, -camY);
    this.drawFarScenery(camX, camY);
    this.drawTiles(camX, camY);
    this.drawCombRooms(camX, camY);
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

    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,70,70,${this.hurtFlash * 0.45})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
    }
  }

  private drawSky(camY: number) {
    const ctx = this.ctx;
    const high = Math.max(0, Math.min(1, -camY / 620));
    const g = ctx.createLinearGradient(0, 0, 0, this.vh);
    const top = [92 - high * 60, 158 - high * 80, 226 - high * 60];
    const bot = [186 - high * 90, 220 - high * 70, 240 - high * 40];
    g.addColorStop(0, `rgb(${top.map((v) => Math.round(v)).join(",")})`);
    g.addColorStop(1, `rgb(${bot.map((v) => Math.round(v)).join(",")})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.vw, this.vh);

    // 해
    const sunY = 70 - camY * 0.06;
    if (sunY > -60 && sunY < this.vh + 60) {
      const sx = this.vw * 0.78;
      const rg = ctx.createRadialGradient(sx, sunY, 4, sx, sunY, 70);
      rg.addColorStop(0, "rgba(255,247,214,0.95)");
      rg.addColorStop(1, "rgba(255,247,214,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(sx, sunY, 70, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFarScenery(camX: number, camY: number) {
    const ctx = this.ctx;
    // 구름 (시차 이동)
    for (let i = 0; i < 9; i++) {
      const n = hash2(i, 3);
      const cx = ((i * 337 + this.elapsed * 6) % (WORLD_W * TILE + 400)) - 200 + camX * 0.35;
      const cy = -260 + n * 500 + camY * 0.25;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + n * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 46 + n * 30, 15 + n * 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 28, cy + 5, 30 + n * 16, 11 + n * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTiles(camX: number, camY: number) {
    const ctx = this.ctx;
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const x1 = Math.min(WORLD_W - 1, Math.ceil((camX + this.vw) / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const y1 = Math.min(WORLD_H - 1, Math.ceil((camY + this.vh) / TILE));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const v = tileAt(this.hive, x, y);
        if (v === AIR) {
          if (y > GROUND_Y) {
            // 굴 안쪽 배경 (방 밖 통로)
            ctx.fillStyle = "#3b2a17";
            ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          }
          continue;
        }
        const px = x * TILE;
        const py = y * TILE;
        const n = hash2(x, y);
        if (v === GRASS) {
          ctx.fillStyle = `rgb(${(96 + n * 20) | 0},${(154 + n * 26) | 0},${(66 + n * 18) | 0})`;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "rgba(160,214,110,0.6)";
          ctx.fillRect(px, py, TILE, 4);
        } else if (v === WAX || v === DOOR) {
          const b = n * 16;
          ctx.fillStyle =
            v === DOOR
              ? `rgb(${(232 + b * 0.4) | 0},${(186 + b * 0.5) | 0},${(84 + b) | 0})`
              : `rgb(${(206 + b) | 0},${(152 + b) | 0},${(66 + b * 0.8) | 0})`;
          ctx.fillRect(px, py, TILE, TILE);
          if (tileAt(this.hive, x, y - 1) === AIR) {
            ctx.fillStyle = "rgba(255,232,170,0.5)";
            ctx.fillRect(px, py, TILE, 3);
          }
          if (n > 0.8) {
            ctx.fillStyle = "rgba(140,94,32,0.35)";
            ctx.fillRect(px + 3 + ((n * 7) | 0), py + 4 + ((n * 9) | 0) % 8, 4, 3);
          }
        } else {
          const b = n * 18;
          ctx.fillStyle = `rgb(${(96 + b) | 0},${(70 + b * 0.8) | 0},${(48 + b * 0.6) | 0})`;
          ctx.fillRect(px, py, TILE, TILE);
          if (n > 0.86) {
            ctx.fillStyle = "rgba(58,40,26,0.5)";
            ctx.fillRect(px + 4, py + 5, 3, 3);
          }
        }
      }
    }
  }

  /** 방 안쪽 벌집 무늬 배경 (방마다 한 번만 그려 캐시) */
  private combCanvas(room: Room) {
    const key = room.id;
    const cached = this.combCache.get(key);
    if (cached) return cached;
    const w = room.w * TILE;
    const h = room.h * TILE;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const c = cv.getContext("2d");
    if (!c) return cv;
    c.fillStyle = "#5a3a18";
    c.fillRect(0, 0, w, h);
    const r = 13;
    const stepX = Math.sqrt(3) * r;
    const stepY = 1.5 * r;
    for (let row = 0; row * stepY < h + r; row++) {
      for (let col = 0; col * stepX < w + stepX; col++) {
        const cx = col * stepX + (row % 2 ? stepX / 2 : 0);
        const cy = row * stepY;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          const px = cx + Math.cos(a) * (r - 1.2);
          const py = cy + Math.sin(a) * (r - 1.2);
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
        const n = hash2(col, row);
        c.fillStyle = `rgba(${(122 + n * 26) | 0},${(84 + n * 20) | 0},${(34 + n * 14) | 0},1)`;
        c.fill();
        c.strokeStyle = "rgba(226,176,84,0.4)";
        c.lineWidth = 1.4;
        c.stroke();
      }
    }
    this.combCache.set(key, cv);
    return cv;
  }

  private drawCombRooms(camX: number, camY: number) {
    const ctx = this.ctx;
    for (const room of this.hive.rooms) {
      const rx = room.x * TILE;
      const ry = room.y * TILE;
      const rw = room.w * TILE;
      const rh = room.h * TILE;
      if (rx > camX + this.vw || rx + rw < camX || ry > camY + this.vh || ry + rh < camY) continue;
      ctx.drawImage(this.combCanvas(room), rx, ry);
      // 방 이름
      ctx.save();
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,226,160,0.16)";
      ctx.fillText(room.name, rx + rw / 2, ry + 26);
      ctx.restore();
    }
  }

  private drawFlowers(camX: number, camY: number) {
    const ctx = this.ctx;
    for (const f of this.hive.flowers) {
      if (f.x < camX - 40 || f.x > camX + this.vw + 40) continue;
      if (f.y < camY - 60 || f.y > camY + this.vh + 60) continue;
      const sway = Math.sin(f.sway) * 3;
      const topY = f.y - 30;
      ctx.strokeStyle = "#4f8a3c";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(f.x + sway * 0.5, f.y - 16, f.x + sway, topY);
      ctx.stroke();
      ctx.fillStyle = "#5aa04a";
      ctx.beginPath();
      ctx.ellipse(f.x + 6, f.y - 14, 6, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();

      const petals = 6;
      const open = f.used ? 0.6 : 1;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + f.sway * 0.2;
        ctx.fillStyle = f.used
          ? `hsl(${f.hue} 22% 62%)`
          : `hsl(${f.hue} 78% ${62 + Math.sin(i) * 6}%)`;
        ctx.beginPath();
        ctx.ellipse(
          f.x + sway + Math.cos(a) * 7 * open,
          topY + Math.sin(a) * 7 * open,
          6 * open,
          4.4 * open,
          a,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = f.used ? "#b9ac8a" : "#ffd85e";
      ctx.beginPath();
      ctx.arc(f.x + sway, topY, 4.4, 0, Math.PI * 2);
      ctx.fill();
      if (!f.used) {
        ctx.fillStyle = "rgba(255,236,160,0.25)";
        ctx.beginPath();
        ctx.arc(f.x + sway, topY, 11 + Math.sin(this.elapsed * 3 + f.sway) * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawHexCell(x: number, y: number, r: number, fill: string, stroke: string) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawProps(camX: number, camY: number) {
    const ctx = this.ctx;
    const vis = (x: number, y: number) =>
      x > camX - 60 && x < camX + this.vw + 60 && y > camY - 60 && y < camY + this.vh + 60;

    // 저장방 벌집칸
    for (const c of this.hive.cells) {
      if (!vis(c.x, c.y)) continue;
      if (c.filled) {
        this.drawHexCell(c.x, c.y, 15, "#f0a92a", "#ffdf9a");
        ctx.fillStyle = "rgba(255,240,190,0.55)";
        ctx.beginPath();
        ctx.ellipse(c.x - 3, c.y - 4, 4.5, 2.6, -0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        this.drawHexCell(c.x, c.y, 15, "rgba(48,30,12,0.75)", "rgba(240,196,110,0.75)");
        const pulse = 0.4 + Math.sin(this.elapsed * 3 + c.x) * 0.15;
        ctx.strokeStyle = `rgba(255,226,150,${this.nectar > 0 ? pulse : 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 19, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 로열젤리 웅덩이
    const j = this.hive.jelly;
    if (vis(j.x, j.y)) {
      ctx.fillStyle = "rgba(255,245,214,0.22)";
      ctx.beginPath();
      ctx.ellipse(j.x, j.y, 26 + Math.sin(this.elapsed * 2) * 2, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fdf3d3";
      ctx.beginPath();
      ctx.ellipse(j.x, j.y, 19, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(j.x - 6, j.y - 2, 5, 2.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,247,220,0.75)";
      ctx.fillText("로열젤리", j.x, j.y - 16);
    }

    // 애벌레
    for (const l of this.hive.larvae) {
      if (!vis(l.x, l.y)) continue;
      this.drawHexCell(l.x, l.y, 16, "rgba(60,38,14,0.85)", "rgba(226,176,84,0.8)");
      const wig = Math.sin(this.elapsed * 3 + l.wiggle) * 1.6;
      ctx.fillStyle = l.fed ? "#fff6dd" : "#f3e3bd";
      ctx.beginPath();
      ctx.ellipse(l.x, l.y + 2 + wig * 0.3, 8, 6, wig * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(196,164,110,0.8)";
      ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(l.x + i * 3.4, l.y - 3);
        ctx.lineTo(l.x + i * 3.4, l.y + 6);
        ctx.stroke();
      }
      ctx.fillStyle = "#5b4327";
      ctx.fillRect(l.x + 3, l.y + wig * 0.2, 1.4, 1.4);
      if (l.fed) {
        ctx.fillStyle = "rgba(255,236,168,0.9)";
        ctx.font = "9px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("♪", l.x, l.y - 12);
      }
    }

    // 왕대
    const q = this.hive.queenCell;
    if (vis(q.x, q.y)) {
      const ready = this.questIndex >= 4;
      ctx.save();
      ctx.translate(q.x, q.y);
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 54);
      glow.addColorStop(0, `rgba(255,226,150,${ready ? 0.4 : 0.16})`);
      glow.addColorStop(1, "rgba(255,226,150,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, Math.PI * 2);
      ctx.fill();
      // 땅콩 모양으로 늘어진 왕대
      ctx.fillStyle = "#d9a441";
      ctx.beginPath();
      ctx.ellipse(0, -18, 17, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 2, 15, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 20, 11, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,78,20,0.5)";
      ctx.lineWidth = 1.6;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(0, i * 9, 13, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,244,206,0.9)";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("왕대", 0, -40);
      ctx.restore();
    }
  }

  /** 벌 그리기. kind 에 따라 몸집과 색이 달라진다. */
  private drawBee(
    x: number,
    y: number,
    dir: number,
    scale: number,
    wingPhase: number,
    kind: "player" | "queen" | "worker" | "drone" | "hornet"
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * scale, scale);

    const body = kind === "hornet" ? "#e2861f" : "#f6c343";
    const dark = kind === "hornet" ? "#3a2408" : "#3d2c10";
    const fuzz = kind === "hornet" ? "#b96412" : "#e8b13a";
    const abdomenLen = kind === "queen" ? 15 : kind === "hornet" ? 14 : 10;

    // 날개
    const flap = Math.sin(wingPhase) * 0.55 + 0.6;
    ctx.fillStyle = kind === "hornet" ? "rgba(220,220,230,0.4)" : "rgba(226,242,255,0.55)";
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.6;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(-2, -5);
      ctx.rotate(s * 0.25);
      ctx.beginPath();
      ctx.ellipse(-4, -3, 11, 4.4 * flap, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 배 (줄무늬)
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-abdomenLen * 0.5, 0, abdomenLen, 7.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-abdomenLen * 0.28 - i * (abdomenLen * 0.42), 0, 2.2, 7.2 - i * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (kind === "hornet") {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-abdomenLen * 1.45, 0);
      ctx.lineTo(-abdomenLen * 1.9, 1.5);
      ctx.stroke();
    }

    // 가슴 (털)
    ctx.fillStyle = fuzz;
    ctx.beginPath();
    ctx.arc(4, -1, 6.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,236,180,0.7)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(4 + Math.cos(a) * 5.4, -1 + Math.sin(a) * 5.4);
      ctx.lineTo(4 + Math.cos(a) * 8, -1 + Math.sin(a) * 8);
      ctx.stroke();
    }

    // 머리
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(11.5, -1.5, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kind === "drone" ? "#1b1b25" : "#241a08";
    ctx.beginPath();
    ctx.ellipse(13.6, -2.6, kind === "drone" ? 3.4 : 2.2, kind === "drone" ? 3.2 : 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(14.4, -3.4, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(13, -4.5);
      ctx.quadraticCurveTo(17, -8 + s * 1.5, 19.5, -9 + s * 3 + Math.sin(wingPhase * 0.3) * 0.6);
      ctx.stroke();
    }

    // 다리
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(4 - i * 4, 5);
      ctx.lineTo(2 - i * 4 + Math.sin(wingPhase * 0.2 + i) * 1.5, 10);
      ctx.stroke();
    }

    // 왕관
    if (kind === "queen") {
      ctx.fillStyle = "#ffd75e";
      ctx.beginPath();
      ctx.moveTo(6, -9);
      ctx.lineTo(8, -15);
      ctx.lineTo(10.5, -10);
      ctx.lineTo(13, -16);
      ctx.lineTo(15, -9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff7ea8";
      ctx.beginPath();
      ctx.arc(11, -11.5, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawWorkers() {
    for (const w of this.hive.workers) {
      this.drawBee(
        w.x,
        w.y,
        w.recruited ? (this.facing as number) : 1,
        0.58,
        this.elapsed * 30 + w.phase,
        "worker"
      );
      if (!w.recruited) {
        const ctx = this.ctx;
        ctx.fillStyle = "rgba(255,236,168,0.5)";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("?", w.x, w.y - 14);
      }
    }
  }

  private drawHornets() {
    for (const h of this.hive.hornets) {
      if (!h.alive) continue;
      this.drawBee(h.x, h.y, h.vx >= 0 ? 1 : -1, 1.0, this.elapsed * 34 + h.wiggle, "hornet");
    }
  }

  private drawDrones() {
    for (const d of this.drones) {
      this.drawBee(d.x, d.y, d.dir, 0.78, this.elapsed * 30 + d.phase, "drone");
    }
  }

  private drawPlayer() {
    if (this.invuln > 0 && Math.floor(this.elapsed * 20) % 2 === 0) return;
    this.drawBee(
      this.cx,
      this.cy,
      this.facing,
      this.isQueen ? 1.15 : 0.82,
      this.wingPhase,
      this.isQueen ? "queen" : "player"
    );
    // 들고 있는 것
    const ctx = this.ctx;
    if (this.nectar > 0) {
      ctx.fillStyle = "#ffcf4d";
      ctx.beginPath();
      ctx.arc(this.cx - this.facing * 13, this.cy + 7, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.jelly > 0) {
      ctx.fillStyle = "#fdf3d3";
      ctx.beginPath();
      ctx.arc(this.cx - this.facing * 13, this.cy - 8, 3.6, 0, Math.PI * 2);
      ctx.fill();
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
    const underground = this.cy > GROUND_Y * TILE;
    const px = this.cx - this.camX;
    const py = this.cy - this.camY;
    const r = underground ? Math.max(this.vw, this.vh) * 0.62 : Math.max(this.vw, this.vh) * 0.95;
    const g = ctx.createRadialGradient(px, py, r * 0.25, px, py, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, underground ? "rgba(24,12,2,0.72)" : "rgba(10,20,40,0.32)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.vw, this.vh);
  }

  private drawCompass(camX: number, camY: number) {
    if (this.status !== "playing") return;
    const t = this.questTarget();
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
