"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BeeGame, BeeState, InputName, STAGES, VIEW_H, VIEW_W } from "@/lib/bee/game";

const KEY_MAP: Record<string, InputName> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "boost",
  ShiftLeft: "boost",
  ShiftRight: "boost",
  KeyJ: "boost",
};

const INITIAL: BeeState = {
  hp: 100,
  wing: 100,
  nectar: 0,
  jelly: 0,
  wax: 0,
  crew: 0,
  stage: 0,
  progress: 0,
  target: 6,
  isQueen: false,
  status: "playing",
  message: "",
  zone: "",
  elapsed: 0,
  fact: null,
  dizzy: false,
};

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-amber-200/70">{label}</span>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-amber-950/70 sm:w-24">
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function BeePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<BeeGame | null>(null);
  const [state, setState] = useState<BeeState>(INITIAL);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [frameH, setFrameH] = useState(320);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    const game = new BeeGame(canvas, { onState: setState });
    gameRef.current = game;
    game.start();

    function fit() {
      const frame = frameRef.current;
      if (!frame) return;
      const cssW = frame.clientWidth;
      if (cssW <= 0) return;
      const top = frame.getBoundingClientRect().top;
      const avail = window.innerHeight - top - 172;
      const cssH = Math.round(
        Math.max(cssW * 0.5, Math.min(Math.max(avail, 210), cssW * 1.25))
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
    const onBlur = () => gameRef.current?.clearInput();
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    gameRef.current?.setMuted(muted);
  }, [muted]);

  const press = useCallback((action: InputName, down: boolean) => {
    gameRef.current?.setInput(action, down);
    if (down) setStarted(true);
  }, []);

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
    "select-none touch-none rounded-xl border border-amber-800/60 bg-amber-950/80 text-amber-100 " +
    "active:bg-amber-500 active:text-amber-950 flex items-center justify-center font-bold shadow";

  const stage = STAGES[Math.min(state.stage, STAGES.length - 1)];
  const pct = Math.round((state.progress / Math.max(1, state.target)) * 100);

  return (
    <main className="flex min-h-screen flex-col items-center gap-2.5 bg-[#1a1206] px-3 py-4 text-amber-50">
      <header className="flex w-full max-w-3xl items-center justify-between gap-2">
        <h1 className="text-base font-bold text-amber-300 sm:text-lg">🐝 왕벌의 비행</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="rounded-full border border-amber-800/70 px-3 py-1 text-xs text-amber-200 hover:border-amber-400"
          >
            {muted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐"}
          </button>
        </div>
      </header>

      {/* 퀘스트 + 상태 */}
      <div className="w-full max-w-3xl rounded-xl border border-amber-900/60 bg-amber-950/40 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-amber-200">
              {Math.min(state.stage + 1, STAGES.length)}/{STAGES.length} · {stage.job}
              <span className="ml-1.5 text-xs font-normal text-amber-300/70">{stage.age}</span>
              <span className="ml-2 text-xs font-normal text-amber-200/50">{stage.where}</span>
            </p>
            <p className="truncate text-[11px] text-amber-100/60">{stage.task}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-amber-950/80 sm:w-36">
              <div
                className="h-full rounded-full bg-amber-400 transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-amber-200">
              {state.progress}/{state.target}
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-amber-900/50 pt-2">
          <Meter label="체력" value={state.hp} color="#f2705f" />
          <Meter label="날개" value={state.wing} color="#8fd4ff" />
          {state.nectar > 0 && <span className="text-xs text-amber-200">🍯 {state.nectar}</span>}
          {state.jelly > 0 && <span className="text-xs text-amber-100">🥛 {state.jelly}</span>}
          {state.wax > 0 && <span className="text-xs text-amber-100/80">🕯 {state.wax}</span>}
          {state.crew > 0 && <span className="text-xs text-amber-200/80">🐝 x{state.crew}</span>}
          {state.dizzy && <span className="text-xs text-lime-300">😵 방향 감각 상실</span>}
          {state.isQueen && <span className="text-xs text-fuchsia-300">👑 여왕벌</span>}
        </div>
      </div>

      {/* 게임 화면 */}
      <div
        ref={frameRef}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-amber-900/70 bg-black shadow-2xl"
        style={{ height: frameH }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" style={{ imageRendering: "pixelated" }} />

        {state.zone && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1 text-xs tracking-widest text-amber-100">
            {state.zone}
          </div>
        )}

        {state.message && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[92%] -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-center text-[11px] text-amber-100 sm:text-sm">
            {state.message}
          </div>
        )}

        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-black/85 px-5 py-4 text-center">
            <p className="text-lg font-bold text-amber-300 sm:text-xl">
              왕벌의 비행 <span className="text-amber-200/60">— 마누카 계곡</span>
            </p>
            <p className="max-w-md text-[11px] leading-relaxed text-amber-100/80 sm:text-sm">
              뉴질랜드 마누카 계곡의 벌통 한 채. 너는 방금 방에서 나온 일벌이다. 실제 꿀벌처럼{" "}
              <b className="text-amber-200">나이를 먹을 때마다 맡는 일이 바뀐다</b> — 청소벌,
              육아벌, 건축벌, 경비벌, 채집벌.
              <br />
              육아벌일 때 <b className="text-amber-200">로열젤리를 먹여 키운 그 애벌레</b>가
              마지막에 여왕이 되어 나온다. 그리고 그 여왕이 네가 된다.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="shrink-0 rounded-full bg-amber-400 px-6 py-2 font-bold text-amber-950 hover:bg-amber-300"
            >
              날아오르기
            </button>
            <p className="text-[10px] text-amber-200/50 sm:text-[11px]">
방향키로 비행 · Space 부스터 · 몸으로 부딪히면 일이 된다 · 약 5분
            </p>
          </div>
        )}

        {state.fact && (
          <button
            onClick={() => gameRef.current?.dismissFact()}
            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 bg-black/85 px-6 text-center"
          >
            <span className="text-[10px] tracking-[0.2em] text-amber-400/70">알고 계셨나요</span>
            <span className="text-base font-bold text-amber-200 sm:text-lg">
              {state.fact.title}
            </span>
            <span className="max-w-md text-[11px] leading-relaxed text-amber-100/80 sm:text-sm">
              {state.fact.body}
            </span>
            <span className="mt-1 text-[10px] text-amber-200/40">아무 곳이나 눌러 계속</span>
          </button>
        )}

        {state.status === "ending" && !state.fact && (
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-5 pb-5 pt-8 text-center">
            <p className="text-xl font-bold text-amber-200 drop-shadow sm:text-2xl">
              👑 마누카 계곡의 새 여왕
            </p>
            <p className="max-w-md text-[11px] leading-relaxed text-amber-100/90 sm:text-sm">
              혼인비행을 마친 여왕은 벌통으로 돌아가 평생 알을 낳는다. 언젠가 무리의 절반을
              데리고 분봉해, 다음 계곡에 새 왕국을 열 것이다.
              <br />
              <span className="text-amber-300/80">다음 왕국 — 캘리포니아 아몬드 농장 (준비 중)</span>
              <br />
              <span className="text-amber-200/60">걸린 시간 {Math.floor(state.elapsed)}초</span>
            </p>
            <button
              onClick={restart}
              className="rounded-full bg-amber-400 px-6 py-2 font-bold text-amber-950 hover:bg-amber-300"
            >
              처음부터 다시 (R)
            </button>
          </div>
        )}
      </div>

      {/* 터치 조작 */}
      <div className="flex w-full max-w-3xl items-end justify-between gap-4 sm:max-w-lg">
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
        <button {...touchProps("boost")} className={`${btn} h-14 w-20 text-xs`} aria-label="부스터">
          부스터
        </button>
      </div>

      <ol className="hidden w-full max-w-3xl flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-amber-200/50 sm:flex">
        {STAGES.map((q, i) => (
          <li
            key={q.job}
            className={
              i < state.stage
                ? "text-amber-400/80 line-through"
                : i === state.stage
                  ? "font-bold text-amber-200"
                  : ""
            }
          >
            {i < state.stage ? "✓ " : `${i + 1}. `}
            {q.job}
          </li>
        ))}
      </ol>
    </main>
  );
}
