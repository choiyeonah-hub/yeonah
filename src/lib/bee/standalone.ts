// 화면 조립 — 단일 HTML 과 Next 페이지가 이 함수 하나를 같이 쓴다.
import { BeeGame, BeeState, InputName, STAGES, VIEW_H, VIEW_W } from "./game";
import { REGIONS, Region } from "./regions";
import { STYLES } from "./styles";

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

const SAVE_KEY = "honey-kingdoms:unlocked";
const LOOK_KEY = "honey-kingdoms:pixel";

function loadUnlocked(): string[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return list.length ? list : [REGIONS[0].id];
  } catch {
    return [REGIONS[0].id];
  }
}

function saveUnlocked(ids: string[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(ids));
  } catch {
    // 저장할 수 없는 브라우저도 있다. 게임은 그대로 돌아간다.
  }
}

function ensureHead() {
  if (!document.getElementById("bee-fonts")) {
    const link = document.createElement("link");
    link.id = "bee-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }
  if (!document.getElementById("bee-styles")) {
    const style = document.createElement("style");
    style.id = "bee-styles";
    style.textContent = STYLES;
    document.head.appendChild(style);
  }
}

export function mount(root: HTMLElement): () => void {
  ensureHead();
  let unlocked = loadUnlocked();

  root.innerHTML = `
    <header class="bar">
      <h1>🐝 왕벌의 비행 <span id="regionTag">— 마누카 계곡</span></h1>
      <div class="hbtns">
        <button id="look" class="ghost">✨ 부드럽게</button>
        <button id="mute" class="ghost">🔊 소리</button>
      </div>
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

      <div id="fact" class="overlay hidden">
        <span class="kicker">알고 계셨나요</span>
        <p class="big sm" id="factTitle"></p>
        <p class="body" id="factBody"></p>
        <p class="hint">아무 곳이나 눌러 계속</p>
      </div>

      <div id="ending" class="overlay bottom hidden">
        <p class="big">👑 <span id="endRegion">마누카 계곡</span>의 새 여왕</p>
        <p class="body" id="endBody"></p>
        <div class="btns">
          <button id="cardBtn" class="cta ghosty">결과 카드</button>
          <button id="swarmBtn" class="cta">분봉하기</button>
          <button id="againBtn" class="cta ghosty">다시</button>
        </div>
      </div>

    </div>

    <div id="intro" class="overlay sheet">
      <p class="big">다섯 개의 꿀 왕국</p>
      <p class="body">
        너는 방금 방에서 나온 일벌이다. 실제 꿀벌처럼
        <b>나이를 먹을 때마다 맡는 일이 바뀐다</b> — 청소벌, 육아벌, 건축벌, 경비벌, 채집벌.<br>
        육아벌일 때 <b>로열젤리를 먹여 키운 그 애벌레</b>가 마지막에 여왕이 되어 나온다.
        그리고 그 여왕이 네가 된다.
      </p>
      <div class="kingdoms" id="kingdoms"></div>
      <p class="hint">방향키로 비행 · Space 부스터 · 몸으로 부딪히면 일이 된다 · 한 왕국에 약 5분</p>
    </div>

    <div id="card" class="overlay sheet hidden">
      <p class="big sm">결과 카드</p>
      <img id="cardImg" alt="이번 판의 결과 카드">
      <p class="hint" id="cardHint">폰에서는 이미지를 길게 눌러 저장하세요</p>
      <div class="btns">
        <button id="copyBtn" class="cta">이미지 복사</button>
        <button id="cardClose" class="cta ghosty">닫기</button>
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

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>("#cv");
  const frame = $<HTMLDivElement>("#frame");
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  const steps = $<HTMLOListElement>("#steps");
  STAGES.forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s.job;
    steps.appendChild(li);
  });

  let started = false;
  let muted = false;
  let pixel = false;
  try {
    pixel = localStorage.getItem(LOOK_KEY) === "1";
  } catch {
    pixel = false;
  }

  const render = (s: BeeState) => {
    const st = STAGES[Math.min(s.stage, STAGES.length - 1)];
    $("#regionTag").textContent = `— ${s.regionName}`;
    $("#stageName").textContent = st.job;
    $("#stageAge").textContent = st.age;
    $("#stageWhere").textContent = st.where;
    $("#stageTask").textContent = st.task;
    $<HTMLDivElement>("#progBar").style.width =
      `${Math.round((s.progress / Math.max(1, s.target)) * 100)}%`;
    $("#progText").textContent = `${s.progress}/${s.target}`;
    $<HTMLElement>("#hpBar").style.width = `${s.hp}%`;
    $<HTMLElement>("#wingBar").style.width = `${s.wing}%`;

    const carry: string[] = [];
    if (s.nectar) carry.push(`🍯 ${s.nectar}`);
    if (s.jelly) carry.push(`🥛 ${s.jelly}`);
    if (s.wax) carry.push(`🕯 ${s.wax}`);
    if (s.crew) carry.push(`🐝 x${s.crew}`);
    if (s.dizzy) carry.push("😵 방향 감각 상실");
    if (s.isQueen) carry.push("👑 여왕벌");
    $("#carry").textContent = carry.join("  ");

    $("#zone").textContent = s.zone;
    $("#zone").classList.toggle("show", !!s.zone);
    $("#msg").textContent = s.message;
    $("#msg").classList.toggle("show", !!s.message);

    if (s.fact) {
      $("#factTitle").textContent = s.fact.title;
      $("#factBody").textContent = s.fact.body;
      $("#fact").classList.remove("hidden");
    } else $("#fact").classList.add("hidden");

    const ending = s.status === "ending" && !s.fact && $("#card").classList.contains("hidden");
    $("#ending").classList.toggle("hidden", !ending);
    if (ending) {
      $("#endRegion").textContent = s.regionName;
      const mins = Math.floor(s.elapsed / 60);
      const secs = Math.floor(s.elapsed % 60);
      $("#endBody").innerHTML = s.nextRegionName
        ? `혼인비행을 마친 여왕은 무리의 절반을 데리고 새 땅으로 떠난다.<br>
           <b class="next">다음 왕국 — ${s.nextRegionName}</b><br>
           <span>${mins}분 ${secs}초</span>`
        : `다섯 왕국을 모두 이었다. 어느 계곡에서든 벌이 하는 일은 같았다.<br>
           <span>${mins}분 ${secs}초</span>`;
      $<HTMLButtonElement>("#swarmBtn").style.display = s.nextRegionName ? "" : "none";
    }

    Array.from(steps.children).forEach((li, i) => {
      li.className = i < s.stage ? "done" : i === s.stage ? "now" : "";
    });
  };

  const game = new BeeGame(canvas, { onState: render });

  // 왕국 선택 버튼
  const kingdoms = $<HTMLDivElement>("#kingdoms");
  function paintKingdoms() {
    kingdoms.innerHTML = "";
    REGIONS.forEach((r, i) => {
      const open = unlocked.includes(r.id);
      const b = document.createElement("button");
      b.className = `kingdom${open ? "" : " locked"}`;
      b.disabled = !open;
      b.innerHTML = `<b>${i + 1}. ${r.name}</b><i>${r.country}</i>
        <em>${open ? r.blurb : "앞의 왕국에서 분봉하면 열린다"}</em>`;
      b.addEventListener("click", () => startRegion(r));
      kingdoms.appendChild(b);
    });
  }

  function startRegion(r: Region) {
    game.clearInput();
    game.reset(Math.floor(Math.random() * 1e9), r.id);
    started = true;
    $("#intro").classList.add("hidden");
  }
  paintKingdoms();

  game.start();

  function fit() {
    const cssW = frame.clientWidth;
    if (cssW <= 0) return;
    const top = frame.getBoundingClientRect().top;
    const avail = window.innerHeight - top - 168;
    const portrait = window.innerHeight > window.innerWidth;
    const cap = cssW * (portrait ? 1.55 : 1.1);
    const cssH = Math.round(Math.max(cssW * 0.5, Math.min(Math.max(avail, 210), cap)));
    frame.style.height = `${cssH}px`;
    game.resize(VIEW_W, Math.max(260, Math.min(700, Math.round((VIEW_W * cssH) / cssW))), cssW);
  }
  fit();
  if (pixel) game.setPixelArt(true);

  // ── 조작 ────────────────────────────────────────────────────────────
  function onKey(e: KeyboardEvent) {
    if (e.code === "KeyR" && e.type === "keydown") {
      game.clearInput();
      game.reset();
      started = true;
      $("#intro").classList.add("hidden");
      return;
    }
    const a = KEY_MAP[e.code];
    if (!a) return;
    e.preventDefault();
    game.setInput(a, e.type === "keydown");
    if (e.type === "keydown" && !started) {
      started = true;
      $("#intro").classList.add("hidden");
    }
  }
  const onBlur = () => game.clearInput();
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);

  root.querySelectorAll<HTMLButtonElement>("[data-k]").forEach((b) => {
    const a = b.dataset.k as InputName;
    const set = (v: boolean) => {
      game.setInput(a, v);
      if (v && !started) {
        started = true;
        $("#intro").classList.add("hidden");
      }
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

  function paintLook() {
    $("#look").textContent = pixel ? "🎮 픽셀아트" : "✨ 부드럽게";
    $("#look").title = pixel ? "눌러서 부드럽게 보기" : "눌러서 픽셀아트로 보기";
  }
  $("#look").addEventListener("click", () => {
    pixel = !pixel;
    game.setPixelArt(pixel);
    try {
      localStorage.setItem(LOOK_KEY, pixel ? "1" : "0");
    } catch {
      // 저장이 막혀도 이번 판에는 적용된다
    }
    paintLook();
  });
  paintLook();

  $("#mute").addEventListener("click", () => {
    muted = !muted;
    game.setMuted(muted);
    $("#mute").textContent = muted ? "🔇 소리" : "🔊 소리";
  });
  $("#fact").addEventListener("click", () => game.dismissFact());
  $("#againBtn").addEventListener("click", () => {
    game.clearInput();
    game.reset();
  });
  $("#swarmBtn").addEventListener("click", () => {
    const next = game.swarm();
    if (!next) return;
    if (!unlocked.includes(next.id)) {
      unlocked = [...unlocked, next.id];
      saveUnlocked(unlocked);
      paintKingdoms();
    }
  });

  // ── 결과 카드 ────────────────────────────────────────────────────────
  let cardUrl = "";
  $("#cardBtn").addEventListener("click", () => {
    cardUrl = game.shareCard();
    $<HTMLImageElement>("#cardImg").src = cardUrl;
    $("#card").classList.remove("hidden");
    $("#ending").classList.add("hidden");
  });
  $("#cardClose").addEventListener("click", () => {
    $("#card").classList.add("hidden");
  });
  $("#copyBtn").addEventListener("click", async () => {
    const hint = $("#cardHint");
    try {
      const blob = await (await fetch(cardUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      hint.textContent = "복사했습니다. 붙여넣기 하세요";
    } catch {
      hint.textContent = "이 브라우저는 복사를 막습니다 — 이미지를 길게 눌러 저장하세요";
    }
  });

  return () => {
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", onKey);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("resize", fit);
    window.removeEventListener("orientationchange", fit);
    game.stop();
  };
}
