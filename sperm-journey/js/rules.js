/**
 * 정자의 여행 — 게임 규칙.
 * 값만 고쳐도 난이도를 조절할 수 있도록 상수와 생성 규칙을 여기 모아 둔다.
 * 빌드 도구 없이 브라우저에서 바로 실행되도록 전역 SJ 네임스페이스를 쓴다.
 */
window.SJ = window.SJ || {};

(function (SJ) {
  "use strict";

  var VIEW_W = 720;
  var VIEW_H = 420;

  /** 여정을 네 구간으로 나눈다. 구간이 바뀔 때마다 생명 상식 한 줄을 보여 준다. */
  var STAGES = [
    {
      name: "1구간 · 출발",
      hint: "산성 방울을 피하세요",
      fact: "한 번에 출발하는 정자는 2억 마리가 넘지만, 난자 근처까지 닿는 건 겨우 수백 마리예요.",
      top: "#7b2d5e",
      bottom: "#3d1533",
      tint: "#ff9ad5",
    },
    {
      name: "2구간 · 자궁경부",
      hint: "점액 벽의 틈으로 통과하세요",
      fact: "자궁경부의 점액은 평소엔 촘촘하지만 배란기엔 그물이 느슨해져 길이 열려요.",
      top: "#8a4a2f",
      bottom: "#3a1c14",
      tint: "#ffc48a",
    },
    {
      name: "3구간 · 자궁",
      hint: "백혈구가 쫓아옵니다",
      fact: "자궁 안에서는 백혈구가 낯선 세포를 청소해요. 정자에게는 가장 위험한 구간이랍니다.",
      top: "#7a2f3a",
      bottom: "#33121b",
      tint: "#ff9aa6",
    },
    {
      name: "4구간 · 나팔관",
      hint: "역류를 뚫고 난자에게로",
      fact: "나팔관 안쪽 털은 난자를 자궁 쪽으로 밀어내요. 정자는 그 물살을 거슬러 올라갑니다.",
      top: "#2f5f6e",
      bottom: "#10262f",
      tint: "#8ae6ff",
    },
  ];

  SJ.rules = {
    VIEW_W: VIEW_W,
    VIEW_H: VIEW_H,
    PLAYER_X: 170,
    PLAYER_R: 11,
    TOTAL_DISTANCE: 7200,
    BASE_SPEED: 2.7,
    BOOST_SPEED: 4.3,
    MAX_HP: 3,
    INVULN_MS: 1300,
    STAGES: STAGES,
    ENDING_FACT:
      "난자는 정자 하나가 들어오는 순간 껍질을 단단하게 바꿔 다른 정자를 막아요. 그렇게 딱 한 번, ‘나’라는 사람이 시작됩니다.",
    FAMILY_QUESTION: "가족과 이야기해 보세요 — 내가 태어나던 날, 우리 집은 어떤 분위기였나요?",
  };

  SJ.rules.clamp = function (v, min, max) {
    return v < min ? min : v > max ? max : v;
  };

  SJ.rules.progressAt = function (distance) {
    return SJ.rules.clamp(distance / SJ.rules.TOTAL_DISTANCE, 0, 1);
  };

  SJ.rules.stageIndexAt = function (progress) {
    return SJ.rules.clamp(Math.floor(progress * STAGES.length), 0, STAGES.length - 1);
  };

  /** 통로의 중심선. 월드 좌표로 계산해 스크롤해도 이어져 보이게 한다. */
  SJ.rules.tunnelCenter = function (worldX) {
    return VIEW_H / 2 + 42 * Math.sin(worldX / 520) + 14 * Math.sin(worldX / 170 + 1.1);
  };

  /**
   * 중심선에서 위아래로 열린 폭의 절반. 마지막 구간에서 점점 좁아진다.
   * 통로가 화면 밖으로 벗어나면 정자가 보이지 않는 곳까지 헤엄칠 수 있으므로,
   * 중심선이 치우친 만큼 폭을 줄여 양쪽 벽이 항상 화면 안에 남게 한다.
   */
  SJ.rules.tunnelHalf = function (worldX) {
    var p = SJ.rules.progressAt(worldX);
    var narrowing = 46 * Math.max(0, (p - 0.62) / 0.38);
    var half = VIEW_H / 2 - 42 - narrowing + 12 * Math.sin(worldX / 240 + 0.6);
    var center = SJ.rules.tunnelCenter(worldX);
    var room = Math.min(center, VIEW_H - center) - 16;
    return SJ.rules.clamp(Math.min(half, room), 70, VIEW_H / 2 - 18);
  };

  /**
   * 다음 장애물 묶음을 만든다. 구간마다 등장하는 종류가 다르다.
   * 반환: { entities: [...], gap: 다음 묶음까지의 거리 }
   */
  SJ.rules.spawnAt = function (worldX, rand) {
    var p = SJ.rules.progressAt(worldX);
    var stage = SJ.rules.stageIndexAt(p);
    var center = SJ.rules.tunnelCenter(worldX);
    var half = SJ.rules.tunnelHalf(worldX);
    var entities = [];
    var gap = 330 - 70 * p;

    if (stage === 0) {
      var count = rand() < 0.35 ? 2 : 1;
      for (var i = 0; i < count; i += 1) {
        entities.push({
          kind: "acid",
          x: worldX + i * 70,
          y: center + (rand() * 2 - 1) * (half - 40),
          r: 15 + rand() * 7,
          seed: rand() * Math.PI * 2,
        });
      }
    } else if (stage === 1) {
      var gapH = 168 - 34 * (p - 0.25) * 4;
      entities.push({
        kind: "wall",
        x: worldX,
        gapY: center + (rand() * 2 - 1) * (half - gapH / 2 - 10),
        gapH: gapH,
      });
      if (rand() < 0.4) {
        entities.push({
          kind: "acid",
          x: worldX + 150,
          y: center + (rand() * 2 - 1) * (half - 40),
          r: 15,
          seed: rand() * Math.PI * 2,
        });
      }
      gap = 300;
    } else if (stage === 2) {
      entities.push({
        kind: "cell",
        x: worldX,
        y: center + (rand() * 2 - 1) * (half - 50),
        r: 24,
        seed: rand() * Math.PI * 2,
      });
      if (rand() < 0.45) {
        entities.push({
          kind: "acid",
          x: worldX + 160,
          y: center + (rand() * 2 - 1) * (half - 40),
          r: 14,
          seed: rand() * Math.PI * 2,
        });
      }
      gap = 340;
    } else {
      var roll = rand();
      if (roll < 0.42) {
        entities.push({ kind: "current", x: worldX, w: 210 + rand() * 90 });
        gap = 360;
      } else if (roll < 0.78) {
        var lastGapH = 128;
        entities.push({
          kind: "wall",
          x: worldX,
          gapY: center + (rand() * 2 - 1) * Math.max(0, half - lastGapH / 2 - 8),
          gapH: lastGapH,
        });
        gap = 300;
      } else {
        entities.push({
          kind: "cell",
          x: worldX,
          y: center + (rand() * 2 - 1) * (half - 50),
          r: 22,
          seed: rand() * Math.PI * 2,
        });
        gap = 320;
      }
    }

    if (rand() < 0.55) {
      entities.push({
        kind: "energy",
        x: worldX + gap * 0.55,
        y: center + (rand() * 2 - 1) * (half - 45),
        taken: false,
      });
    }

    return { entities: entities, gap: gap };
  };

  /* ------------------------------ 최고 기록 저장 ----------------------------- */

  var RECORD_KEY = "sperm-journey-best-v1";

  SJ.rules.loadRecord = function () {
    try {
      var raw = window.localStorage.getItem(RECORD_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.seconds !== "number") return null;
      return parsed;
    } catch (err) {
      return null;
    }
  };

  SJ.rules.saveRecord = function (record) {
    var best = SJ.rules.loadRecord();
    var better =
      !best ||
      record.energy > best.energy ||
      (record.energy === best.energy && record.seconds < best.seconds);
    var next = better ? record : best;
    try {
      window.localStorage.setItem(RECORD_KEY, JSON.stringify(next));
    } catch (err) {
      // 저장이 막혀 있어도(사생활 보호 모드 등) 게임 진행에는 지장이 없다.
    }
    return next;
  };

  SJ.rules.formatSeconds = function (seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds - m * 60;
    return m > 0 ? m + "분 " + s.toFixed(1) + "초" : s.toFixed(1) + "초";
  };
})(window.SJ);
