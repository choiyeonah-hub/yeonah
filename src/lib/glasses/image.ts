"use client";

/**
 * 업로드 전에 브라우저에서 이미지를 줄인다.
 *
 * 두 가지 이유가 있다.
 *  1) 원본 사진을 그대로 서버로 보내지 않는다 (전송하는 개인정보를 최소화).
 *  2) 서버리스 함수의 요청 본문 크기 제한(보통 4.5MB)에 걸리지 않게 한다.
 */
export async function fileToScaledDataUrl(
  file: File,
  maxSide = 900,
  quality = 0.85
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 올릴 수 있습니다.");
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("이미지를 읽지 못했습니다. 다른 사진으로 시도해주세요.");
  });

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("브라우저에서 이미지를 처리하지 못했습니다.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", quality);
}
