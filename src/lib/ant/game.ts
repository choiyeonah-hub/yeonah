// 개미집 탐험 게임 엔진 (캔버스 2D, 고정 타임스텝).
import {
  AIR,
  Ant,
  DIRT,
  GRASS,
  Item,
  ROCK,
  SAND,
  TILE,
  WORLD_H,
  WORLD_W,
  World,
  generateWorld,
  isDiggable,
  isSolid,
  setTile,
  tileAt,
} from "./world";
import { Sfx } from "./audio";

export const VIEW_W = 480;
export const VIEW_H = 300;

const GRAVITY = 0.42;
const MAX_FALL = 7.2;
const MOVE_SPEED = 1.35;
const JUMP_VY = -5.6;
const CLIMB_SPEED = 1.0;
const PLAYER_W = 7;
const PLAYER_H = 13;

const DIG_TIME: Record<number, number> = {
  [DIRT]: 0.42,
  [GRASS]: 0.34,
  [SAND]: 0.2,
};

export type Status = "playing" | "dead" | "won";

export type GameState = {
  hp: number;
  maxHp: number;
  stamina: number;
  lantern: number;
  crumbs: number;
  crumbGoal: number;
  depthCm: number;
  status: Status;
  message: string;
  elapsed: number;
  seed: number;
};

export type InputName =
  | "left"
  | "right"
  | "up"
  | "down"
  | "jump"
  | "dig";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

type Box = { x: number; y: number; w: number; h: number };

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function collidesWorld(world: World, box: Box) {
  const x0 = Math.floor(box.x / TILE);
  const x1 = Math.floor((box.x + box.w - 0.001) / TILE);
  const y0 = Math.floor(box.y / TILE);
  const y1 = Math.floor((box.y + box.h - 0.001) / TILE);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (isSolid(tileAt(world, x, y))) return true;
    }
  }
  return false;
}

/** 축 분리 방식으로 이동시키고 벽/바닥 충돌 여부를 돌려준다. */
function moveBox(world: World, box: Box, vx: number, vy: number) {
  const res = { hitX: false, hitY: false, grounded: false };

  let steps = Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) / 4) || 1;
  const sx = vx / steps;
  const sy = vy / steps;

  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      const next = { ...box, x: box.x + sx };
      if (collidesWorld(world, next)) {
        res.hitX = true;
        // 한 픽셀씩 밀어붙여 벽에 딱 붙인다.
        const dir = Math.sign(sx);
        while (!collidesWorld(world, { ...box, x: box.x + dir })) box.x += dir;
      } else {
        box.x = next.x;
      }
    }
    if (sy !== 0) {
      const next = { ...box, y: box.y + sy };
      if (collidesWorld(world, next)) {
        res.hitY = true;
        if (sy > 0) res.grounded = true;
        const dir = Math.sign(sy);
        while (!collidesWorld(world, { ...box, y: box.y + dir })) box.y += dir;
      } else {
        box.y = next.y;
      }
    }
  }
  return res;
}

/** 두 점 사이에 흙/돌이 없는지 대충 검사한다 (개미 시야). */
function hasLineOfSight(world: World, x0: number, y0: number, x1: number, y1: number) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (isSolid(tileAt(world, Math.floor(x / TILE), Math.floor(y / TILE)))) return false;
  }
  return true;
}

function hash2(x: number, y: number) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

export class AntGame {
  private canvas: HTMLCanvasElement;
  private vw = VIEW_W;
  private vh = VIEW_H;
  private ctx: CanvasRenderingContext2D;
  private dark: HTMLCanvasElement;
  private darkCtx: CanvasRenderingContext2D;
  private onState: (s: GameState) => void;
  private sfx = new Sfx();

  private world!: World;
  private seed: number;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;

  private input: Record<InputName, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    dig: false,
  };

  // 플레이어
  private box: Box = { x: 0, y: 0, w: PLAYER_W, h: PLAYER_H };
  private vx = 0;
  private vy = 0;
  private facing: 1 | -1 = 1;
  private grounded = false;
  private climbing = false;
  private jumpHeld = false;
  private coyote = 0;
  private walkAnim = 0;

  private hp = 100;
  private stamina = 100;
  private lantern = 100;
  private crumbs = 0;
  private invuln = 0;
  private hurtFlash = 0;
  private status: Status = "playing";
  private message = "";
  private messageTimer = 0;
  private elapsed = 0;

  private digTarget: { x: number; y: number } | null = null;
  private digProgress = 0;
  private particles: Particle[] = [];
  private camX = 0;
  private camY = 0;
  private stateTick = 0;

  constructor(
    canvas: HTMLCanvasElement,
    opts: { onState: (s: GameState) => void; seed?: number }
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.vw = canvas.width || VIEW_W;
    this.vh = canvas.height || VIEW_H;
    this.dark = document.createElement("canvas");
    this.dark.width = this.vw;
    this.dark.height = this.vh;
    const dctx = this.dark.getContext("2d");
    if (!dctx) throw new Error("canvas 2d context unavailable");
    this.darkCtx = dctx;

    this.onState = opts.onState;
    this.seed = opts.seed ?? Math.floor(Math.random() * 1e9);
    this.reset(this.seed);
  }

  reset(seed = Math.floor(Math.random() * 1e9)) {
    this.seed = seed;
    this.world = generateWorld(seed);
    this.box = {
      x: this.world.spawn.x - PLAYER_W / 2,
      y: this.world.spawn.y,
      w: PLAYER_W,
      h: PLAYER_H,
    };
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.hp = 100;
    this.stamina = 100;
    this.lantern = 100;
    this.crumbs = 0;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.status = "playing";
    this.elapsed = 0;
    this.particles = [];
    this.digTarget = null;
    this.digProgress = 0;
    this.say("발밑에 개미집 입구가 있다. 굴을 따라 내려가자!", 5);
    this.updateCamera(true);
    this.emit();
    this.draw();
  }

  setInput(name: InputName, down: boolean) {
    this.input[name] = down;
  }

  /** 화면 비율이 바뀌면 내부 렌더 해상도를 다시 잡는다 (세로 화면에서 더 넓게 보이도록). */
  resize(width: number, height: number) {
    const w = Math.max(240, Math.round(width));
    const h = Math.max(200, Math.round(height));
    if (w === this.vw && h === this.vh) return;
    this.vw = w;
    this.vh = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.dark.width = w;
    this.dark.height = h;
    this.ctx.imageSmoothingEnabled = false;
    this.updateCamera(true);
    this.draw();
  }

  setMuted(muted: boolean) {
    this.sfx.muted = muted;
  }

  clearInput() {
    (Object.keys(this.input) as InputName[]).forEach((k) => (this.input[k] = false));
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
  }

  private say(text: string, seconds = 2.5) {
    this.message = text;
    this.messageTimer = seconds;
  }

  private emit() {
    const surf = this.world.surface[
      Math.max(0, Math.min(WORLD_W - 1, Math.floor(this.box.x / TILE)))
    ];
    const depthCm = Math.max(0, Math.round(((this.box.y + this.box.h) / TILE - surf) * 10));
    this.onState({
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: 100,
      stamina: Math.round(this.stamina),
      lantern: Math.round(this.lantern),
      crumbs: this.crumbs,
      crumbGoal: this.world.crumbGoal,
      depthCm,
      status: this.status,
      message: this.messageTimer > 0 ? this.message : "",
      elapsed: this.elapsed,
      seed: this.seed,
    });
  }

  // ---------------------------------------------------------------- 업데이트

  private update(dt: number) {
    if (this.status !== "playing") {
      this.updateParticles(dt);
      return;
    }

    this.elapsed += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    this.updatePlayer(dt);
    this.updateAnts(dt);
    this.updateItems();
    this.updateParticles(dt);
    this.updateCamera(false);

    // 랜턴은 땅속에서만 닳는다.
    const surf = this.world.surface[
      Math.max(0, Math.min(WORLD_W - 1, Math.floor(this.box.x / TILE)))
    ];
    const underground = this.box.y / TILE > surf;
    if (underground) this.lantern = Math.max(0, this.lantern - 1.1 * dt);
    else this.lantern = Math.min(100, this.lantern + 8 * dt);

    // 여왕방 도착 판정
    const dq = Math.hypot(this.box.x - this.world.queen.x, this.box.y - this.world.queen.y);
    if (dq < 26) {
      if (this.crumbs >= this.world.crumbGoal) {
        this.status = "won";
        this.sfx.play("win");
        this.say("여왕개미에게 먹이를 바쳤다!", 99);
        this.burst(this.world.queen.x, this.world.queen.y, "#ffe08a", 40);
      } else if (this.messageTimer <= 0) {
        this.say(`부스러기가 더 필요해! (${this.crumbs}/${this.world.crumbGoal})`, 2.5);
      }
    }

    if (this.hp <= 0) {
      this.status = "dead";
      this.sfx.play("lose");
      this.say("개미들에게 쫓겨났다...", 99);
    }

    this.stateTick += dt;
    if (this.stateTick > 0.1 || this.status !== "playing") {
      this.stateTick = 0;
      this.emit();
    }
  }

  private updatePlayer(dt: number) {
    const inp = this.input;
    const wantLeft = inp.left && !inp.right;
    const wantRight = inp.right && !inp.left;

    if (wantLeft) this.facing = -1;
    if (wantRight) this.facing = 1;

    // 벽 붙기 판정 (개미굴 수직 갱도를 오르내리기 위한 클라이밍)
    const touchingLeft = collidesWorld(this.world, { ...this.box, x: this.box.x - 1.5 });
    const touchingRight = collidesWorld(this.world, { ...this.box, x: this.box.x + 1.5 });
    const canClimb = touchingLeft || touchingRight;

    this.climbing = canClimb && (inp.up || inp.down) && this.stamina > 0;

    if (this.climbing) {
      this.vy = inp.up ? -CLIMB_SPEED : CLIMB_SPEED;
      this.vx = wantLeft ? -0.4 : wantRight ? 0.4 : 0;
      this.stamina = Math.max(0, this.stamina - 6 * dt);
    } else {
      const target = (wantLeft ? -1 : wantRight ? 1 : 0) * MOVE_SPEED;
      this.vx += (target - this.vx) * (this.grounded ? 0.35 : 0.16);
      this.vy = Math.min(MAX_FALL, this.vy + GRAVITY);
    }

    // 점프
    if (this.grounded) this.coyote = 0.12;
    else this.coyote = Math.max(0, this.coyote - dt);

    if (inp.jump && !this.jumpHeld && this.coyote > 0 && this.stamina >= 5) {
      this.vy = JUMP_VY;
      this.coyote = 0;
      this.stamina -= 5;
      this.grounded = false;
      this.sfx.play("jump");
    }
    if (inp.jump && !this.jumpHeld && this.climbing) {
      // 벽에서 반대쪽으로 차기
      this.vy = JUMP_VY * 0.85;
      this.vx = touchingLeft ? MOVE_SPEED * 1.6 : -MOVE_SPEED * 1.6;
      this.climbing = false;
    }
    this.jumpHeld = inp.jump;

    const r = moveBox(this.world, this.box, this.vx, this.vy);
    if (r.hitX) this.vx = 0;
    if (r.hitY) this.vy = 0;
    this.grounded = r.grounded || this.climbing;

    if (Math.abs(this.vx) > 0.2 && this.grounded) this.walkAnim += dt * 12;

    // 낙하 데미지
    if (r.grounded && this.vyBeforeLanding > 6.4) {
      const dmg = Math.round((this.vyBeforeLanding - 6.4) * 12);
      if (dmg > 0) this.hurt(dmg, 0);
    }
    this.vyBeforeLanding = r.grounded ? 0 : Math.max(this.vyBeforeLanding, this.vy);

    // 스태미나 회복
    if (!this.climbing && !this.input.dig) {
      this.stamina = Math.min(100, this.stamina + 16 * dt);
    }

    // 파기
    this.updateDig(dt);

    // 월드 밖으로 못 나가게
    this.box.x = Math.max(TILE, Math.min(WORLD_W * TILE - TILE - this.box.w, this.box.x));
    if (this.box.y > WORLD_H * TILE) this.hurt(999, 0);
  }

  private vyBeforeLanding = 0;

  private updateDig(dt: number) {
    if (!this.input.dig) {
      this.digTarget = null;
      this.digProgress = 0;
      return;
    }
    if (this.stamina <= 2) {
      if (this.messageTimer <= 0) this.say("힘이 다 빠졌어! 잠깐 쉬자", 1.5);
      return;
    }

    const cx = this.box.x + this.box.w / 2;
    const cy = this.box.y + this.box.h / 2;
    let tx = Math.floor((cx + this.facing * (this.box.w / 2 + 4)) / TILE);
    let ty = Math.floor(cy / TILE);
    if (this.input.down) {
      tx = Math.floor(cx / TILE);
      ty = Math.floor((this.box.y + this.box.h + 3) / TILE);
    } else if (this.input.up) {
      tx = Math.floor(cx / TILE);
      ty = Math.floor((this.box.y - 3) / TILE);
    }

    const v = tileAt(this.world, tx, ty);
    if (!isDiggable(v)) {
      if (v === ROCK && this.messageTimer <= 0) this.say("돌이라 파이지 않아", 1.2);
      this.digTarget = null;
      this.digProgress = 0;
      return;
    }

    if (!this.digTarget || this.digTarget.x !== tx || this.digTarget.y !== ty) {
      this.digTarget = { x: tx, y: ty };
      this.digProgress = 0;
    }

    this.stamina = Math.max(0, this.stamina - 20 * dt);
    const wasDigging = this.digProgress;
    this.digProgress += dt;
    if (Math.floor(wasDigging * 8) !== Math.floor(this.digProgress * 8)) this.sfx.play("dig");

    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE / 2;
    if (Math.random() < 0.4) {
      this.particles.push({
        x: px + (Math.random() - 0.5) * 10,
        y: py + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -Math.random() * 1.2,
        life: 0.4,
        maxLife: 0.4,
        color: v === SAND ? "#d9bf8e" : "#7a5636",
        size: 1.5,
      });
    }

    if (this.digProgress >= (DIG_TIME[v] ?? 0.45)) {
      setTile(this.world, tx, ty, AIR);
      this.sfx.play("break");
      this.burst(px, py, v === SAND ? "#d9bf8e" : "#6b4a2e", 10);
      this.digTarget = null;
      this.digProgress = 0;
    }
  }

  private updateAnts(dt: number) {
    const pcx = this.box.x + this.box.w / 2;
    const pcy = this.box.y + this.box.h / 2;

    for (const ant of this.world.ants) {
      const box: Box = { x: ant.x - 5, y: ant.y - 7, w: 10, h: 7 };
      ant.wiggle += dt * 10;
      if (ant.hurtCooldown > 0) ant.hurtCooldown -= dt;

      const dx = pcx - ant.x;
      const dy = pcy - ant.y;
      const dist = Math.hypot(dx, dy);
      // 병정개미는 자기 구역(둥지)에서 너무 멀어지면 추격을 포기한다.
      const leashed = Math.hypot(ant.x - ant.homeX, ant.y - ant.homeY) < 210;
      const chasing =
        ant.kind === "soldier" &&
        dist < 150 &&
        leashed &&
        this.status === "playing" &&
        hasLineOfSight(this.world, ant.x, ant.y - 4, pcx, pcy);

      const speed = chasing ? 1.05 : ant.kind === "worker" ? 0.5 : 0.65;
      if (chasing) ant.dir = dx > 0 ? 1 : -1;

      // 앞이 막혔거나 낭떠러지면 돌아선다 (추격 중엔 벽을 탄다)
      const aheadX = ant.x + ant.dir * 7;
      const wallAhead = isSolid(
        tileAt(this.world, Math.floor(aheadX / TILE), Math.floor((ant.y - 3) / TILE))
      );
      const floorAhead = isSolid(
        tileAt(this.world, Math.floor(aheadX / TILE), Math.floor((ant.y + 3) / TILE))
      );

      ant.climbing = false;
      if (wallAhead) {
        if (chasing || Math.random() < 0.02) {
          ant.climbing = true; // 개미는 벽을 탄다
        } else {
          ant.dir = ant.dir === 1 ? -1 : 1;
        }
      } else if (!floorAhead && !chasing) {
        ant.dir = ant.dir === 1 ? -1 : 1;
      }

      if (chasing && dy < -10 && (wallAhead || !floorAhead)) ant.climbing = true;

      ant.vx = ant.dir * speed;
      if (ant.climbing) {
        ant.vy = dy < 0 ? -0.8 : 0.6;
      } else {
        ant.vy = Math.min(MAX_FALL, ant.vy + GRAVITY);
      }

      // 순찰 개미는 자기 방 근처를 벗어나지 않는다
      if (!chasing && Math.abs(ant.x - ant.homeX) > 70) {
        ant.dir = ant.x > ant.homeX ? -1 : 1;
        ant.vx = ant.dir * speed;
      }

      const res = moveBox(this.world, box, ant.vx, ant.vy);
      ant.x = box.x + 5;
      ant.y = box.y + 7;
      if (res.hitX && !ant.climbing) ant.dir = ant.dir === 1 ? -1 : 1;
      if (res.hitY) ant.vy = 0;

      // 접촉 피해
      if (
        ant.kind === "soldier" &&
        this.invuln <= 0 &&
        overlaps(box, this.box) &&
        this.status === "playing"
      ) {
        this.hurt(13, Math.sign(dx) || 1);
      }
    }
  }

  private updateItems() {
    const pbox = this.box;
    for (const it of this.world.items) {
      if (it.taken) continue;
      const ibox: Box = { x: it.x - 6, y: it.y - 6, w: 12, h: 12 };
      if (!overlaps(ibox, pbox)) continue;
      it.taken = true;
      if (it.kind === "crumb") {
        this.crumbs++;
        this.say(`먹이 부스러기 ${this.crumbs}/${this.world.crumbGoal}`, 1.6);
        this.sfx.play("pickup");
        this.burst(it.x, it.y, "#e9c67a", 12);
      } else if (it.kind === "moss") {
        this.lantern = Math.min(100, this.lantern + 40);
        this.say("빛이끼! 시야가 밝아졌다", 1.6);
        this.sfx.play("moss");
        this.burst(it.x, it.y, "#8ef0b0", 14);
      } else {
        this.hp = Math.min(100, this.hp + 28);
        this.say("이슬 한 방울, 회복!", 1.6);
        this.sfx.play("moss");
        this.burst(it.x, it.y, "#8fd7ff", 12);
      }
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
      p.vy += 0.12;
    }
  }

  private hurt(amount: number, knockDir: number) {
    if (this.invuln > 0 || this.status !== "playing") return;
    this.hp -= amount;
    this.invuln = 1.3;
    this.hurtFlash = 0.3;
    this.sfx.play("hurt");
    this.vx = -knockDir * 2.4;
    this.vy = -2.6;
    this.burst(this.box.x + this.box.w / 2, this.box.y + this.box.h / 2, "#ff7b6b", 12);
    this.emit();
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.4 + Math.random() * 1.8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 0.6,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        color,
        size: 1 + Math.random() * 1.6,
      });
    }
  }

  private updateCamera(snap: boolean) {
    const tx = this.box.x + this.box.w / 2 - this.vw / 2;
    const ty = this.box.y + this.box.h / 2 - this.vh / 2;
    const maxX = WORLD_W * TILE - this.vw;
    const maxY = WORLD_H * TILE - this.vh;
    const cx = Math.max(0, Math.min(maxX, tx));
    const cy = Math.max(-40, Math.min(maxY, ty));
    if (snap) {
      this.camX = cx;
      this.camY = cy;
    } else {
      this.camX += (cx - this.camX) * 0.12;
      this.camY += (cy - this.camY) * 0.12;
    }
  }

  // ------------------------------------------------------------------ 렌더

  private draw() {
    const ctx = this.ctx;
    const camX = Math.round(this.camX);
    const camY = Math.round(this.camY);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.vw, this.vh);

    this.drawSky(camY);

    ctx.save();
    ctx.translate(-camX, -camY);

    this.drawBackWall(camX, camY);
    this.drawTiles(camX, camY);
    this.drawItems(camX, camY);
    this.drawQueen();
    this.drawAnts(camX, camY);
    this.drawPlayer();
    this.drawParticles();

    ctx.restore();

    this.drawDarkness(camX, camY);

    this.drawQueenCompass(camX, camY);

    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${this.hurtFlash * 0.5})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
    }
  }

  /** 여왕방이 화면 밖일 때 가장자리에 방향 표시를 띄운다. */
  private drawQueenCompass(camX: number, camY: number) {
    const qx = this.world.queen.x - camX;
    const qy = this.world.queen.y - camY;
    const onScreen = qx > 10 && qx < this.vw - 10 && qy > 10 && qy < this.vh - 10;
    if (onScreen || this.status !== "playing") return;

    const cx = this.vw / 2;
    const cy = this.vh / 2;
    const a = Math.atan2(qy - cy, qx - cx);
    const rx = this.vw / 2 - 18;
    const ry = this.vh / 2 - 18;
    const k = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
    const px = cx + Math.cos(a) * k;
    const py = cy + Math.sin(a) * k;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(this.elapsed * 3) * 0.15;
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.fillStyle = "#f0a6ff";
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawSky(camY: number) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, this.vh);
    const t = Math.max(0, Math.min(1, camY / 260));
    g.addColorStop(0, `rgb(${Math.round(126 - 100 * t)},${Math.round(196 - 160 * t)},${Math.round(232 - 190 * t)})`);
    g.addColorStop(1, `rgb(${Math.round(196 - 170 * t)},${Math.round(226 - 196 * t)},${Math.round(238 - 206 * t)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.vw, this.vh);
  }

  /** 땅속 배경(파낸 굴 뒤편의 흙벽). 굴과 단단한 흙을 눈으로 구분하게 해준다. */
  private drawBackWall(camX: number, camY: number) {
    const ctx = this.ctx;
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const x1 = Math.min(WORLD_W - 1, Math.ceil((camX + this.vw) / TILE));
    for (let x = x0; x <= x1; x++) {
      const top = this.world.surface[x] * TILE;
      const y = Math.max(top, camY - TILE);
      const h = camY + this.vh + TILE - y;
      if (h <= 0) continue;
      const n = hash2(x, 7);
      ctx.fillStyle = `rgb(${(42 + n * 8) | 0},${(29 + n * 6) | 0},${(20 + n * 5) | 0})`;
      ctx.fillRect(x * TILE, y, TILE, h);
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
        const v = tileAt(this.world, x, y);
        if (v === AIR) continue;
        const px = x * TILE;
        const py = y * TILE;
        const n = hash2(x, y);
        const openAbove = tileAt(this.world, x, y - 1) === AIR;

        if (v === GRASS) {
          ctx.fillStyle = `rgb(${86 + n * 18 | 0},${132 + n * 26 | 0},${58 + n * 16 | 0})`;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "rgba(140,196,96,0.55)";
          ctx.fillRect(px, py, TILE, 3);
        } else if (v === ROCK) {
          const s = 58 + n * 22;
          ctx.fillStyle = `rgb(${s | 0},${(s + 4) | 0},${(s + 12) | 0})`;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(px + ((n * 9) | 0), py + ((n * 11) | 0) % 12, 3, 2);
        } else if (v === SAND) {
          ctx.fillStyle = `rgb(${186 + n * 26 | 0},${156 + n * 22 | 0},${102 + n * 20 | 0})`;
          ctx.fillRect(px, py, TILE, TILE);
        } else {
          const b = n * 18;
          ctx.fillStyle = `rgb(${(122 + b) | 0},${(90 + b * 0.8) | 0},${(62 + b * 0.6) | 0})`;
          ctx.fillRect(px, py, TILE, TILE);
          if (n > 0.82) {
            ctx.fillStyle = "rgba(60,40,26,0.55)";
            ctx.fillRect(px + 4 + ((n * 6) | 0), py + 5 + ((n * 8) | 0) % 7, 3, 3);
          }
        }

        if (openAbove && v !== GRASS) {
          ctx.fillStyle = "rgba(255,226,180,0.14)";
          ctx.fillRect(px, py, TILE, 2);
        }
        if (tileAt(this.world, x, y + 1) === AIR) {
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(px, py + TILE - 2, TILE, 2);
        }

        if (this.digTarget && this.digTarget.x === x && this.digTarget.y === y) {
          const p = this.digProgress / (DIG_TIME[v] ?? 0.45);
          ctx.fillStyle = `rgba(0,0,0,${0.15 + p * 0.35})`;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = "rgba(255,236,180,0.9)";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        }
      }
    }
  }

  private drawItems(camX: number, camY: number) {
    const ctx = this.ctx;
    const t = this.elapsed;
    for (const it of this.world.items) {
      if (it.taken) continue;
      if (it.x < camX - 20 || it.x > camX + this.vw + 20) continue;
      if (it.y < camY - 20 || it.y > camY + this.vh + 20) continue;
      const y = it.y + Math.sin(t * 2 + it.bob) * 1.5;

      if (it.kind === "crumb") {
        ctx.fillStyle = "#e6c17c";
        ctx.fillRect(it.x - 3, y - 2, 5, 4);
        ctx.fillStyle = "#f6dda6";
        ctx.fillRect(it.x - 1, y - 4, 3, 3);
        ctx.fillStyle = "#b78f4e";
        ctx.fillRect(it.x - 3, y + 1, 6, 1);
      } else if (it.kind === "moss") {
        ctx.fillStyle = "rgba(120,255,170,0.18)";
        ctx.beginPath();
        ctx.arc(it.x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8ef0b0";
        for (let i = 0; i < 4; i++) {
          const a = t * 1.2 + (i * Math.PI) / 2 + it.bob;
          ctx.fillRect(it.x + Math.cos(a) * 3 - 1, y + Math.sin(a) * 2 - 1, 2, 2);
        }
      } else {
        ctx.fillStyle = "#8fd7ff";
        ctx.beginPath();
        ctx.moveTo(it.x, y - 5);
        ctx.quadraticCurveTo(it.x + 4, y + 1, it.x, y + 4);
        ctx.quadraticCurveTo(it.x - 4, y + 1, it.x, y - 5);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(it.x - 2, y - 1, 1, 2);
      }
    }
  }

  private drawAnt(x: number, y: number, dir: number, scale: number, color: string, dark: string, wiggle: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * scale, scale);

    // 다리
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 3;
      const swing = Math.sin(wiggle + i) * 1.6;
      ctx.beginPath();
      ctx.moveTo(off, -4);
      ctx.lineTo(off + swing, 0);
      ctx.stroke();
    }
    // 몸통 3마디
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-4.5, -5, 3.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-0.5, -5, 2.2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(3.6, -5.4, 2.6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 더듬이
    ctx.strokeStyle = dark;
    ctx.beginPath();
    ctx.moveTo(5, -6.6);
    ctx.lineTo(7.4, -8.6 + Math.sin(wiggle) * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, -6.6);
    ctx.lineTo(7.6, -6.4 + Math.cos(wiggle) * 0.6);
    ctx.stroke();
    // 눈
    ctx.fillStyle = "#1b1008";
    ctx.fillRect(4.2, -6.2, 1.2, 1.2);
    ctx.restore();
  }

  private drawAnts(camX: number, camY: number) {
    for (const ant of this.world.ants) {
      if (ant.x < camX - 30 || ant.x > camX + this.vw + 30) continue;
      if (ant.y < camY - 30 || ant.y > camY + this.vh + 30) continue;
      const soldier = ant.kind === "soldier";
      this.drawAnt(
        ant.x,
        ant.y,
        ant.dir,
        soldier ? 1.25 : 1,
        soldier ? "#8e2f22" : "#6b4326",
        soldier ? "#4a150f" : "#3c2415",
        ant.wiggle
      );
    }
  }

  private drawQueen() {
    const ctx = this.ctx;
    const { x, y } = this.world.queen;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(2.6, 2.6);
    ctx.translate(-x, -y);
    this.drawAnt(x, y, -1, 1, "#5b2c6b", "#2f1439", this.elapsed * 2);
    ctx.restore();
    // 왕관
    ctx.fillStyle = "#ffd75e";
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 20);
    ctx.lineTo(x + 11, y - 26);
    ctx.lineTo(x + 14, y - 20);
    ctx.lineTo(x + 17, y - 26);
    ctx.lineTo(x + 20, y - 20);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const { x, y, w, h } = this.box;
    if (this.invuln > 0 && Math.floor(this.elapsed * 20) % 2 === 0) return;

    const step = this.grounded && Math.abs(this.vx) > 0.2 ? Math.sin(this.walkAnim) : 0;

    ctx.save();
    ctx.translate(Math.round(x + w / 2), Math.round(y));

    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, h, 5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 다리
    ctx.strokeStyle = "#2e3d63";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-1, 8);
    ctx.lineTo(-1 + step * 2, 13);
    ctx.moveTo(1.5, 8);
    ctx.lineTo(1.5 - step * 2, 13);
    ctx.stroke();

    // 몸통 (탐험가 재킷)
    ctx.fillStyle = "#e0a03e";
    ctx.fillRect(-3, 4, 6, 5);
    ctx.fillStyle = "#c9822a";
    ctx.fillRect(-3, 7, 6, 2);

    // 팔 (랜턴 든 쪽)
    ctx.strokeStyle = "#e6b25a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(this.facing * 4, 7 - step);
    ctx.stroke();

    // 머리 + 헬멧
    ctx.fillStyle = "#f2d0a8";
    ctx.beginPath();
    ctx.arc(0, 1.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9563f";
    ctx.beginPath();
    ctx.arc(0, 0.8, 3.2, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(this.facing > 0 ? 0 : -4.4, 0.4, 4.4, 1.2);

    // 헬멧 랜턴 불빛
    ctx.fillStyle = "rgba(255,230,150,0.9)";
    ctx.beginPath();
    ctx.arc(this.facing * 2.6, 0.6, 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawDarkness(camX: number, camY: number) {
    const d = this.darkCtx;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = "source-over";
    d.clearRect(0, 0, this.vw, this.vh);
    d.fillStyle = "rgba(6,5,12,0.93)";
    d.fillRect(0, 0, this.vw, this.vh);

    d.globalCompositeOperation = "destination-out";

    // 지표면 위쪽은 햇빛 (컬럼마다 지형 높이에 맞춰 파낸다)
    const cx0 = Math.max(0, Math.floor(camX / TILE));
    const cx1 = Math.min(WORLD_W - 1, Math.ceil((camX + this.vw) / TILE));
    for (let x = cx0; x <= cx1; x++) {
      const sy = this.world.surface[x] * TILE - camY;
      if (sy < -34) continue;
      const sx = x * TILE - camX;
      if (sy > 0) {
        d.fillStyle = "rgba(255,255,255,1)";
        d.fillRect(sx, 0, TILE + 1, sy);
      }
      // 지표면 바로 아래로 일정 길이만 부드럽게 밝기를 떨어뜨린다 (세로 줄무늬 방지)
      const g = d.createLinearGradient(0, Math.max(0, sy), 0, sy + 34);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      d.fillStyle = g;
      d.fillRect(sx, Math.max(0, sy), TILE + 1, sy + 34 - Math.max(0, sy));
    }

    // 빛이끼
    for (const it of this.world.items) {
      if (it.taken || it.kind !== "moss") continue;
      const sx = it.x - camX;
      const sy = it.y - camY;
      if (sx < -40 || sx > this.vw + 40 || sy < -40 || sy > this.vh + 40) continue;
      const rg = d.createRadialGradient(sx, sy, 0, sx, sy, 34);
      rg.addColorStop(0, "rgba(255,255,255,0.95)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      d.fillStyle = rg;
      d.beginPath();
      d.arc(sx, sy, 34, 0, Math.PI * 2);
      d.fill();
    }

    // 여왕방의 은은한 빛 (목표 지점 표시)
    {
      const qx = this.world.queen.x - camX;
      const qy = this.world.queen.y - camY;
      if (qx > -80 && qx < this.vw + 80 && qy > -80 && qy < this.vh + 80) {
        const qr = 64;
        const qg = d.createRadialGradient(qx, qy - 10, 0, qx, qy - 10, qr);
        qg.addColorStop(0, "rgba(255,255,255,0.85)");
        qg.addColorStop(1, "rgba(255,255,255,0)");
        d.fillStyle = qg;
        d.beginPath();
        d.arc(qx, qy - 10, qr, 0, Math.PI * 2);
        d.fill();
      }
    }

    // 플레이어 랜턴
    const px = this.box.x + this.box.w / 2 - camX;
    const py = this.box.y + 2 - camY;
    const flicker = 1 + Math.sin(this.elapsed * 9) * 0.02 + Math.sin(this.elapsed * 23) * 0.012;
    const radius = (38 + this.lantern * 0.62) * flicker;
    const rg = d.createRadialGradient(px, py, 0, px, py, radius);
    rg.addColorStop(0, "rgba(255,255,255,1)");
    rg.addColorStop(0.45, "rgba(255,255,255,0.92)");
    rg.addColorStop(0.78, "rgba(255,255,255,0.45)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    d.fillStyle = rg;
    d.beginPath();
    d.arc(px, py, radius, 0, Math.PI * 2);
    d.fill();

    // 헬멧 라이트가 향하는 쪽으로 길게
    d.save();
    d.translate(px, py);
    d.scale(this.facing, 1);
    const cone = d.createRadialGradient(0, 0, 0, 0, 0, radius * 1.5);
    cone.addColorStop(0, "rgba(255,255,255,0.8)");
    cone.addColorStop(1, "rgba(255,255,255,0)");
    d.fillStyle = cone;
    d.beginPath();
    d.moveTo(0, -6);
    d.lineTo(radius * 1.5, -radius * 0.62);
    d.lineTo(radius * 1.5, radius * 0.62);
    d.lineTo(0, 6);
    d.closePath();
    d.fill();
    d.restore();

    d.globalCompositeOperation = "source-over";
    this.ctx.drawImage(this.dark, 0, 0);
  }
}
