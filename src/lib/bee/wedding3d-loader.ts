// 3D 번들은 본편에 섞지 않고 혼인비행에 들어설 때 <script> 로 따로 끌어온다.
import type { Wedding3DHandle, Wedding3DOptions } from "./wedding3d";

type Mount = (o: Wedding3DOptions) => Promise<Wedding3DHandle>;

declare global {
  interface Window {
    __beeWedding3D?: { mountWedding3D: Mount };
  }
}

const pending = new Map<string, Promise<Mount>>();

export function loadWedding3D(baseUrl: string): Promise<Mount> {
  const src = `${baseUrl}wedding3d.js`;
  const hit = pending.get(src);
  if (hit) return hit;

  const p = new Promise<Mount>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => {
      const api = window.__beeWedding3D;
      if (api) resolve(api.mountWedding3D);
      else reject(new Error("wedding3d.js 가 __beeWedding3D 를 노출하지 않았다"));
    };
    el.onerror = () => reject(new Error(`${src} 를 불러오지 못했다`));
    document.head.appendChild(el);
  });
  // 실패한 Promise 를 캐시에 두면 네트워크가 돌아와도 영영 재시도하지 못한다.
  p.catch(() => pending.delete(src));
  pending.set(src, p);
  return p;
}
