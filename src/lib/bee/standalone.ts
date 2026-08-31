// 단일 HTML 로 배포하기 위한 바닐라 진입점 (Next.js 없이도 그대로 돌아간다).
import { BeeGame, BeeState, InputName, STAGES, VIEW_H, VIEW_W } from "./game";

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
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

export function mount(root: HTMLElement) {
  root.innerHTML = `
    <header class="bar">
      <h1>🐝 왕벌의 비행 <span>— 마누카 계곡</span></h1>
      <button id="mute" class="ghost">🔊 소리</button>
    </header>

    <section class="panel">
      <div class="row">
        <div class="stage">
          <p class="title"><b id="stageName">청소벌</b> <i id="stageAge">1~2일령</i>
            <em id="stageWhere">육아권</em></p>
          <p class="task" id="stageTask">갓 나온 방을 청소하자</p>
        </div>
        <div class="prog">
          <div class="track"><div id="progBar"></div></div>
          <span id="progText">0/6</span>
        </div>
      </div>
      <div class="row meters">
        <span class="m">체력<i class="track sm"><b id="hpBar" style="background:#f2705f"></b></i></span>
        <span class="m">날개<i class="track sm"><b id="wingBar" style="background:#8fd4ff"></b></i></span>
        <span id="carry" class="carry"></span>
      </div>
    </section>

    <div class="frame" id="frame">
      <canvas id="cv"></canvas>
      <div id="zone" class="zone"></div>
      <div id="msg" class="msg"></div>

      <div id="intro" class="overlay">
        <p class="big">왕벌의 비행 <span>— 마누카 계곡</span></p>
        <p class="body">
          뉴질랜드 마누카 계곡의 벌통 한 채. 너는 방금 방에서 나온 일벌이다.
          실제 꿀벌처럼 <b>나이를 먹을 때마다 맡는 일이 바뀐다</b> —
          청소벌, 육아벌, 건축벌, 경비벌, 채집벌.<br>
          육아벌일 때 <b>로열젤리를 먹여 키운 그 애벌레</b>가 마지막에 여왕이 되어 나온다.
          그리고 그 여왕이 네가 된다.
        </p>
        <button id="startBtn" class="cta">날아오르기</button>
        <p class="hint">방향키로 비행 · Space 부스터 · 몸으로 부딪히면 일이 된다 · 약 5분</p>
      </div>

      <div id="fact" class="overlay hidden">
        <span class="kicker">알고 계셨나요</span>
        <p class="big sm" id="factTitle"></p>
        <p class="body" id="factBody"></p>
        <p class="hint">아무 곳이나 눌러 계속</p>
      </div>

      <div id="ending" class="overlay bottom hidden">
        <p class="big">👑 마누카 계곡의 새 여왕</p>
        <p class="body">
          혼인비행을 마친 여왕은 벌통으로 돌아가 평생 알을 낳는다.
          언젠가 무리의 절반을 데리고 분봉해, 다음 계곡에 새 왕국을 열 것이다.<br>
          <b class="next">다음 왕국 — 캘리포니아 아몬드 농장 (준비 중)</b><br>
          <span id="endTime"></span>
        </p>
        <button id="againBtn" class="cta">처음부터 다시</button>
      </div>
    </div>

    <div class="pad">
      <div class="dpad">
        <button data-k="up" class="k up">↑</button>
        <button data-k="left" class="k left">←</button>
        <button data-k="down" class="k down">↓</button>
        <button data-k="right" class="k right">→</button>
      </div>
      <button data-k="boost" class="k boost">부스터</button>
    </div>

    <ol class="steps" id="steps"></ol>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>("#cv")!;
  const frame = root.querySelector<HTMLDivElement>("#frame")!;
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  const steps = root.querySelector<HTMLOListElement>("#steps")!;
  STAGES.forEach((s) => steps.appendChild(el("li", "", s.job)));

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(id)!;
  const progBar = $<HTMLDivElement>("#progBar");
  const hpBar = $<HTMLElement>("#hpBar");
  const wingBar = $<HTMLElement>("#wingBar");

  let started = false;
  let muted = false;

  const render = (s: BeeState) => {
    const st = STAGES[Math.min(s.stage, STAGES.length - 1)];
    $("#stageName").textContent = st.job;
    $("#stageAge").textContent = st.age;
    $("#stageWhere").textContent = st.where;
    $("#stageTask").textContent = st.task;
    progBar.style.width = `${Math.round((s.progress / Math.max(1, s.target)) * 100)}%`;
    $("#progText").textContent = `${s.progress}/${s.target}`;
    hpBar.style.width = `${s.hp}%`;
    wingBar.style.width = `${s.wing}%`;

    const carry: string[] = [];
    if (s.nectar) carry.push(`🍯 ${s.nectar}`);
    if (s.jelly) carry.push(`🥛 ${s.jelly}`);
    if (s.wax) carry.push(`🕯 ${s.wax}`);
    if (s.crew) carry.push(`🐝 x${s.crew}`);
    if (s.dizzy) carry.push(`😵 방향 감각 상실`);
    if (s.isQueen) carry.push(`👑 여왕벌`);
    $("#carry").textContent = carry.join("  ");

    $("#zone").textContent = s.zone;
    $("#zone").classList.toggle("show", !!s.zone);
    $("#msg").textContent = s.message;
    $("#msg").classList.toggle("show", !!s.message);

    const factBox = $("#fact");
    if (s.fact) {
      $("#factTitle").textContent = s.fact.title;
      $("#factBody").textContent = s.fact.body;
      factBox.classList.remove("hidden");
    } else factBox.classList.add("hidden");

    $("#ending").classList.toggle("hidden", !(s.status === "ending" && !s.fact));
    $("#endTime").textContent = `걸린 시간 ${Math.floor(s.elapsed)}초`;

    Array.from(steps.children).forEach((li, i) => {
      li.className = i < s.stage ? "done" : i === s.stage ? "now" : "";
    });
  };

  const game = new BeeGame(canvas, { onState: render });
  game.start();

  function fit() {
    const cssW = frame.clientWidth;
    if (cssW <= 0) return;
    const top = frame.getBoundingClientRect().top;
    const avail = window.innerHeight - top - 168;
    const cssH = Math.round(Math.max(cssW * 0.5, Math.min(Math.max(avail, 210), cssW * 1.25)));
    frame.style.height = `${cssH}px`;
    game.resize(VIEW_W, Math.max(260, Math.min(700, Math.round((VIEW_W * cssH) / cssW))));
  }
  fit();
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);

  const begin = () => {
    started = true;
    $("#intro").classList.add("hidden");
  };

  $("#startBtn").addEventListener("click", begin);
  $("#againBtn").addEventListener("click", () => {
    game.clearInput();
    game.reset();
    begin();
  });
  $("#fact").addEventListener("click", () => game.dismissFact());
  $("#mute").addEventListener("click", () => {
    muted = !muted;
    game.setMuted(muted);
    $("#mute").textContent = muted ? "🔇 소리" : "🔊 소리";
  });

  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", () => game.clearInput());
  function onKey(e: KeyboardEvent) {
    if (e.code === "KeyR" && e.type === "keydown") {
      game.clearInput();
      game.reset();
      begin();
      return;
    }
    const a = KEY_MAP[e.code];
    if (!a) return;
    e.preventDefault();
    game.setInput(a, e.type === "keydown");
    if (e.type === "keydown" && !started) begin();
  }

  root.querySelectorAll<HTMLButtonElement>("[data-k]").forEach((b) => {
    const a = b.dataset.k as InputName;
    const set = (v: boolean) => {
      game.setInput(a, v);
      if (v && !started) begin();
    };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      set(true);
    });
    b.addEventListener("pointerup", (e) => {
      e.preventDefault();
      set(false);
    });
    b.addEventListener("pointercancel", () => set(false));
    b.addEventListener("pointerleave", () => set(false));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
}

const rootEl = document.getElementById("app");
if (rootEl) mount(rootEl);
