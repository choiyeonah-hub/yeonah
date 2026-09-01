// 정자의 여행 — 게임 규칙과 상수. 렌더링과 분리해 두어 값만 보고도 난이도를 조절할 수 있게 한다.

export const VIEW_W = 720;
export const VIEW_H = 420;
export const PLAYER_X = 170;
export const PLAYER_R = 11;
export const TOTAL_DISTANCE = 7200;
export const BASE_SPEED = 2.7;
export const BOOST_SPEED = 4.3;
export const MAX_HP = 3;
export const INVULN_MS = 1300;

export type StageInfo = {
  name: string;
  hint: string;
  fact: string;
  top: string;
  bottom: string;
  tint: string;
};

/** 여정을 네 구간으로 나눈다. 구간이 바뀔 때마다 생명 상식 한 줄을 보여 준다. */
export const STAGES: StageInfo[] = [
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

export const ENDING_FACT =
  "난자는 정자 하나가 들어오는 순간 껍질을 단단하게 바꿔 다른 정자를 막아요. 그렇게 딱 한 번, ‘나’라는 사람이 시작됩니다.";

export const FAMILY_QUESTION =
  "가족과 이야기해 보세요 — 내가 태어나던 날, 우리 집은 어떤 분위기였나요?";

export function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

export function progressAt(distance: number) {
  return clamp(distance / TOTAL_DISTANCE, 0, 1);
}

export function stageIndexAt(progress: number) {
  return clamp(Math.floor(progress * STAGES.length), 0, STAGES.length - 1);
}

/** 통로의 중심선. 월드 좌표로 계산해 스크롤해도 이어져 보이게 한다. */
export function tunnelCenter(worldX: number) {
  return VIEW_H / 2 + 42 * Math.sin(worldX / 520) + 14 * Math.sin(worldX / 170 + 1.1);
}

/**
 * 중심선에서 위아래로 열린 폭의 절반. 마지막 구간에서 점점 좁아진다.
 * 통로가 화면 밖으로 벗어나면 정자가 보이지 않는 곳까지 헤엄칠 수 있으므로,
 * 중심선이 치우친 만큼 폭을 줄여 양쪽 벽이 항상 화면 안에 남게 한다.
 */
export function tunnelHalf(worldX: number) {
  const p = progressAt(worldX);
  const narrowing = 46 * Math.max(0, (p - 0.62) / 0.38);
  const half = VIEW_H / 2 - 42 - narrowing + 12 * Math.sin(worldX / 240 + 0.6);
  const center = tunnelCenter(worldX);
  const room = Math.min(center, VIEW_H - center) - 16;
  return clamp(Math.min(half, room), 70, VIEW_H / 2 - 18);
}

export type Entity =
  | { kind: "acid"; x: number; y: number; r: number; seed: number }
  | { kind: "cell"; x: number; y: number; r: number; seed: number }
  | { kind: "wall"; x: number; gapY: number; gapH: number }
  | { kind: "current"; x: number; w: number }
  | { kind: "energy"; x: number; y: number; taken: boolean };

/** 다음 장애물 묶음을 만든다. 구간마다 등장하는 종류가 다르다. */
export function spawnAt(worldX: number, rand: () => number): { entities: Entity[]; gap: number } {
  const p = progressAt(worldX);
  const stage = stageIndexAt(p);
  const center = tunnelCenter(worldX);
  const half = tunnelHalf(worldX);
  const entities: Entity[] = [];
  let gap = 330 - 70 * p;

  if (stage === 0) {
    const count = rand() < 0.35 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      entities.push({
        kind: "acid",
        x: worldX + i * 70,
        y: center + (rand() * 2 - 1) * (half - 40),
        r: 15 + rand() * 7,
        seed: rand() * Math.PI * 2,
      });
    }
  } else if (stage === 1) {
    const gapH = 168 - 34 * (p - 0.25) * 4;
    entities.push({
      kind: "wall",
      x: worldX,
      gapY: center + (rand() * 2 - 1) * (half - gapH / 2 - 10),
      gapH,
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
    const roll = rand();
    if (roll < 0.42) {
      entities.push({ kind: "current", x: worldX, w: 210 + rand() * 90 });
      gap = 360;
    } else if (roll < 0.78) {
      const gapH = 128;
      entities.push({
        kind: "wall",
        x: worldX,
        gapY: center + (rand() * 2 - 1) * Math.max(0, half - gapH / 2 - 8),
        gapH,
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

  return { entities, gap };
}

export type Record = { seconds: number; energy: number; hp: number };

const RECORD_KEY = "sperm-journey-best-v1";

export function loadRecord(): Record | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RECORD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record;
    if (typeof parsed?.seconds !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRecord(record: Record): Record {
  const best = loadRecord();
  const better =
    !best ||
    record.energy > best.energy ||
    (record.energy === best.energy && record.seconds < best.seconds);
  const next = better ? record : best;
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(next));
  } catch {
    // 저장이 막혀 있어도 게임 진행에는 지장이 없다.
  }
  return next;
}

export function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return m > 0 ? `${m}분 ${s.toFixed(1)}초` : `${s.toFixed(1)}초`;
}
