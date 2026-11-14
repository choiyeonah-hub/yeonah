// 혼인비행 3D 시네마틱. 본편 번들에 섞이지 않도록 별도 IIFE(wedding3d.js)로만 빌드된다.
import {
  ACESFilmicToneMapping,
  AnimationMixer,
  BackSide,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export type Wedding3DHandle = {
  resize(w: number, h: number): void;
  dispose(): void;
};

export type Wedding3DOptions = {
  canvas: HTMLCanvasElement;
  glbUrl: string;
  /** 지역의 하늘·능선·잔디 색을 그대로 받아 2D 와 색감을 맞춘다 */
  sky: [string, string];
  hills: [string, string];
  grass: string;
};

const DRONES = 9;
const HEARTS = 44;
const HEART_LIFE = 1.7;

/** 지역 색은 rgba() 문자열일 수 있다. three 는 알파를 버리며 경고를 내므로 미리 걷어낸다. */
function opaque(css: string): Color {
  const m = css.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  return m ? new Color(`rgb(${m[1]}, ${m[2]}, ${m[3]})`) : new Color(css);
}

type Drone = {
  obj: Object3D;
  angle: number;
  radius: number;
  phase: number;
};

type Heart = { mesh: Mesh<SphereGeometry, MeshBasicMaterial>; life: number };

function skyDome(top: Color, bottom: Color) {
  const mat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: top }, bottom: { value: bottom } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = clamp(vP.y / 300.0 * 0.5 + 0.5, 0.0, 1.0);
      gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0); }`,
  });
  return new Mesh(new SphereGeometry(300, 32, 20), mat);
}

/** 원통의 윗 테두리만 들쭉날쭉하게 깎아 저폴리 능선 띠를 만든다. */
function ridge(radius: number, base: number, peak: number, color: Color, seed: number) {
  const geo = new CylinderGeometry(radius, radius, 1, 48, 1, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const top = pos.getY(i) > 0;
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const n = 0.5 + 0.5 * Math.sin(a * 5 + seed) * Math.cos(a * 3 - seed * 1.7);
    pos.setY(i, top ? base + (peak - base) * (0.25 + 0.75 * n) : base - 40);
  }
  geo.computeVertexNormals();
  const mat = new MeshStandardMaterial({ color, roughness: 1, flatShading: true, side: DoubleSide });
  return new Mesh(geo, mat);
}

function crown(gold: MeshStandardMaterial) {
  const g = new Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = new Mesh(new ConeGeometry(0.1, 0.34, 4), gold);
    spike.position.set(Math.cos(a) * 0.26, 0.1, Math.sin(a) * 0.26);
    g.add(spike);
  }
  const band = new Mesh(new TorusGeometry(0.27, 0.05, 6, 16), gold);
  band.rotation.x = Math.PI / 2;
  g.add(band);
  g.position.set(0.72, 0.52, 0);
  return g;
}

function disposeScene(scene: Scene) {
  const mats = new Set<Material>();
  scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mats.add(mat);
  });
  mats.forEach((mat) => {
    for (const v of Object.values(mat)) {
      if (v && (v as { isTexture?: boolean }).isTexture) (v as { dispose(): void }).dispose();
    }
    mat.dispose();
  });
}

export async function mountWedding3D(o: Wedding3DOptions): Promise<Wedding3DHandle> {
  const gltf: GLTF = await new GLTFLoader().loadAsync(o.glbUrl);

  const renderer = new WebGLRenderer({ canvas: o.canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;

  const pmrem = new PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();

  const scene = new Scene();
  const camera = new PerspectiveCamera(48, 1, 0.1, 600);
  scene.environment = envMap;

  const skyTop = opaque(o.sky[0]);
  const skyBottom = opaque(o.sky[1]);
  scene.add(skyDome(skyTop, skyBottom));
  // 안개가 지평선에서 하늘 아랫색과 이어져야 능선이 허공에 뜨지 않는다.
  scene.fog = new Fog(skyBottom, 40, 220);

  scene.add(new HemisphereLight(0xdceeff, 0x6a8a4a, 0.45));
  const key = new DirectionalLight(0xfff0cf, 1.5);
  key.position.set(8, 14, 6);
  scene.add(key);
  const rim = new DirectionalLight(0x9fd0ff, 0.7);
  rim.position.set(-9, 3, -8);
  scene.add(rim);

  const sun = new Mesh(new SphereGeometry(9, 24, 16), new MeshBasicMaterial({ color: 0xfff4d2, fog: false }));
  sun.position.set(40, 44, -150);
  scene.add(sun);
  for (let i = 0; i < 7; i++) {
    const ray = new Mesh(
      new PlaneGeometry(4 + i * 2, 220),
      new MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.045, depthWrite: false, fog: false })
    );
    ray.position.set(30 - i * 6, 20, -120 + i * 4);
    ray.rotation.z = 0.3 + i * 0.06;
    scene.add(ray);
  }

  const ground = new Mesh(
    new PlaneGeometry(900, 900, 40, 40),
    new MeshStandardMaterial({ color: opaque(o.grass), roughness: 1, flatShading: true })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -55;
  const gp = ground.geometry.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    gp.setZ(i, Math.sin(i * 1.7) * 9 + Math.cos(i * 0.41) * 7 + Math.sin(i * 0.13) * 11);
  }
  gp.needsUpdate = true;
  ground.geometry.computeVertexNormals();
  scene.add(ground);

  scene.add(ridge(190, -55, 4, opaque(o.hills[0]), 1.3));
  scene.add(ridge(135, -55, -22, opaque(o.hills[1]), 4.1));

  const cloudMat = new MeshStandardMaterial({
    color: 0xdfeaf2, transparent: true, opacity: 0.62, roughness: 1,
  });
  // 가까운 구름은 화면을 가리므로 중심에서 반경 70 바깥에만 둔다.
  for (let i = 0; i < 40; i++) {
    const c = new Mesh(new SphereGeometry(3 + Math.random() * 5, 7, 4), cloudMat);
    c.scale.set(2.8, 0.42, 1.7);
    const a = Math.random() * Math.PI * 2;
    const r = 70 + Math.random() * 150;
    c.position.set(Math.cos(a) * r, -26 + Math.random() * 60, Math.sin(a) * r);
    scene.add(c);
  }

  const gold = new MeshStandardMaterial({
    color: 0xffd75e, metalness: 0.9, roughness: 0.22, envMap, emissive: 0x3a2a00,
  });
  const mixers: AnimationMixer[] = [];

  const makeBee = (scale: number, isQueen: boolean) => {
    const g = new Group();
    const model = cloneSkinned(gltf.scene);
    model.traverse((n) => {
      const m = n as Mesh;
      if (!m.isMesh) return;
      const mat = m.material as MeshStandardMaterial;
      if (!mat.color) return;
      // 클론이 원본과 재질을 공유하면 여왕의 색 보정이 수벌에게도 번진다.
      m.material = mat.clone();
      const own = m.material as MeshStandardMaterial;
      if (isQueen && own.color.g > 0.4 && own.color.b < 0.4) own.color.multiplyScalar(0.9).offsetHSL(-0.02, 0.1, 0);
      own.envMapIntensity = 0.55;
    });
    model.rotation.y = Math.PI / 2;
    g.add(model);
    if (isQueen) g.add(crown(gold));

    const mixer = new AnimationMixer(model);
    if (gltf.animations.length) {
      const act = mixer.clipAction(gltf.animations[0]);
      act.timeScale = isQueen ? 2.4 : 3.2;
      act.play();
    }
    mixers.push(mixer);
    g.scale.setScalar(scale * 0.62);
    return { g };
  };

  const queen = makeBee(1.5, true).g;
  scene.add(queen);

  const drones: Drone[] = [];
  for (let i = 0; i < DRONES; i++) {
    const { g } = makeBee(0.95, false);
    drones.push({
      obj: g,
      angle: (i / DRONES) * Math.PI * 2,
      radius: 6.5 + (i % 3) * 2.6,
      phase: Math.random() * Math.PI * 2,
    });
    scene.add(g);
  }

  const hearts: Heart[] = [];
  for (let i = 0; i < HEARTS; i++) {
    const mesh = new Mesh(
      new SphereGeometry(0.17, 6, 5),
      new MeshBasicMaterial({ color: 0xff9ec7, transparent: true })
    );
    mesh.visible = false;
    hearts.push({ mesh, life: 0 });
    scene.add(mesh);
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new Vector2(1, 1), 0.16, 0.5, 0.96));
  composer.addPass(new OutputPass());

  let sized = false;
  const resize = (w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    sized = true;
  };
  resize(o.canvas.clientWidth, o.canvas.clientHeight);

  const tmp = new Vector3();
  const prev = new Vector3();
  const vel = new Vector3();
  let heartTimer = 0;
  let last = performance.now();
  let t = 0;
  let raf = 0;
  let alive = true;

  const frame = (now: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    if (!sized) return;
    for (const m of mixers) m.update(dt);

    queen.position.set(Math.sin(t * 0.38) * 1.8, Math.sin(t * 0.66) * 0.9, Math.cos(t * 0.38) * 1.8);
    queen.rotation.y = -t * 0.38 + Math.PI / 2;

    for (const d of drones) {
      const spin = t * 1.05 + d.angle;
      tmp.set(
        queen.position.x + Math.cos(spin) * d.radius,
        queen.position.y + Math.sin(spin * 2 + d.phase) * d.radius * 0.45,
        queen.position.z + Math.sin(spin) * d.radius
      );
      prev.copy(d.obj.position);
      d.obj.position.lerp(tmp, 0.17);
      vel.copy(d.obj.position).sub(prev);
      if (vel.lengthSq() > 1e-6) {
        d.obj.lookAt(tmp.copy(d.obj.position).add(vel));
        d.obj.rotateY(-Math.PI / 2);
        d.obj.rotation.z += Math.max(-0.5, Math.min(0.5, -vel.x * 0.6));
      }
    }

    heartTimer -= dt;
    if (heartTimer <= 0) {
      heartTimer = 0.09;
      const h = hearts.find((x) => !x.mesh.visible);
      if (h) {
        h.mesh.position.copy(drones[(Math.random() * drones.length) | 0].obj.position);
        h.mesh.visible = true;
        h.life = HEART_LIFE;
      }
    }
    for (const h of hearts) {
      if (!h.mesh.visible) continue;
      h.life -= dt;
      h.mesh.position.y += dt * 1.7;
      h.mesh.material.opacity = Math.max(0, h.life / HEART_LIFE);
      h.mesh.scale.setScalar(1 + (HEART_LIFE - h.life) * 0.5);
      if (h.life <= 0) h.mesh.visible = false;
    }

    const camR = 12 + Math.sin(t * 0.16) * 2.6;
    camera.position.set(Math.cos(t * 0.15) * camR, 3 + Math.sin(t * 0.23) * 3, Math.sin(t * 0.15) * camR);
    camera.lookAt(queen.position);
    camera.fov = 48 + Math.sin(t * 0.11) * 2.5;
    camera.updateProjectionMatrix();

    composer.render();
  };
  raf = requestAnimationFrame(frame);

  return {
    resize,
    dispose() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      mixers.forEach((m) => m.stopAllAction());
      disposeScene(scene);
      composer.dispose();
      envMap.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
