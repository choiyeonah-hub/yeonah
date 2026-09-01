/**
 * 정자의 여행 — 게임 루프, 조작, 화면 전환.
 */
window.SJ = window.SJ || {};

(function (SJ) {
  "use strict";

  var R = SJ.rules;
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var overlay = document.getElementById("overlay");
  var body = document.getElementById("overlay-body");
  var startBtn = document.getElementById("start-btn");
  var stageList = document.getElementById("stage-list");

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = R.VIEW_W * dpr;
  canvas.height = R.VIEW_H * dpr;

  var phase = "ready"; // ready | playing | won | lost
  var keys = {};
  var lastTs = 0;
  var state = createState();
  var best = R.loadRecord();

  function createState() {
    var swimmers = [];
    for (var i = 0; i < 14; i += 1) {
      swimmers.push({
        x: Math.random() * R.VIEW_W,
        y: Math.random() * R.VIEW_H,
        speed: 0.4 + Math.random() * 1.2,
        scale: 0.35 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return {
      distance: 0,
      spawnX: 640,
      entities: [],
      swimmers: swimmers,
      y: R.VIEW_H / 2,
      targetY: R.VIEW_H / 2,
      vy: 0,
      hp: R.MAX_HP,
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

  /* --------------------------------- 화면 --------------------------------- */

  function showOverlay(html, buttonLabel) {
    body.innerHTML = html;
    startBtn.textContent = buttonLabel;
    overlay.hidden = false;
  }

  function readyScreen() {
    showOverlay(
      '<div class="emoji">🥚</div>' +
        "<h2>난자를 찾아 출발!</h2>" +
        "<p>화면을 위아래로 쓸어(또는 마우스를 움직여) 헤엄치세요. 방향키 ↑↓ 로도 움직일 수 있어요. " +
        "산성 방울·점액 벽·백혈구를 피하고 에너지를 모아 난자까지 가면 성공!</p>" +
        '<p class="dim">체력은 하트 3개, 네 구간을 지나갑니다.</p>' +
        recordLine(),
      "출발하기",
    );
  }

  function recordLine() {
    if (!best) return "";
    return (
      '<p class="dim">최고 기록: 에너지 ' +
      best.energy +
      "개 · " +
      R.formatSeconds(best.seconds) +
      "</p>"
    );
  }

  function endScreen(won, summary) {
    if (won) {
      showOverlay(
        '<div class="emoji">✨</div>' +
          "<h2>난자 도착, 수정 성공!</h2>" +
          "<p><strong>" +
          R.formatSeconds(summary.seconds) +
          "</strong> · 에너지 " +
          summary.energy +
          "개 · 남은 체력 " +
          ("❤️".repeat(summary.hp) || "0") +
          "</p>" +
          '<p class="fact">' +
          R.ENDING_FACT +
          "</p>" +
          '<p class="question">' +
          R.FAMILY_QUESTION +
          "</p>" +
          recordLine(),
        "다시 도전",
      );
    } else {
      showOverlay(
        '<div class="emoji">💫</div>' +
          "<h2>여기까지…</h2>" +
          "<p>" +
          Math.round(R.progressAt(state.distance) * 100) +
          "% 지점 · 에너지 " +
          summary.energy +
          "개</p>" +
          '<p class="fact">실제로도 출발한 정자 대부분은 난자를 만나지 못해요. 다시 도전!</p>' +
          recordLine(),
        "다시 도전",
      );
    }
  }

  function start() {
    state = createState();
    lastTs = 0;
    phase = "playing";
    overlay.hidden = true;
  }

  function finish(won) {
    var summary = { seconds: state.elapsed / 1000, energy: state.energy, hp: state.hp };
    phase = won ? "won" : "lost";
    if (won) best = R.saveRecord(summary);
    endScreen(won, summary);
  }

  /* --------------------------------- 조작 --------------------------------- */

  /** 포인터(마우스·손가락)가 가리키는 높이를 목표 위치로 삼는다. */
  function pointTo(clientY) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.height) return;
    state.targetY = R.clamp(((clientY - rect.top) / rect.height) * R.VIEW_H, 0, R.VIEW_H);
  }

  canvas.addEventListener("pointermove", function (e) {
    pointTo(e.clientY);
  });
  canvas.addEventListener("pointerdown", function (e) {
    canvas.setPointerCapture(e.pointerId);
    pointTo(e.clientY);
    if (phase !== "playing") start();
  });
  // 카드 바깥(어두운 배경)을 눌러도 바로 시작 — 안내대로 "화면 터치"가 통하게.
  overlay.addEventListener("pointerdown", function (e) {
    if (e.target === overlay) start();
  });
  startBtn.addEventListener("click", start);

  window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", " ", "w", "s"].indexOf(e.key) !== -1) e.preventDefault();
    keys[e.key] = true;
    if (e.key === " " && phase !== "playing") start();
  });
  window.addEventListener("keyup", function (e) {
    keys[e.key] = false;
  });

  /* ------------------------------- 게임 루프 ------------------------------- */

  function hit() {
    state.hp -= 1;
    state.invulnUntil = state.time + R.INVULN_MS;
    state.boostUntil = 0;
    state.shake = 8;
  }

  function update(dt, deltaMs) {
    state.time += deltaMs;
    state.elapsed += deltaMs;

    // 키보드 조작은 포인터가 없을 때를 위한 대체 수단이다.
    if (keys.ArrowUp || keys.w) state.targetY -= 7 * dt;
    if (keys.ArrowDown || keys.s) state.targetY += 7 * dt;
    state.targetY = R.clamp(state.targetY, 0, R.VIEW_H);

    var prevY = state.y;
    state.y += (state.targetY - state.y) * 0.16 * dt;
    state.vy = (state.y - prevY) / Math.max(dt, 0.001);

    var playerWorldX = state.distance + R.PLAYER_X;
    var center = R.tunnelCenter(playerWorldX);
    var half = R.tunnelHalf(playerWorldX);
    state.y = R.clamp(state.y, center - half + R.PLAYER_R, center + half - R.PLAYER_R);

    var speed = state.time < state.boostUntil ? R.BOOST_SPEED : R.BASE_SPEED;
    state.entities.forEach(function (e) {
      if (e.kind === "current" && playerWorldX > e.x && playerWorldX < e.x + e.w) speed *= 0.42;
    });
    state.distance += speed * dt;

    // 화면 앞쪽으로 계속 새 장애물을 채운다.
    while (state.spawnX < state.distance + R.VIEW_W + 260) {
      var batch = R.spawnAt(state.spawnX, Math.random);
      state.entities = state.entities.concat(batch.entities);
      state.spawnX += batch.gap;
    }
    state.entities = state.entities.filter(function (e) {
      var right = e.kind === "current" ? e.x + e.w : e.x + 60;
      return right > state.distance - 80;
    });

    var invulnerable = state.time < state.invulnUntil;
    state.entities.forEach(function (e) {
      if (e.kind === "cell") {
        // 백혈구는 정자를 향해 천천히 다가온다.
        e.y += R.clamp(state.y - e.y, -1, 1) * 0.55 * dt;
        e.x -= 0.35 * dt;
      }
      if (e.kind === "acid") {
        e.y += Math.sin(state.time / 420 + e.seed) * 0.7 * dt;
      }

      var dx = e.kind === "current" ? 0 : e.x - playerWorldX;

      if (e.kind === "energy") {
        if (!e.taken && Math.abs(dx) < 22 && Math.abs(e.y - state.y) < 22) {
          e.taken = true;
          state.energy += 1;
          state.boostUntil = state.time + 1600;
        }
        return;
      }

      if (invulnerable) return;

      if (e.kind === "acid" || e.kind === "cell") {
        var dy = e.y - state.y;
        if (dx * dx + dy * dy < (e.r + R.PLAYER_R) * (e.r + R.PLAYER_R)) hit();
      } else if (e.kind === "wall") {
        if (Math.abs(dx) < 15 + R.PLAYER_R) {
          var top = e.gapY - e.gapH / 2;
          var bottom = e.gapY + e.gapH / 2;
          if (state.y - R.PLAYER_R < top || state.y + R.PLAYER_R > bottom) hit();
        }
      }
    });

    var stage = R.stageIndexAt(R.progressAt(state.distance));
    if (stage !== state.stage) {
      state.stage = stage;
      state.stageBannerUntil = state.time + 2600;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 0.8);

    state.swimmers.forEach(function (sw) {
      sw.x -= (speed * 0.35 + sw.speed) * dt;
      sw.y += Math.sin(state.time / 500 + sw.phase) * 0.3 * dt;
      if (sw.x < -40) {
        sw.x = R.VIEW_W + 40 + Math.random() * 120;
        sw.y = Math.random() * R.VIEW_H;
      }
    });
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    // 탭이 백그라운드에 있다 돌아와도 한 번에 뛰지 않도록 프레임 간격을 묶는다.
    var deltaMs = R.clamp(ts - lastTs, 0, 50);
    lastTs = ts;

    if (phase === "playing") update(deltaMs / 16.6667, deltaMs);
    SJ.render(ctx, state, dpr, phase);

    if (phase === "playing") {
      if (state.hp <= 0) finish(false);
      else if (state.distance >= R.TOTAL_DISTANCE) finish(true);
    }
    requestAnimationFrame(frame);
  }

  /* --------------------------------- 시작 --------------------------------- */

  R.STAGES.forEach(function (s) {
    var li = document.createElement("li");
    li.innerHTML = "<strong>" + s.name + "</strong> · " + s.hint;
    stageList.appendChild(li);
  });

  readyScreen();
  requestAnimationFrame(frame);
})(window.SJ);
