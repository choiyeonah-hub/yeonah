"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BASE_SPEED,
  BOOST_SPEED,
  ENDING_FACT,
  Entity,
  FAMILY_QUESTION,
  INVULN_MS,
  MAX_HP,
  PLAYER_R,
  PLAYER_X,
  Record,
  STAGES,
  TOTAL_DISTANCE,
  VIEW_H,
  VIEW_W,
  clamp,
  formatSeconds,
  loadRecord,
  progressAt,
  saveRecord,
  spawnAt,
  stageIndexAt,
  tunnelCenter,
  tunnelHalf,
} from "@/lib/spermGame";

type Phase = "ready" | "playing" | "won" | "lost";

type Swimmer = { x: number; y: number; speed: number; scale: number; phase: number };

type GameState = {
  distance: number;
  spawnX: number;
  entities: Entity[];
  swimmers: Swimmer[];
  y: number;
  targetY: number;
  vy: number;
  hp: number;
  energy: number;
  invulnUntil: number;
  boostUntil: number;
  elapsed: number;
  time: number;
  shake: number;
  stage: number;
  stageBannerUntil: number;
};

function createState(): GameState {
  const swimmers: Swimmer[] = [];
  for (let i = 0; i < 14; i += 1) {
    swimmers.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      speed: 0.4 + Math.random() * 1.2,
      scale: 0.35 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return {
    distance: 0,
    spawnX: 640,
    entities: [],
    swimmers,
    y: VIEW_H / 2,
    targetY: VIEW_H / 2,
    vy: 0,
    hp: MAX_HP,
    energy: 0,
    invulnUntil: 0,
    boostUntil: 0,
    elapsed: 0,
    time: 0,
    shake: 0,
    stage: 0,
    stageBannerUntil: 2200,
  };
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createState());
  const phaseRef = useRef<Phase>("ready");
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>("ready");
  const [result, setResult] = useState<{ seconds: number; energy: number; hp: number } | null>(null);
  const [best, setBest] = useState<Record | null>(null);

  useEffect(() => {
    setBest(loadRecord());
  }, []);

  const setPhaseBoth = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const start = useCallback(() => {
    stateRef.current = createState();
    lastTsRef.current = 0;
    setResult(null);
    setPhaseBoth("playing");
  }, [setPhaseBoth]);

  const finish = useCallback(
    (won: boolean) => {
      const s = stateRef.current;
      const summary = { seconds: s.elapsed / 1000, energy: s.energy, hp: s.hp };
      setResult(summary);
      if (won) setBest(saveRecord(summary));
      setPhaseBoth(won ? "won" : "lost");
    },
    [setPhaseBoth],
  );

  /** 포인터(마우스·손가락)가 가리키는 높이를 목표 위치로 삼는다. */
  const pointTo = useCallback((clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height === 0) return;
    stateRef.current.targetY = clamp(((clientY - rect.top) / rect.height) * VIEW_H, 0, VIEW_H);
  }, []);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (["ArrowUp", "ArrowDown", " ", "w", "s"].includes(e.key)) e.preventDefault();
      keysRef.current.add(e.key);
      if (e.key === " " && phaseRef.current !== "playing") start();
    }
    function up(e: KeyboardEvent) {
      keysRef.current.delete(e.key);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [start]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;

    function frame(ts: number) {
      const state = stateRef.current;
      if (!lastTsRef.current) lastTsRef.current = ts;
      const rawDelta = ts - lastTsRef.current;
      lastTsRef.current = ts;
      // 탭이 백그라운드에 있다 돌아와도 한 번에 뛰지 않도록 프레임 간격을 묶는다.
      const deltaMs = clamp(rawDelta, 0, 50);
      const dt = deltaMs / 16.6667;

      if (phaseRef.current === "playing") update(state, dt, deltaMs);
      draw(ctx as CanvasRenderingContext2D, state, dpr, phaseRef.current);

      if (phaseRef.current === "playing") {
        if (state.hp <= 0) finish(false);
        else if (state.distance >= TOTAL_DISTANCE) finish(true);
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    function update(state: GameState, dt: number, deltaMs: number) {
      state.time += deltaMs;
      state.elapsed += deltaMs;

      // 키보드 조작은 포인터가 없을 때를 위한 대체 수단이다.
      const keys = keysRef.current;
      if (keys.has("ArrowUp") || keys.has("w")) state.targetY -= 7 * dt;
      if (keys.has("ArrowDown") || keys.has("s")) state.targetY += 7 * dt;
      state.targetY = clamp(state.targetY, 0, VIEW_H);

      const follow = 0.16;
      const prevY = state.y;
      state.y += (state.targetY - state.y) * follow * dt;
      state.vy = (state.y - prevY) / Math.max(dt, 0.001);

      const playerWorldX = state.distance + PLAYER_X;
      const center = tunnelCenter(playerWorldX);
      const half = tunnelHalf(playerWorldX);
      state.y = clamp(state.y, center - half + PLAYER_R, center + half - PLAYER_R);

      let speed = state.time < state.boostUntil ? BOOST_SPEED : BASE_SPEED;
      for (const e of state.entities) {
        if (e.kind === "current" && playerWorldX > e.x && playerWorldX < e.x + e.w) {
          speed *= 0.42;
        }
      }
      state.distance += speed * dt;

      // 화면 앞쪽으로 계속 새 장애물을 채운다.
      while (state.spawnX < state.distance + VIEW_W + 260) {
        const { entities, gap } = spawnAt(state.spawnX, Math.random);
        state.entities.push(...entities);
        state.spawnX += gap;
      }
      state.entities = state.entities.filter((e) => {
        const right = e.kind === "current" ? e.x + e.w : e.x + 60;
        return right > state.distance - 80;
      });

      const invulnerable = state.time < state.invulnUntil;
      for (const e of state.entities) {
        if (e.kind === "cell") {
          // 백혈구는 정자를 향해 천천히 다가온다.
          e.y += clamp(state.y - e.y, -1, 1) * 0.55 * dt;
          e.x -= 0.35 * dt;
        }
        if (e.kind === "acid") {
          e.y += Math.sin(state.time / 420 + e.seed) * 0.7 * dt;
        }

        const dx = e.kind === "current" ? 0 : e.x - playerWorldX;

        if (e.kind === "energy") {
          if (!e.taken && Math.abs(dx) < 22 && Math.abs(e.y - state.y) < 22) {
            e.taken = true;
            state.energy += 1;
            state.boostUntil = state.time + 1600;
          }
          continue;
        }

        if (invulnerable) continue;

        if (e.kind === "acid" || e.kind === "cell") {
          const dy = e.y - state.y;
          if (dx * dx + dy * dy < (e.r + PLAYER_R) * (e.r + PLAYER_R)) hit(state);
        } else if (e.kind === "wall") {
          if (Math.abs(dx) < 15 + PLAYER_R) {
            const top = e.gapY - e.gapH / 2;
            const bottom = e.gapY + e.gapH / 2;
            if (state.y - PLAYER_R < top || state.y + PLAYER_R > bottom) hit(state);
          }
        }
      }

      const stage = stageIndexAt(progressAt(state.distance));
      if (stage !== state.stage) {
        state.stage = stage;
        state.stageBannerUntil = state.time + 2600;
      }
      if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 0.8);

      for (const s of state.swimmers) {
        s.x -= (speed * 0.35 + s.speed) * dt;
        s.y += Math.sin(state.time / 500 + s.phase) * 0.3 * dt;
        if (s.x < -40) {
          s.x = VIEW_W + 40 + Math.random() * 120;
          s.y = Math.random() * VIEW_H;
        }
      }
    }

    function hit(state: GameState) {
      state.hp -= 1;
      state.invulnUntil = state.time + INVULN_MS;
      state.boostUntil = 0;
      state.shake = 8;
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [finish]);

  const progressPct = Math.round(progressAt(stateRef.current.distance) * 100);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-havruta-800">🏊 정자의 여행</h1>
          <p className="text-xs text-havruta-500">난자를 찾아가는 20cm의 모험</p>
        </div>
        <Link href="/chat" className="text-xs text-havruta-600 underline underline-offset-2">
          하브루타 톡으로
        </Link>
      </header>

      <div className="relative w-full overflow-hidden rounded-2xl bg-[#1a0d1c] shadow-lg">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none select-none"
          style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
          onPointerMove={(e) => pointTo(e.clientY)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointTo(e.clientY);
            if (phaseRef.current !== "playing") start();
          }}
        />

        {phase !== "playing" && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/55 p-5 text-center"
            // 카드 바깥(어두운 배경)을 누르면 바로 시작 — 안내대로 "화면 터치"가 통하게.
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) start();
            }}
          >
            <div className="max-h-full w-full max-w-sm overflow-y-auto rounded-2xl bg-white/95 p-5 shadow-xl">
              {phase === "ready" && (
                <>
                  <div className="text-3xl">🥚</div>
                  <h2 className="mt-1 text-lg font-bold text-havruta-800">난자를 찾아 출발!</h2>
                  <p className="mt-2 text-sm leading-relaxed text-havruta-600">
                    화면을 위아래로 쓸어(또는 마우스를 움직여) 헤엄치세요. 방향키 ↑↓ 로도 움직일 수
                    있어요. 산성 방울·점액 벽·백혈구를 피하고 에너지를 모아 난자까지 가면 성공!
                  </p>
                  <p className="mt-2 text-xs text-havruta-500">체력은 하트 3개, 네 구간을 지나갑니다.</p>
                </>
              )}

              {phase === "won" && result && (
                <>
                  <div className="text-3xl">✨</div>
                  <h2 className="mt-1 text-lg font-bold text-havruta-800">난자 도착, 수정 성공!</h2>
                  <p className="mt-2 text-sm text-havruta-700">
                    {formatSeconds(result.seconds)} · 에너지 {result.energy}개 · 남은 체력{" "}
                    {"❤️".repeat(result.hp) || "0"}
                  </p>
                  <p className="mt-3 rounded-xl bg-havruta-50 p-3 text-xs leading-relaxed text-havruta-700">
                    {ENDING_FACT}
                  </p>
                  <p className="mt-2 text-xs font-medium text-havruta-600">{FAMILY_QUESTION}</p>
                </>
              )}

              {phase === "lost" && result && (
                <>
                  <div className="text-3xl">💫</div>
                  <h2 className="mt-1 text-lg font-bold text-havruta-800">여기까지…</h2>
                  <p className="mt-2 text-sm text-havruta-700">
                    {progressPct}% 지점 · 에너지 {result.energy}개
                  </p>
                  <p className="mt-3 rounded-xl bg-havruta-50 p-3 text-xs leading-relaxed text-havruta-700">
                    실제로도 출발한 정자 대부분은 난자를 만나지 못해요. 다시 도전!
                  </p>
                </>
              )}

              {best && phase !== "ready" && (
                <p className="mt-2 text-[11px] text-havruta-500">
                  최고 기록: 에너지 {best.energy}개 · {formatSeconds(best.seconds)}
                </p>
              )}

              <button
                onClick={start}
                className="mt-4 w-full rounded-lg bg-havruta-600 py-2.5 text-sm font-semibold text-white transition hover:bg-havruta-700"
              >
                {phase === "ready" ? "출발하기" : "다시 도전"}
              </button>
              <p className="mt-2 text-[11px] text-havruta-400">스페이스바 또는 화면 터치로도 시작해요.</p>
            </div>
          </div>
        )}
      </div>

      <section className="mt-4 rounded-2xl bg-white/70 p-4 text-xs leading-relaxed text-havruta-700 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-havruta-800">구간 안내</h2>
        <ul className="space-y-1">
          {STAGES.map((s) => (
            <li key={s.name}>
              <span className="font-medium text-havruta-800">{s.name}</span> · {s.hint}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/* ---------------------------------- 그리기 --------------------------------- */

function draw(ctx: CanvasRenderingContext2D, s: GameState, dpr: number, phase: Phase) {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  const stage = STAGES[s.stage];
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, stage.top);
  bg.addColorStop(1, stage.bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (s.shake > 0) {
    ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
  }

  drawTunnel(ctx, s, stage.tint);
  drawSwimmers(ctx, s);
  drawEntities(ctx, s);
  drawGoal(ctx, s);
  if (phase === "playing" || phase === "ready") drawPlayer(ctx, s);
  drawHud(ctx, s, phase);
  ctx.restore();
}

function drawTunnel(ctx: CanvasRenderingContext2D, s: GameState, tint: string) {
  const step = 24;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= VIEW_W + step; x += step) {
    const wx = s.distance + x;
    ctx.lineTo(x, tunnelCenter(wx) - tunnelHalf(wx));
  }
  ctx.lineTo(VIEW_W, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W + step; x += step) {
    const wx = s.distance + x;
    ctx.lineTo(x, tunnelCenter(wx) + tunnelHalf(wx));
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let x = 0; x <= VIEW_W + step; x += step) {
      const wx = s.distance + x;
      const y = tunnelCenter(wx) + side * tunnelHalf(wx);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSwimmers(ctx: CanvasRenderingContext2D, s: GameState) {
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffffff";
  for (const sw of s.swimmers) {
    ctx.save();
    ctx.translate(sw.x, sw.y);
    ctx.scale(sw.scale, sw.scale);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    for (let i = 1; i <= 5; i += 1) {
      const t = i / 5;
      ctx.lineTo(-10 - t * 26, Math.sin(s.time / 90 + sw.phase + t * 5) * 8 * t);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawEntities(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const e of s.entities) {
    const x = e.x - s.distance;
    if (x < -220 || x > VIEW_W + 220) continue;

    if (e.kind === "acid") {
      const glow = ctx.createRadialGradient(x, e.y, 2, x, e.y, e.r + 6);
      glow.addColorStop(0, "rgba(180,255,140,0.95)");
      glow.addColorStop(1, "rgba(90,190,60,0.15)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, e.y, e.r + 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === "cell") {
      ctx.fillStyle = "rgba(240,240,255,0.92)";
      ctx.beginPath();
      const lobes = 9;
      for (let i = 0; i <= lobes; i += 1) {
        const a = (i / lobes) * Math.PI * 2;
        const r = e.r + Math.sin(a * 3 + s.time / 300 + e.seed) * 3.5;
        const px = x + Math.cos(a) * r;
        const py = e.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(120,110,190,0.65)";
      ctx.beginPath();
      ctx.arc(x - 4, e.y - 3, e.r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === "wall") {
      const wx = e.x;
      const top = tunnelCenter(wx) - tunnelHalf(wx);
      const bottom = tunnelCenter(wx) + tunnelHalf(wx);
      ctx.fillStyle = "rgba(255,236,196,0.82)";
      roundRect(ctx, x - 14, top, 28, e.gapY - e.gapH / 2 - top, 12);
      roundRect(ctx, x - 14, e.gapY + e.gapH / 2, 28, bottom - (e.gapY + e.gapH / 2), 12);
    } else if (e.kind === "current") {
      ctx.fillStyle = "rgba(120,220,255,0.14)";
      ctx.fillRect(x, 0, e.w, VIEW_H);
      ctx.strokeStyle = "rgba(160,235,255,0.6)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        const ay = 60 + i * 75;
        const offset = ((s.time / 8 + i * 40) % e.w) - e.w;
        const ax = x + e.w + offset;
        ctx.beginPath();
        ctx.moveTo(ax + 18, ay - 9);
        ctx.lineTo(ax, ay);
        ctx.lineTo(ax + 18, ay + 9);
        ctx.stroke();
      }
    } else if (!e.taken) {
      const pulse = 1 + Math.sin(s.time / 220 + e.x) * 0.12;
      const glow = ctx.createRadialGradient(x, e.y, 1, x, e.y, 16 * pulse);
      glow.addColorStop(0, "#fff6c9");
      glow.addColorStop(1, "rgba(255,205,80,0.05)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, e.y, 16 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd75e";
      ctx.beginPath();
      ctx.arc(x, e.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 결승선인 난자. 마지막 한 화면에 들어올 때부터 보이기 시작한다. */
function drawGoal(ctx: CanvasRenderingContext2D, s: GameState) {
  const x = TOTAL_DISTANCE + PLAYER_X - s.distance;
  if (x > VIEW_W + 160) return;
  const y = tunnelCenter(TOTAL_DISTANCE + PLAYER_X);
  const r = 62;
  const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.6);
  glow.addColorStop(0, "rgba(255,236,190,0.95)");
  glow.addColorStop(1, "rgba(255,190,120,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffe6a8";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(x, y, r + 10, s.time / 1400, s.time / 1400 + Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#f0b45c";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, s: GameState) {
  const blinking = s.time < s.invulnUntil && Math.floor(s.time / 110) % 2 === 0;
  if (blinking) return;

  const boosted = s.time < s.boostUntil;
  ctx.save();
  ctx.translate(PLAYER_X, s.y);
  ctx.rotate(clamp(s.vy * 0.035, -0.5, 0.5));

  ctx.strokeStyle = boosted ? "#ffe9a8" : "#ffffff";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-PLAYER_R + 2, 0);
  for (let i = 1; i <= 8; i += 1) {
    const t = i / 8;
    ctx.lineTo(-PLAYER_R - t * 34, Math.sin(s.time / 45 + t * 6.2) * 11 * t);
  }
  ctx.stroke();

  const head = ctx.createRadialGradient(-3, -4, 2, 0, 0, PLAYER_R + 4);
  head.addColorStop(0, "#ffffff");
  head.addColorStop(1, boosted ? "#ffd98a" : "#cfe4ff");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(0, 0, PLAYER_R + 3, PLAYER_R - 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState, phase: Phase) {
  const p = progressAt(s.distance);
  const barW = VIEW_W - 190;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, 16, 14, barW, 14, 7);
  ctx.fillStyle = "#ffd75e";
  roundRect(ctx, 16, 14, Math.max(6, barW * p), 14, 7);
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("🥚", 16 + barW + 4, 27);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText(`${Math.round(p * 100)}%`, 16, 48);

  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("❤️".repeat(Math.max(0, s.hp)), VIEW_W - 140, 28);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText(`⚡ ${s.energy}`, VIEW_W - 140, 50);

  const stage = STAGES[s.stage];
  if (phase === "playing" && s.time < s.stageBannerUntil) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(ctx, VIEW_W / 2 - 230, VIEW_H - 78, 460, 56, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText(`${stage.name} — ${stage.hint}`, VIEW_W / 2, VIEW_H - 55);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(truncate(stage.fact, 46), VIEW_W / 2, VIEW_H - 34);
    ctx.textAlign = "left";
  }
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0 || w <= 0) return;
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}
