import * as THREE from "three";
import { GLTFLoader } from "../vendor/loaders/GLTFLoader.js";
import {
  BASE_SPEED,
  BOOST_SPEED,
  INVULN_MS,
  MAX_HP,
  PLAYER_R,
  TOTAL,
  buildCourse,
  buildTunnelMesh,
  centerAt,
  frameAt,
  polar,
  radiusAt,
  stageIndexAt,
  toWorld,
} from "./world.js";

// 구간 이름·안내·생명 상식은 2D판과 같은 원본(js/rules.js)을 읽는다.
const RULES = window.SJ.rules;
const STAGES = RULES.STAGES;
const RECORD_KEY = "sperm-journey-3d-best-v1";
const STAGE_COLORS = ["#7b2d5e", "#8a4a2f", "#7a2f3a", "#2f5f6e"];
const RING_HOLE_OFFSET = 0.42; // make_assets.py 의 고리 구멍 위치와 같아야 한다
const RING_HOLE_RADIUS = 0.46;

const canvas = document.getElementById("scene");
const overlay = document.getElementById("overlay");
const overlayBody = document.getElementById("overlay-body");
const startBtn = document.getElementById("start-btn");
const hud = {
  fill: document.getElementById("bar-fill"),
  pct: document.getElementById("pct"),
  hearts: document.getElementById("hearts"),
  energy: document.getElementById("energy"),
  banner: document.getElementById("banner"),
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(new THREE.Color(STAGE_COLORS[0]).multiplyScalar(0.22), 0.0085);
scene.background = scene.fog.color;

const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.5, 600);
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
// 통로 벽은 위아래 색이 달라야 입체로 보인다. 방향광은 딱딱한 경계를 남겨 쓰지 않는다.
scene.add(new THREE.HemisphereLight(0xffd9ea, 0x2a1020, 1.1));
// 정자를 따라다니는 등. 살짝 뒤에 두어야 정자 자체가 밝게 보인다.
const lamp = new THREE.PointLight(0xfff0f6, 900, 170, 2);
scene.add(lamp);

function resize() {
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / Math.max(1, rect.height);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

/** 떠다니는 부스러기. 속도감은 벽보다 이런 입자에서 더 잘 읽힌다. */
const dust = (() => {
  const count = 700;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 12;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 240;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xffd9ec, size: 0.22, transparent: true, opacity: 0.5 }),
  );
})();

/* ------------------------------- 에셋 불러오기 ------------------------------- */

const loader = new GLTFLoader();
const ASSETS = ["sperm", "cell", "acid", "energy", "egg", "ring"];

/**
 * 모형은 assets/models.json 번들 하나로 읽는다. .glb 확장자를 서빙하지 않는 정적 호스팅이
 * 있어서다. 번들은 tools/make_assets.py 가 .glb와 함께 만든다.
 */
async function loadAssets() {
  const res = await fetch("./assets/models.json");
  if (!res.ok) throw new Error(`모형 번들을 읽지 못했습니다 (HTTP ${res.status})`);
  const bundle = await res.json();

  const parsed = await Promise.all(
    ASSETS.map(
      (name) =>
        new Promise((resolve, reject) => {
          const binary = atob(bundle[name]);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          loader.parse(bytes.buffer, "", resolve, reject);
        }),
    ),
  );
  return Object.fromEntries(ASSETS.map((name, i) => [name, parsed[i]]));
}

/* -------------------------------- 게임 상태 -------------------------------- */

const state = {
  phase: "loading", // loading | ready | playing | won | lost
  s: 0,
  u: 0,
  v: 0,
  targetU: 0,
  targetV: 0,
  hp: MAX_HP,
  energy: 0,
  time: 0,
  elapsed: 0,
  invulnUntil: 0,
  boostUntil: 0,
  stage: 0,
  bannerUntil: 0,
  course: [],
};

let assets = null;
let mixer = null;
let swimAction = null;
let player = null;
let eggMesh = null;
const nodes = new Map(); // course item -> Object3D
let best = RULES.loadRecord(RECORD_KEY);

/* ------------------------------ 코스 만들기 ------------------------------ */

function instance(name) {
  const root = assets[name].scene.clone(true);
  root.traverse((o) => {
    if (o.isMesh) o.material = o.material.clone();
  });
  return root;
}

function placeOnTube(object, s, u, v) {
  const { tangent } = frameAt(s);
  toWorld(s, u, v, object.position);
  object.lookAt(object.position.clone().add(tangent));
}

function buildCourseObjects() {
  for (const node of nodes.values()) scene.remove(node);
  nodes.clear();

  state.course = buildCourse(STAGES.length);
  for (const item of state.course) {
    const R = radiusAt(item.s);
    let node;

    if (item.kind === "ring") {
      node = new THREE.Object3D();
      const spinner = new THREE.Object3D();
      spinner.rotation.z = item.angle;
      const mesh = instance("ring");
      mesh.rotation.x = Math.PI / 2;
      mesh.scale.set(R, 3, R);
      spinner.add(mesh);
      node.add(spinner);
      placeOnTube(node, item.s, 0, 0);
    } else if (item.kind === "current") {
      const geometry = new THREE.CylinderGeometry(R * 0.96, R * 0.96, item.len, 24, 1, true);
      geometry.rotateX(Math.PI / 2);
      node = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: 0x7fdcff,
          transparent: true,
          opacity: 0.16,
          side: THREE.BackSide,
        }),
      );
      placeOnTube(node, item.s + item.len / 2, 0, 0);
    } else {
      const { u, v } = polar(item.angle, item.radial);
      node = instance(item.kind === "energy" ? "energy" : item.kind);
      node.scale.setScalar(item.r);
      placeOnTube(node, item.s, u, v);
      item.u = u;
      item.v = v;
    }

    nodes.set(item, node);
    scene.add(node);
  }
}

/* --------------------------------- 조작 --------------------------------- */

const keys = {};

function pointTo(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  // 화면 위치를 그대로 단면 위 위치로 옮긴다. 위로 끌면 위로 헤엄친다.
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = 1 - ((clientY - rect.top) / rect.height) * 2;
  const reach = radiusAt(state.s) - PLAYER_R;
  state.targetU = nx * reach;
  state.targetV = ny * reach;
}

canvas.addEventListener("pointermove", (e) => pointTo(e.clientX, e.clientY));
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointTo(e.clientX, e.clientY);
  if (state.phase !== "playing" && state.phase !== "loading") start();
});
overlay.addEventListener("pointerdown", (e) => {
  if (e.target === overlay && state.phase !== "loading") start();
});
startBtn.addEventListener("click", () => state.phase !== "loading" && start());
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
  if (e.key === " " && state.phase !== "playing" && state.phase !== "loading") start();
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

/* --------------------------------- 화면 --------------------------------- */

function showOverlay(html, label) {
  overlayBody.innerHTML = html;
  startBtn.textContent = label;
  startBtn.hidden = false;
  overlay.hidden = false;
}

function recordLine() {
  if (!best) return "";
  return `<p class="dim">최고 기록: 에너지 ${best.energy}개 · ${RULES.formatSeconds(best.seconds)}</p>`;
}

function readyScreen() {
  showOverlay(
    '<div class="emoji">🥚</div><h2>난자를 찾아 출발!</h2>' +
      "<p>마우스나 손가락으로 통로 안에서 상하좌우로 헤엄치세요. 방향키로도 움직입니다. " +
      "산성 방울·점액 고리·백혈구를 피하고 에너지를 모아 난자까지 가면 성공!</p>" +
      '<p class="dim">체력은 하트 3개, 네 구간을 지나갑니다.</p>' +
      recordLine(),
    "출발하기",
  );
}

function endScreen(won) {
  const seconds = state.elapsed / 1000;
  if (won) {
    best = RULES.saveRecord({ seconds, energy: state.energy, hp: state.hp }, RECORD_KEY);
    showOverlay(
      '<div class="emoji">✨</div><h2>난자 도착, 수정 성공!</h2>' +
        `<p><strong>${RULES.formatSeconds(seconds)}</strong> · 에너지 ${state.energy}개 · 남은 체력 ${"❤️".repeat(state.hp) || "0"}</p>` +
        `<p class="fact">${RULES.ENDING_FACT}</p>` +
        `<p class="question">${RULES.FAMILY_QUESTION}</p>` +
        recordLine(),
      "다시 도전",
    );
  } else {
    showOverlay(
      '<div class="emoji">💫</div><h2>여기까지…</h2>' +
        `<p>${Math.round((state.s / TOTAL) * 100)}% 지점 · 에너지 ${state.energy}개</p>` +
        '<p class="fact">실제로도 출발한 정자 대부분은 난자를 만나지 못해요. 다시 도전!</p>' +
        recordLine(),
      "다시 도전",
    );
  }
}

function updateHud() {
  const p = Math.min(1, state.s / TOTAL);
  hud.fill.style.width = `${p * 100}%`;
  hud.pct.textContent = `${Math.round(p * 100)}%`;
  hud.hearts.textContent = "❤️".repeat(Math.max(0, state.hp));
  hud.energy.textContent = `⚡ ${state.energy}`;

  const stage = STAGES[state.stage];
  if (state.time < state.bannerUntil) {
    hud.banner.hidden = false;
    hud.banner.innerHTML = `<strong>${stage.name} — ${stage.hint}</strong><span>${stage.fact}</span>`;
  } else {
    hud.banner.hidden = true;
  }
}

/* -------------------------------- 게임 흐름 -------------------------------- */

function start() {
  Object.assign(state, {
    phase: "playing",
    s: 0,
    u: 0,
    v: 0,
    targetU: 0,
    targetV: 0,
    hp: MAX_HP,
    energy: 0,
    time: 0,
    elapsed: 0,
    invulnUntil: 0,
    boostUntil: 0,
    stage: 0,
    bannerUntil: 2600,
  });
  buildCourseObjects();
  overlay.hidden = true;
  hud.banner.hidden = false;
}

function finish(won) {
  state.phase = won ? "won" : "lost";
  endScreen(won);
}

function hit() {
  state.hp -= 1;
  state.invulnUntil = state.time + INVULN_MS;
  state.boostUntil = 0;
}

function update(dt, deltaMs) {
  state.time += deltaMs;
  state.elapsed += deltaMs;

  const reach = radiusAt(state.s) - PLAYER_R;
  const step = 0.42 * dt;
  if (keys.ArrowUp || keys.w) state.targetV += step;
  if (keys.ArrowDown || keys.s) state.targetV -= step;
  if (keys.ArrowLeft || keys.a) state.targetU -= step;
  if (keys.ArrowRight || keys.d) state.targetU += step;

  state.u += (state.targetU - state.u) * 0.16 * dt;
  state.v += (state.targetV - state.v) * 0.16 * dt;
  const offset = Math.hypot(state.u, state.v);
  if (offset > reach) {
    state.u = (state.u / offset) * reach;
    state.v = (state.v / offset) * reach;
  }

  const boosted = state.time < state.boostUntil;
  let speed = boosted ? BOOST_SPEED : BASE_SPEED;
  for (const item of state.course) {
    if (item.kind === "current" && state.s > item.s && state.s < item.s + item.len) speed *= 0.42;
  }
  state.s += speed * dt;

  const invulnerable = state.time < state.invulnUntil;
  for (const item of state.course) {
    const node = nodes.get(item);
    const ds = item.s - state.s;
    if (!node) continue;

    if (item.kind === "cell") {
      // 백혈구는 정자 쪽으로 천천히 다가온다.
      if (ds > -10 && ds < 150) {
        item.u += THREE.MathUtils.clamp(state.u - item.u, -1, 1) * 0.055 * dt;
        item.v += THREE.MathUtils.clamp(state.v - item.v, -1, 1) * 0.055 * dt;
        item.s -= 0.06 * dt;
        placeOnTube(node, item.s, item.u, item.v);
      }
    } else if (item.kind === "energy" && !item.taken) {
      node.rotation.y += 0.05 * dt;
      node.rotation.x += 0.03 * dt;
    } else if (item.kind === "acid") {
      node.rotation.y += 0.02 * dt;
    }

    if (item.kind === "energy") {
      if (!item.taken && Math.abs(ds) < 3 && Math.hypot(item.u - state.u, item.v - state.v) < 3.2) {
        item.taken = true;
        node.visible = false;
        state.energy += 1;
        state.boostUntil = state.time + 1600;
      }
      continue;
    }
    if (invulnerable || item.hitDone) continue;

    if (item.kind === "acid" || item.kind === "cell") {
      const reachSq = (item.r + PLAYER_R) * (item.r + PLAYER_R);
      const dist = ds * ds + (item.u - state.u) ** 2 + (item.v - state.v) ** 2;
      if (dist < reachSq) {
        item.hitDone = true;
        hit();
      }
    } else if (item.kind === "ring" && Math.abs(ds) < 1.6) {
      const R = radiusAt(item.s);
      const hole = polar(item.angle, RING_HOLE_OFFSET * R);
      const fromHole = Math.hypot(state.u - hole.u, state.v - hole.v);
      if (fromHole > RING_HOLE_RADIUS * R - PLAYER_R) {
        item.hitDone = true;
        hit();
      }
    }
  }

  const stage = stageIndexAt(state.s, STAGES.length);
  if (stage !== state.stage) {
    state.stage = stage;
    state.bannerUntil = state.time + 3000;
    const color = new THREE.Color(STAGE_COLORS[stage]);
    scene.fog.color.copy(color).multiplyScalar(0.22);
    scene.background = scene.fog.color;
  }

  // 정자 본체: 위치와 방향, 그리고 가속 중에는 꼬리를 더 빨리 흔든다.
  const { tangent } = frameAt(state.s);
  toWorld(state.s, state.u, state.v, player.position);
  player.lookAt(player.position.clone().add(tangent));
  player.visible = !(invulnerable && Math.floor(state.time / 110) % 2 === 0);
  if (swimAction) swimAction.timeScale = boosted ? 2.4 : 1.5;

  lamp.position.copy(player.position).addScaledVector(tangent, -5);
  lamp.position.y += 4;

  // 카메라는 조금 뒤 위에서 따라온다. 정자가 화면 가운데 아래쪽에 오고, 그 너머로 통로가 보인다.
  const camS = Math.max(0, state.s - 11);
  const camPos = toWorld(camS, state.u * 0.8, state.v * 0.8 + 2.6);
  camera.position.lerp(camPos, Math.min(1, 0.25 * dt));
  camera.lookAt(player.position.clone().addScaledVector(tangent, 13));

  dust.position.z = Math.round(state.s / 40) * 40;

  if (eggMesh) eggMesh.rotation.y += 0.004 * dt;
}

/* --------------------------------- 루프 --------------------------------- */

let lastTs = 0;

function frame(ts) {
  requestAnimationFrame(frame);
  if (!lastTs) lastTs = ts;
  const deltaMs = THREE.MathUtils.clamp(ts - lastTs, 0, 50);
  lastTs = ts;
  const dt = deltaMs / 16.6667;

  if (state.phase === "playing") {
    update(dt, deltaMs);
    updateHud();
    if (state.hp <= 0) finish(false);
    else if (state.s >= TOTAL) finish(true);
  }
  if (mixer) mixer.update(deltaMs / 1000);
  renderer.render(scene, camera);
}

/* --------------------------------- 시작 --------------------------------- */

async function boot() {
  assets = await loadAssets();

  scene.add(buildTunnelMesh(STAGE_COLORS));

  player = assets.sperm.scene;
  // 충돌 반지름(PLAYER_R)과 눈에 보이는 크기를 맞춘다.
  player.scale.setScalar(1.15);
  // 모델은 +X를 향해 있다. 진행 방향(+Z)으로 돌려 둔다.
  player.traverse((o) => {
    if (o.isSkinnedMesh) o.frustumCulled = false;
  });
  const holder = new THREE.Object3D();
  player.rotation.y = -Math.PI / 2;
  holder.add(player);
  player = holder;
  scene.add(player);

  mixer = new THREE.AnimationMixer(assets.sperm.scene);
  const clip = assets.sperm.animations[0];
  if (clip) {
    swimAction = mixer.clipAction(clip);
    swimAction.play();
  }

  eggMesh = assets.egg.scene;
  eggMesh.scale.setScalar(radiusAt(TOTAL) * 0.8);
  placeOnTube(eggMesh, TOTAL + 10, 0, 0);
  scene.add(eggMesh);
  // 난자는 이 여정의 목적지다. 멀리서부터 빛나 보이도록 자체 조명을 둔다.
  const eggGlow = new THREE.PointLight(0xffdca8, 2600, 260, 2);
  eggGlow.position.copy(eggMesh.position);
  scene.add(eggGlow);

  scene.add(dust);
  buildCourseObjects();
  resize();
  state.phase = "ready";
  readyScreen();
  requestAnimationFrame(frame);
  window.__ready = true; // 자동 검증에서 준비 완료를 확인하는 용도
}

showOverlay('<div class="emoji">🧬</div><h2>3D 에셋 불러오는 중…</h2>', "잠시만요");
startBtn.hidden = true;
boot().catch((err) => {
  showOverlay(
    `<div class="emoji">⚠️</div><h2>불러오기 실패</h2><p class="fact">${err.message}</p>` +
      '<p class="dim">로컬 서버로 열어야 합니다. 폴더에서 <code>python3 -m http.server</code> 실행 후 접속하세요.</p>',
    "다시 시도",
  );
  window.__error = String(err);
});
