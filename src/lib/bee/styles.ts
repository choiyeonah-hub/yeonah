// 게임 화면의 모든 스타일. 단일 HTML 과 Next 페이지가 같은 것을 쓴다.
export const STYLES = String.raw`
  /* 벌통 안에서 본 세계 — 밀랍, 카우리 나무, 마누카 꽃잎의 색으로만 짠다. */
  :root {
    --ground: #14100a;
    --panel: #1e1810;
    --edge: #3a2c1a;
    --wax: #f3c969;
    --wax-dim: #b8914a;
    --wood: #8a5a32;
    --blossom: #ffe4ea;
    --ink: #f6ecd8;
    --muted: #a08c6e;
    --display: "Gowun Batang", "Nanum Myeongjo", Georgia, serif;
    --body: "IBM Plex Sans KR", system-ui, -apple-system, sans-serif;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--ground);
    /* 아주 옅은 벌집 결 */
    background-image:
      repeating-linear-gradient(60deg, rgba(243,201,105,.028) 0 1px, transparent 1px 26px),
      repeating-linear-gradient(-60deg, rgba(243,201,105,.028) 0 1px, transparent 1px 26px);
    color: var(--ink);
    font-family: var(--body);
    font-size: 14px;
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
  }

  #app {
    max-width: 780px;
    margin: 0 auto;
    padding: 16px 14px 28px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .bar { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .bar h1 {
    margin: 0;
    font-family: var(--display);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: .01em;
    color: var(--wax);
  }
  .bar h1 span { font-size: 13px; font-weight: 400; color: var(--muted); }

  .hbtns { display: flex; gap: 6px; }
  .ghost {
    font: inherit; font-size: 12px;
    color: var(--muted);
    background: transparent;
    border: 1px solid var(--edge);
    border-radius: 999px;
    padding: 4px 12px;
    cursor: pointer;
  }
  .ghost:hover, .ghost:focus-visible { color: var(--wax); border-color: var(--wax-dim); }

  /* 표본 상자 라벨처럼 위아래 이중선 */
  .panel {
    border-top: 1px solid var(--edge);
    border-bottom: 1px solid var(--edge);
    padding: 9px 0;
    display: flex; flex-direction: column; gap: 7px;
  }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
  .stage { min-width: 0; }
  .title { margin: 0; font-size: 14px; }
  .title b { font-family: var(--display); font-size: 16px; color: var(--wax); }
  .title i { font-style: normal; font-size: 11px; color: var(--wax-dim); margin-left: 5px; }
  .title em {
    font-style: normal; font-size: 10px; color: var(--muted);
    margin-left: 8px; letter-spacing: .12em;
  }
  .task { margin: 1px 0 0; font-size: 12px; color: var(--muted); }

  .prog { display: flex; align-items: center; gap: 8px; }
  .track {
    display: block; width: 132px; height: 5px;
    background: #2a2114; border-radius: 999px; overflow: hidden;
  }
  .track.sm { width: 62px; height: 4px; }
  .track > * , #progBar { display: block; height: 100%; width: 0; border-radius: 999px; transition: width .18s ease; }
  #progBar { background: var(--wax); }
  #progText { font-size: 12px; color: var(--wax-dim); font-variant-numeric: tabular-nums; }

  .meters { gap: 12px; }
  .m { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }
  .carry { font-size: 11px; color: var(--wax-dim); letter-spacing: .02em; }

  .frame {
    position: relative;
    border: 1px solid var(--edge);
    border-radius: 3px;
    background: #000;
    overflow: hidden;
    height: 320px;
    box-shadow: 0 18px 40px rgba(0,0,0,.5);
  }
  canvas { display: block; width: 100%; height: 100%; }

  .zone, .msg {
    position: absolute; left: 50%; transform: translateX(-50%);
    opacity: 0; transition: opacity .2s; pointer-events: none;
    background: rgba(8,5,2,.72); border-radius: 999px; white-space: nowrap;
  }
  .zone { top: 10px; padding: 3px 14px; font-size: 10px; letter-spacing: .22em; color: var(--wax-dim); }
  .msg { bottom: 10px; padding: 5px 16px; font-size: 12px; color: var(--ink); max-width: 92%; white-space: normal; text-align: center; }
  .zone.show, .msg.show { opacity: 1; }

  .overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 9px; padding: 20px; text-align: center;
    background: rgba(6,4,2,.9);
    border: 0; color: inherit; font: inherit;
    overflow-y: auto; cursor: pointer;
  }
  .overlay.bottom {
    justify-content: flex-end; padding-bottom: 22px;
    background: linear-gradient(to top, rgba(6,4,2,.95) 40%, rgba(6,4,2,.35) 75%, transparent);
  }
  .overlay.hidden { display: none; }
  /* 타이틀 화면과 결과 카드는 게임 창이 아니라 화면 전체를 덮는다 */
  .overlay.sheet {
    position: fixed; inset: 0; z-index: 30;
    background: rgba(8,5,2,.96);
    padding: 24px 18px;
  }
  .overlay.sheet > * { flex: 0 0 auto; }

  .big {
    margin: 0; font-family: var(--display); font-weight: 700;
    font-size: 21px; color: var(--wax); text-wrap: balance;
  }
  .big.sm { font-size: 17px; }
  .big span { font-size: 13px; font-weight: 400; color: var(--muted); }
  .body { margin: 0; max-width: 44ch; font-size: 12.5px; line-height: 1.75; color: #ddd0b8; }
  .body b { color: var(--wax); font-weight: 600; }
  .body .next { color: var(--blossom); font-weight: 500; }
  .kicker { font-size: 10px; letter-spacing: .3em; color: var(--wax-dim); }
  .hint { margin: 2px 0 0; font-size: 10.5px; color: #6f6047; }

  .cta {
    margin-top: 4px; font: inherit; font-weight: 600; font-size: 14px;
    color: #1a1206; background: var(--wax);
    border: 0; border-radius: 999px; padding: 8px 26px; cursor: pointer;
  }
  .cta:hover, .cta:focus-visible { background: #ffdc8c; }

  .pad { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding-top: 2px; }
  .dpad { display: grid; grid-template-columns: repeat(3, 46px); grid-template-rows: repeat(2, 44px); gap: 5px; }
  .k {
    font: inherit; font-weight: 600; color: var(--ink);
    background: var(--panel); border: 1px solid var(--edge); border-radius: 9px;
    cursor: pointer; touch-action: none; user-select: none;
    display: flex; align-items: center; justify-content: center;
  }
  .k:active { background: var(--wax); color: #1a1206; border-color: var(--wax); }
  .up { grid-column: 2; } .left { grid-column: 1; grid-row: 2; }
  .down { grid-column: 2; grid-row: 2; } .right { grid-column: 3; grid-row: 2; }
  .boost { width: 88px; height: 54px; font-size: 12px; }

  /* 일령 순서 자체가 정보라서 번호를 붙인다 */
  .steps {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px;
    margin: 2px 0 0; padding: 0; list-style: none;
    font-size: 11px; color: #6f6047; counter-reset: s;
  }
  .steps li::before {
    counter-increment: s; content: counter(s) ". ";
    font-variant-numeric: tabular-nums; color: var(--edge);
  }
  .steps li.done { color: var(--wax-dim); text-decoration: line-through; }
  .steps li.now { color: var(--wax); font-weight: 600; }
  .steps li.now::before { color: var(--wax-dim); }

  /* 왕국 고르기 */
  .kingdoms { display: flex; flex-direction: column; gap: 5px; width: 100%; max-width: 430px; margin-top: 2px; }
  .kingdom {
    display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 2px 10px;
    text-align: left; font: inherit; cursor: pointer;
    background: rgba(243,201,105,.07); border: 1px solid var(--edge);
    border-radius: 8px; padding: 7px 11px; color: var(--ink);
  }
  .kingdom:hover:not(:disabled), .kingdom:focus-visible { border-color: var(--wax-dim); background: rgba(243,201,105,.13); }
  .kingdom b { font-family: var(--display); font-size: 15px; color: var(--wax); }
  .kingdom i { font-style: normal; font-size: 10px; letter-spacing: .1em; color: var(--muted); }
  .kingdom em { grid-column: 1 / -1; font-style: normal; font-size: 11px; color: #a99a7e; }
  .kingdom.locked { opacity: .42; cursor: not-allowed; background: transparent; }
  .kingdom.locked b { color: var(--muted); }

  .btns { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 4px; }
  .ghosty { background: transparent; color: var(--wax); border: 1px solid var(--wax-dim); }
  .ghosty:hover, .ghosty:focus-visible { background: rgba(243,201,105,.14); }

  #cardImg {
    width: min(58%, 240px); height: auto; border-radius: 8px;
    border: 1px solid var(--edge); box-shadow: 0 10px 30px rgba(0,0,0,.5);
  }

  @media (max-width: 420px) {
    .bar h1 { font-size: 15px; }
    .ghost { padding: 4px 9px; font-size: 11px; }
    .track { width: 96px; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before { transition: none !important; animation: none !important; }
  }
`;
