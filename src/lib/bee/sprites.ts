// 도트로 찍은 스프라이트. 한 글자가 화소 하나다.
// 캔버스의 곡선은 안티에일리어싱을 피할 수 없어서, 픽셀아트는 사각형으로만 찍는다.

export type Sprite = { w: number; h: number; rows: string[] };

function sprite(rows: string[]): Sprite {
  const w = rows[0].length;
  for (const r of rows) {
    if (r.length !== w) throw new Error(`스프라이트 행 길이가 다르다: ${r.length} ≠ ${w}`);
  }
  return { w, h: rows.length, rows };
}

/**
 * 일벌 — 오른쪽을 본다.
 * w 날개 · Y 배 · d 줄무늬 · f 가슴털 · H 머리 · e 눈 · a 더듬이 · L 다리
 */
export const BEE = sprite([
  "......wwww......",
  ".....wwwwww.....",
  "...www....w..a..",
  "..YYYYYY....aa..",
  ".YdYdYYYfHHHa...",
  ".YdYdYYYfHHHee..",
  ".YdYdYYYfHHHee..",
  ".YYYYYYYfHHH....",
  "..LL..LL..L.....",
  "..L....L...L....",
]);

/** 여왕벌 — 배가 길고 왕관을 쓴다. c 왕관 · j 보석 */
export const QUEEN = sprite([
  "........cc.c.c....",
  "........cccccc....",
  ".....wwww.cjc.....",
  "....wwwwww....a...",
  "..www....w...aa...",
  ".YYYYYYYY.....a...",
  "YdYdYdYYYfHHHa....",
  "YdYdYdYYYfHHHee...",
  "YdYdYdYYYfHHHee...",
  ".YYYYYYYYfHHH.....",
  "..LL..LL..L.......",
  "..L....L...L......",
]);

/** 수벌 — 눈이 크고 배가 뭉툭하다 */
export const DRONE = sprite([
  "......wwww......",
  ".....wwwwww.....",
  "...www....w.....",
  "..YYYYYY..EEE...",
  ".YdYdYYYfEEEEE..",
  ".YdYdYYYfEEEEE..",
  ".YdYdYYYfEEEEE..",
  ".YYYYYYYf.EEE...",
  "..LL..LL..L.....",
  "..L....L...L....",
]);

/** 말벌 — 길쭉하고 침이 보인다. s 침 */
export const HORNET = sprite([
  ".......wwwww......",
  "......wwwwwww.....",
  "....www.....w..a..",
  "s.YYYYYYYY...aa...",
  "sYdYdYdYYfHHHa....",
  ".YdYdYdYYfHHHee...",
  ".YdYdYdYYfHHHee...",
  "s.YYYYYYYYfHHH....",
  "..LL..LL..L.......",
  "..L....L...L......",
]);

/** 애벌레 — 방 안에서 꿈틀거린다. L 몸 · m 마디 · E 눈 */
export const LARVA = sprite([
  "..LLLLLL..",
  ".LmLLmLLL.",
  "LLLLLLLLLL",
  "LLEmLLmELL",
  ".LLLLLLLL.",
  "..LLLLLL..",
]);

/** 꽃 한 송이 — 지역마다 색만 갈아 끼운다. p 꽃잎 · q 꽃잎2 · o 꽃술 */
export const BLOSSOM = sprite([
  ".pp.pp.",
  "pppqppp",
  "pqoooqp",
  "pppqppp",
  ".pp.pp.",
]);

export const BLOSSOM_SMALL = sprite([
  ".p.p.",
  "pqoqp",
  ".p.p.",
]);

/** 아까시나무처럼 아래로 늘어지는 꽃 */
export const BLOSSOM_DROOP = sprite([
  "..ppp..",
  ".ppqpp.",
  "ppoooop",
  ".ppqpp.",
  "..ppp..",
  "...q...",
]);
