"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AntGame, GameState, InputName, VIEW_H, VIEW_W } from "@/lib/ant/game";

const KEY_MAP: Record<string, InputName> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "jump",
  KeyZ: "jump",
  KeyJ: "dig",
  KeyK: "dig",
  ShiftLeft: "dig",
  ShiftRight: "dig",
};

const INITIAL: GameState = {
  hp: 100,
  maxHp: 100,
  stamina: 100,
  lantern: 100,
  crumbs: 0,
  crumbGoal: 12,
  depthCm: 0,
  status: "playing",
  message: "",
  elapsed: 0,
  seed: 0,
};

function depthLabel(cm: number) {
  if (cm < 100) return `${cm}cm`;
  return `${(cm / 100).toFixed(1)}m`;
}

function Meter({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[11px] text-stone-400">{label}</span>
      <div className="h-2.5 w-24 overflow-hidden rounded-full bg-stone-800 sm:w-32">
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function AntPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<AntGame | null>(null);
  const [frameH, setFrameH] = useState(300);
  const [state, setState] = useState<GameState>(INITIAL);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    const game = new AntGame(canvas, { onState: setState });
    gameRef.current = game;
    game.start();

    // 화면 비율에 맞춰 보이는 범위를 조절한다 (세로 화면에서는 더 깊게 보인다).
    function fit() {
      const frame = frameRef.current;
      if (!frame) return;
      const cssW = frame.clientWidth;
      if (cssW <= 0) return;
      const top = frame.getBoundingClientRect().top;
      const avail = window.innerHeight - top - 176;
      const cssH = Math.round(
        Math.max(cssW * 0.5, Math.min(Math.max(avail, 200), cssW * 1.3))
      );
      setFrameH(cssH);
      const innerH = Math.max(260, Math.min(700, Math.round((VIEW_W * cssH) / cssW)));
      game.resize(VIEW_W, innerH);
    }

    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
      game.stop();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "KeyR" && e.type === "keydown") {
        gameRef.current?.reset();
        setStarted(true);
        return;
      }
      const action = KEY_MAP[e.code];
      if (!action) return;
      e.preventDefault();
      gameRef.current?.setInput(action, e.type === "keydown");
      if (e.type === "keydown") setStarted(true);
    }
    function onBlur() {
      gameRef.current?.clearInput();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const press = useCallback((action: InputName, down: boolean) => {
    gameRef.current?.setInput(action, down);
    if (down) setStarted(true);
  }, []);

  useEffect(() => {
    gameRef.current?.setMuted(muted);
  }, [muted]);

  const restart = useCallback(() => {
    gameRef.current?.clearInput();
    gameRef.current?.reset();
    setStarted(true);
  }, []);

  const touchProps = (action: InputName) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      press(action, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      press(action, false);
    },
    onPointerCancel: () => press(action, false),
    onPointerLeave: () => press(action, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const btn =
    "select-none touch-none rounded-xl border border-stone-700 bg-stone-800/90 text-stone-100 " +
    "active:bg-amber-600 active:border-amber-400 flex items-center justify-center font-bold shadow";

  return (
    <main className="flex min-h-screen flex-col items-center gap-3 bg-stone-950 px-3 py-4 text-stone-100">
      <header className="flex w-full max-w-3xl items-center justify-between">
        <h1 className="text-lg font-bold text-amber-300">🐜 개미집 탐험대</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMuted((m) => !m)}
            className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300 hover:border-amber-400 hover:text-amber-200"
            aria-label={muted ? "소리 켜기" : "소리 끄기"}
          >
            {muted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐"}
          </button>
          <Link href="/" className="text-xs text-stone-500 underline hover:text-stone-300">
            하브루타 톡으로
          </Link>
        </div>
      </header>

      {/* HUD */}
      <div className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Meter label="체력" value={state.hp} max={state.maxHp} color="#f2705f" />
          <Meter label="기운" value={state.stamina} max={100} color="#7fd48b" />
          <Meter label="랜턴" value={state.lantern} max={100} color="#ffd75e" />
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-amber-200">
            🍞 {state.crumbs}/{state.crumbGoal}
          </span>
          <span className="text-sky-200">⛏ {depthLabel(state.depthCm)}</span>
        </div>
      </div>

      {/* 게임 화면 */}
      <div
        ref={frameRef}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-stone-800 bg-black shadow-2xl"
        style={{ height: frameH }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />

        {state.message && state.status === "playing" && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-center text-xs text-amber-100 sm:text-sm">
            {state.message}
          </div>
        )}

        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-black/85 px-5 py-4 text-center">
            <p className="text-lg font-bold text-amber-300 sm:text-xl">개미집 탐험대</p>
            <p className="max-w-md text-[11px] leading-relaxed text-stone-300 sm:text-sm">
              당신은 손톱만큼 작아졌다. 땅속 개미집으로 내려가 먹이 부스러기{" "}
              <b className="text-amber-200">{state.crumbGoal}개</b>를 모아 가장 깊은 곳의{" "}
              <b className="text-fuchsia-300">여왕개미</b>에게 바치자.
              <br />
              흙은 파낼 수 있지만 <b className="text-stone-200">돌</b>은 못 판다. 붉은{" "}
              <b className="text-rose-300">병정개미</b>는 쫓아오지만 자기 방에서 멀어지면
              포기한다. <b className="text-emerald-300">빛이끼</b>로 랜턴을,{" "}
              <b className="text-sky-300">이슬</b>로 체력을 채우자.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="shrink-0 rounded-full bg-amber-500 px-6 py-2 font-bold text-stone-900 hover:bg-amber-400"
            >
              탐험 시작
            </button>
            <p className="text-[10px] text-stone-500 sm:text-[11px]">
              이동 ←→ / 점프 Space / 벽타기 ↑↓ / 파기 J
            </p>
          </div>
        )}

        {state.status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-black/85 px-5 py-4 text-center">
            <p
              className={`text-2xl font-bold ${
                state.status === "won" ? "text-amber-300" : "text-rose-400"
              }`}
            >
              {state.status === "won" ? "🏆 여왕개미에게 도착!" : "💀 탐험 실패"}
            </p>
            <p className="text-sm text-stone-300">
              부스러기 {state.crumbs}개 · 최고 깊이 {depthLabel(state.depthCm)} · 시간{" "}
              {Math.floor(state.elapsed)}초
            </p>
            <button
              onClick={restart}
              className="rounded-full bg-amber-500 px-6 py-2 font-bold text-stone-900 hover:bg-amber-400"
            >
              새 개미집 탐험 (R)
            </button>
          </div>
        )}
      </div>

      {/* 터치 조작 */}
      <div className="flex w-full max-w-3xl items-end justify-between gap-4 pt-1 sm:max-w-lg">
        <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
          <button {...touchProps("up")} className={`${btn} col-start-2 h-12 w-12`} aria-label="위">
            ↑
          </button>
          <button {...touchProps("left")} className={`${btn} col-start-1 row-start-2 h-12 w-12`} aria-label="왼쪽">
            ←
          </button>
          <button {...touchProps("down")} className={`${btn} col-start-2 row-start-2 h-12 w-12`} aria-label="아래">
            ↓
          </button>
          <button {...touchProps("right")} className={`${btn} col-start-3 row-start-2 h-12 w-12`} aria-label="오른쪽">
            →
          </button>
        </div>
        <div className="flex gap-2">
          <button {...touchProps("dig")} className={`${btn} h-14 w-14 text-xs`}>
            파기
          </button>
          <button {...touchProps("jump")} className={`${btn} h-14 w-14 text-xs`}>
            점프
          </button>
        </div>
      </div>

      <p className="hidden max-w-3xl text-center text-[11px] leading-relaxed text-stone-500 sm:block">
        키보드: 이동 ←→(A/D) · 점프 Space · 벽 타고 오르내리기 ↑↓(벽에 붙은 채) · 파기 J(방향키와
        함께 누르면 위/아래로) · 다시 시작 R
      </p>
    </main>
  );
}
