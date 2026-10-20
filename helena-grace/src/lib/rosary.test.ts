import { advance, back, isFinished, suggestedMystery, totalCounted } from "./rosary";

describe("rosary counter", () => {
  it("counts 10 beads then moves to the next decade", () => {
    let p = { decadeIndex: 0, beadIndex: 0 };
    for (let i = 0; i < 10; i++) p = advance(p);
    expect(p).toEqual({ decadeIndex: 0, beadIndex: 10 });
    p = advance(p);
    expect(p).toEqual({ decadeIndex: 1, beadIndex: 0 });
  });
  it("goes back across a decade boundary and stops at the start", () => {
    expect(back({ decadeIndex: 1, beadIndex: 0 })).toEqual({ decadeIndex: 0, beadIndex: 10 });
    expect(back({ decadeIndex: 0, beadIndex: 0 })).toEqual({ decadeIndex: 0, beadIndex: 0 });
  });
  it("finishes after 5 decades and never overflows", () => {
    let p = { decadeIndex: 0, beadIndex: 0 };
    for (let i = 0; i < 100; i++) p = advance(p);
    expect(isFinished(p)).toBe(true);
    expect(totalCounted(p)).toBe(50);
  });
  it("only suggests mysteries", () => {
    expect(suggestedMystery(4)).toBe("luminous");
    expect(suggestedMystery(0)).toBe("glorious");
  });
});
