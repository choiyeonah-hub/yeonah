import { deltaE, rgbToHex } from "./color";

// 옷 사진에서 대표 색을 뽑는다. 브라우저에서만 동작하며 AI를 쓰지 않는다.
// (옷 색은 사진에 그대로 찍혀 있으므로 모델을 부를 이유가 없다.)

type Bucket = { r: number; g: number; b: number; count: number };

export type ExtractResult = {
  /** 화면에 채워 넣을 대표 색 */
  colors: string[];
  /** localStorage에 넣을 작은 썸네일 */
  thumbnail: string;
};

export async function extractItemColors(file: File): Promise<ExtractResult> {
  const bitmap = await createImageBitmap(file);

  // 색 추출용 캔버스(작게) — 픽셀을 다 볼 필요가 없다.
  const sampleSide = 160;
  const scale = Math.min(1, sampleSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("이미지를 처리할 수 없는 브라우저입니다.");
  context.drawImage(bitmap, 0, 0, width, height);

  // 가장자리는 배경(바닥·벽·옷걸이)일 확률이 높아 가운데 60%만 본다.
  const x0 = Math.floor(width * 0.2);
  const y0 = Math.floor(height * 0.2);
  const w = Math.max(1, Math.floor(width * 0.6));
  const h = Math.max(1, Math.floor(height * 0.6));
  const { data } = context.getImageData(x0, y0, w, h);

  const buckets = new Map<string, Bucket>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // 순백·순흑에 가까운 픽셀은 배경/그림자일 확률이 높아 뺀다.
    // 단, 무채색 옷도 많으므로 완전히 버리지 않고 회색 구간은 남긴다.
    if (max > 248 && min > 240) continue;
    if (max < 14) continue;

    // 4비트로 양자화해 비슷한 색끼리 묶는다.
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const ranked = [...buckets.values()]
    .filter((bucket) => bucket.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((bucket) =>
      rgbToHex({ r: bucket.r / bucket.count, g: bucket.g / bucket.count, b: bucket.b / bucket.count }),
    );

  // 비슷한 색은 하나로 합친다.
  const colors: string[] = [];
  for (const hex of ranked) {
    if (colors.every((picked) => deltaE(picked, hex) > 14)) colors.push(hex);
    if (colors.length === 3) break;
  }

  return {
    colors: colors.length > 0 ? colors : ["#9AA0A6"],
    thumbnail: await makeThumbnail(bitmap),
  };
}

async function makeThumbnail(bitmap: ImageBitmap, maxSide = 200): Promise<string> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}
