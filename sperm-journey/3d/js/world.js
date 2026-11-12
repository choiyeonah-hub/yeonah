/**
 * 3D 월드의 뼈대.
 *
 * 2D판은 화면 좌표(y 한 축)로 통로를 그렸지만, 3D판의 좌표계는 다르다.
 *   s      : 출발점에서 나아간 거리. 통로 중심선을 따라 흐른다.
 *   (u, v) : 중심선과 직각인 단면 위의 위치. 통로 반지름 안에 있어야 한다.
 * 장애물은 단면 위 극좌표(angle, radial)로 둔다. 점액 고리의 구멍도 같은 극좌표라
 * 고리를 angle만큼 돌리면 구멍이 바로 그 자리에 온다.
 */
import * as THREE from "three";

export const TOTAL = 1400; // 전체 거리(월드 단위)
export const BASE_SPEED = 0.52; // 프레임당 전진 거리(60fps 기준 약 45초)
export const BOOST_SPEED = 0.85;
export const PLAYER_R = 1.15;
export const MAX_HP = 3;
export const INVULN_MS = 1300;

/** 통로 중심선. 2D판의 구불거림을 3차원으로 옮겼다. */
export function centerAt(s, out = new THREE.Vector3()) {
  return out.set(16 * Math.sin(s / 96), 9 * Math.sin(s / 61 + 1.1), s);
}

/** 중심선의 진행 방향. 중심선 식을 s로 미분한 값이다. */
export function tangentAt(s, out = new THREE.Vector3()) {
  return out.set((16 / 96) * Math.cos(s / 96), (9 / 61) * Math.cos(s / 61 + 1.1), 1).normalize();
}

/** 통로 반지름. 마지막 구간(나팔관)에서 좁아진다. */
export function radiusAt(s) {
  const p = Math.min(1, Math.max(0, s / TOTAL));
  const narrowing = 4.2 * Math.max(0, (p - 0.62) / 0.38);
  return 13.2 - narrowing + 1.1 * Math.sin(s / 37);
}

const UP = new THREE.Vector3(0, 1, 0);

/** 단면의 기준 축. right는 진행 방향과 월드 위쪽의 외적이다. */
export function frameAt(s, right = new THREE.Vector3(), up = new THREE.Vector3()) {
  const tangent = tangentAt(s);
  right.crossVectors(tangent, UP).normalize();
  up.crossVectors(right, tangent).normalize();
  return { tangent, right, up };
}

/** (s, u, v) -> 월드 좌표 */
export function toWorld(s, u, v, out = new THREE.Vector3()) {
  const { right, up } = frameAt(s);
  centerAt(s, out);
  return out.addScaledVector(right, u).addScaledVector(up, v);
}

export function stageIndexAt(s, stageCount) {
  const p = Math.min(0.999, Math.max(0, s / TOTAL));
  return Math.floor(p * stageCount);
}

/**
 * 한 판에 쓸 장애물을 처음에 전부 만든다. 거리가 1400뿐이라 스트리밍이 필요 없고,
 * 목록 하나가 곧 그 판의 전부라 디버깅도 쉽다.
 */
export function buildCourse(stageCount, rand = Math.random) {
  const items = [];
  let s = 90; // 출발 직후에는 아무것도 두지 않는다

  while (s < TOTAL - 70) {
    const stage = stageIndexAt(s, stageCount);
    const R = radiusAt(s);
    let gap = 62;

    if (stage === 0) {
      const count = rand() < 0.35 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        items.push(drop("acid", s + i * 13, rand, R, 2.1 + rand() * 0.9));
      }
    } else if (stage === 1) {
      items.push({ kind: "ring", s, angle: rand() * Math.PI * 2 });
      if (rand() < 0.4) items.push(drop("acid", s + 28, rand, R, 2.1));
      gap = 58;
    } else if (stage === 2) {
      items.push(drop("cell", s, rand, R, 3.2));
      if (rand() < 0.45) items.push(drop("acid", s + 30, rand, R, 2.0));
      gap = 64;
    } else {
      const roll = rand();
      if (roll < 0.42) {
        items.push({ kind: "current", s, len: 40 + rand() * 18 });
        gap = 70;
      } else if (roll < 0.78) {
        items.push({ kind: "ring", s, angle: rand() * Math.PI * 2 });
        gap = 58;
      } else {
        items.push(drop("cell", s, rand, R, 3.0));
        gap = 62;
      }
    }

    if (rand() < 0.55) items.push(drop("energy", s + gap * 0.55, rand, R, 1.1));
    s += gap;
  }

  return items;
}

function drop(kind, s, rand, R, r) {
  const angle = rand() * Math.PI * 2;
  const radial = (0.15 + rand() * 0.6) * R;
  return { kind, s, angle, radial, r, taken: false };
}

/** 극좌표(angle, radial)를 단면 위 (u, v)로 바꾼다. */
export function polar(angle, radial) {
  return { u: Math.cos(angle) * radial, v: Math.sin(angle) * radial };
}

/**
 * 통로 벽 메시. 링을 이어 붙여 만들고 안쪽에서 보이도록 뒤집는다.
 * 구간마다 색이 달라지도록 꼭짓점 색을 함께 굽는다.
 */
export function buildTunnelMesh(stageColors, { step = 5, radial = 26 } = {}) {
  const rings = Math.ceil(TOTAL / step) + 1;
  const positions = new Float32Array(rings * radial * 3);
  const normals = new Float32Array(rings * radial * 3);
  const colors = new Float32Array(rings * radial * 3);
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const center = new THREE.Vector3();
  const point = new THREE.Vector3();
  const color = new THREE.Color();
  const nextColor = new THREE.Color();

  for (let i = 0; i < rings; i += 1) {
    const s = i * step;
    frameAt(s, right, up);
    centerAt(s, center);
    const R = radiusAt(s);

    // 구간 경계에서 색이 뚝 끊기지 않도록 이웃 구간 색과 섞는다.
    const t = Math.min(0.999, s / TOTAL) * stageColors.length;
    const stage = Math.floor(t);
    color.set(stageColors[stage]);
    nextColor.set(stageColors[Math.min(stageColors.length - 1, stage + 1)]);
    color.lerp(nextColor, Math.max(0, t - stage - 0.72) / 0.28);

    // 일정 간격의 어두운 띠(근육 고리)가 있어야 앞으로 나아가는 게 눈에 보인다.
    const band = 0.74 + 0.26 * (0.5 + 0.5 * Math.cos((s / 26) * Math.PI * 2));
    for (let j = 0; j < radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      const wobble = 1 + 0.11 * Math.sin(a * 6 + s / 19);
      const fold = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(a * 6 + s / 19));
      point
        .copy(center)
        .addScaledVector(right, Math.cos(a) * R * wobble)
        .addScaledVector(up, Math.sin(a) * R * wobble);
      const k = (i * radial + j) * 3;
      positions[k] = point.x;
      positions[k + 1] = point.y;
      positions[k + 2] = point.z;
      // 법선은 안쪽을 향한다.
      normals[k] = -Math.cos(a) * right.x - Math.sin(a) * up.x;
      normals[k + 1] = -Math.cos(a) * right.y - Math.sin(a) * up.y;
      normals[k + 2] = -Math.cos(a) * right.z - Math.sin(a) * up.z;
      const shade = band * fold * 1.45;
      colors[k] = color.r * shade;
      colors[k + 1] = color.g * shade;
      colors[k + 2] = color.b * shade;
    }
  }

  const indices = [];
  for (let i = 0; i < rings - 1; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    roughness: 0.85,
    metalness: 0.0,
  });
  return new THREE.Mesh(geometry, material);
}
